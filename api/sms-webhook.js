// api/sms-webhook.js
import querystring from "querystring";

/* ========== utilidades básicas ========== */
async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function parseQuery(text = "") {
  const raw = text.trim();
  const pats = [
    /^calidad\s+del\s+aire\s+(.+)$/i,
    /^aire\s+(.+)$/i,
    /^aqi\s+(.+)$/i
  ];
  for (const p of pats) {
    const m = raw.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return raw;
}

function tryParseCoords(q = "") {
  const m = q.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return null;
}

function twiml(msg) {
  const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${esc(msg)}</Message></Response>`;
}

/* ========== llamadas a Google ========== */
async function geocode(address, apiKey, region = "mx") {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  if (region) url.searchParams.set("region", region);
  url.searchParams.set("key", apiKey);

  const r = await fetch(url.toString(), { method: "GET" });
  const j = await r.json();
  if (j.status !== "OK" || !j.results?.length) {
    const err = j.error_message || j.status || "ZERO_RESULTS";
    throw new Error(`GEOCODE_${err}`);
  }
  const best = j.results[0];
  return {
    lat: best.geometry.location.lat,
    lon: best.geometry.location.lng,
    label: best.formatted_address
  };
}

async function lookupAirQuality({ lat, lon }, apiKey) {
  const url = new URL("https://airquality.googleapis.com/v1/currentConditions:lookup");
  url.searchParams.set("key", apiKey);

  const body = {
    location: { latitude: lat, longitude: lon },
    languageCode: "es",
    extraComputations: [
      "HEALTH_RECOMMENDATIONS",
      "POLLUTANT_CONCENTRATION",
      "LOCAL_AQI",
      "DOMINANT_POLLUTANT_CONCENTRATION"
    ],
    universalAqi: true
  };

  const r = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AQ_HTTP_${r.status} ${t}`);
  }
  return await r.json();
}

/* ========== formateo de respuesta ========== */
function formatAQ(label, aq) {
  const uaqi = aq?.indexes?.find(i => i.code === "uaqi") || aq?.indexes?.[0];
  if (!uaqi) return `${label}\nNo hay datos de calidad del aire en este punto.`;

  const name = uaqi.displayName || "UAQI";
  const value = uaqi.aqiDisplay ?? uaqi.aqi ?? "?";
  const cat = uaqi.category || "—";
  const dom = uaqi.dominantPollutant || "—";
  const rec = aq?.healthRecommendations?.generalPopulation || "";

  const picks = (aq?.pollutants || []).slice(0, 3).map(p => {
    const v = p?.concentration?.value;
    const u = p?.concentration?.units || "";
    const d = (p.displayName || p.code || "").toUpperCase();
    return `${d}: ${v != null ? v : "—"} ${u}`.trim();
  });

  return [
    `${label}`,
    `${name}: ${value} (${cat})`,
    `Dominante: ${dom}`,
    picks.length ? `Principales: ${picks.join(" · ")}` : null,
    rec ? `Recomendación: ${rec}` : null
  ].filter(Boolean).join("\n");
}

/* ========== handler ========== */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Log de entrada
    const ct = req.headers["content-type"] || "";
    const raw = await readRawBody(req);
    console.log("[WEBHOOK] content-type:", ct);
    console.log("[WEBHOOK] raw body:", raw);

    const body = ct.includes("application/json")
      ? JSON.parse(raw || "{}")
      : querystring.parse(raw);

    const incoming = body.Body || body.body || "";
    console.log("[WEBHOOK] incoming Body:", incoming);

    // Clave del backend
    const key = process.env.GMP_API_KEY;
    console.log("[WEBHOOK] GMP_API_KEY present?:", Boolean(key));
    if (!key) {
      console.error("[WEBHOOK] ERROR: GMP_API_KEY missing");
      return res.status(200).setHeader("Content-Type", "text/xml")
        .end(twiml("Error: Falta GMP_API_KEY en el servidor."));
    }

    const q = parseQuery(incoming);
    const coords = tryParseCoords(q);
    let loc, label;

    if (coords) {
      console.log("[WEBHOOK] coords detectadas:", coords);
      loc = coords;
      label = `Lat: ${coords.lat.toFixed(4)}, Lon: ${coords.lon.toFixed(4)}`;
    } else {
      // Geocoding con reintentos MX
      const candidates = [
        q,
        `${q}, Gto, México`,
        `${q}, Guanajuato, México`,
        `${q}, México`
      ];
      console.log("[WEBHOOK] geocode candidates:", candidates);

      let lastErr = "";
      for (const cand of candidates) {
        try {
          const r = await geocode(cand, key, "mx");
          loc = { lat: r.lat, lon: r.lon };
          label = r.label;
          console.log("[WEBHOOK] geocode OK:", cand, "->", label, loc);
          break;
        } catch (e) {
          lastErr = e.message || String(e);
          console.error("[WEBHOOK] geocode fail:", cand, lastErr);
        }
      }
      if (!loc) {
        const msg = lastErr.includes("REQUEST_DENIED")
          ? "No pude geocodificar. Revisa que Geocoding API esté habilitada para tu clave y sin restricciones indebidas."
          : "No pude geocodificar la ubicación. Prueba: 'calidad del aire Pénjamo, Gto' o manda coordenadas 'calidad del aire 20.4314,-101.7234'.";
        return res.status(200).setHeader("Content-Type","text/xml").end(twiml(msg));
      }
    }

    // Air Quality
    const aq = await lookupAirQuality(loc, key);
    const reply = formatAQ(label, aq);
    console.log("[WEBHOOK] AQ OK -> reply length:", reply.length);
    return res.status(200).setHeader("Content-Type", "text/xml").end(twiml(reply));

  } catch (e) {
    console.error("[WEBHOOK] ERROR:", e);
    const msg = `No pude obtener la calidad del aire. ${e.message || e}`;
    return res.status(200).setHeader("Content-Type", "text/xml").end(twiml(msg));
  }
}