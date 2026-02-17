import querystring from "querystring";

async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function parseLocationFromText(text) {
  if (!text) return "";
  const t = text.trim().toLowerCase();
  // patrones aceptados: "calidad del aire X", "aire X", "aqi X", o solo "X"
  const patterns = [
    /^calidad\s+del\s+aire\s+(.+)$/i,
    /^aire\s+(.+)$/i,
    /^aqi\s+(.+)$/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return text; // si no empieza con las frases, tomamos todo como ubicación
}

async function geocodePlace(place, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", place);
  // sesgo opcional a MX porque trabajas en GTO; quítalo si quieres global
  url.searchParams.set("region", "mx");
  url.searchParams.set("key", apiKey);

  const r = await fetch(url, { method: "GET" });
  const j = await r.json();
  if (j.status !== "OK" || !j.results?.length) {
    throw new Error("No se pudo geocodificar la ubicación.");
  }
  const best = j.results[0];
  return {
    lat: best.geometry.location.lat,
    lon: best.geometry.location.lng,
    displayName: best.formatted_address
  };
}

async function lookupAirQuality({ lat, lon }, apiKey) {
  const url = new URL("https://airquality.googleapis.com/v1/currentConditions:lookup");
  url.searchParams.set("key", apiKey);

  const body = {
    location: { latitude: lat, longitude: lon },
    languageCode: "es",
    // Devolvemos extras útiles (recomendaciones, concentraciones, AQIs locales)
    extraComputations: [
      "HEALTH_RECOMMENDATIONS",
      "POLLUTANT_CONCENTRATION",
      "LOCAL_AQI",
      "DOMINANT_POLLUTANT_CONCENTRATION"
    ],
    universalAqi: true
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`AirQuality error HTTP ${r.status} ${t}`);
  }
  return await r.json();
}

function formatAQMessage(placeLabel, aq) {
  // Buscamos UAQI
  const uaqi = aq?.indexes?.find(i => i.code === "uaqi") || aq?.indexes?.[0];
  if (!uaqi) return `${placeLabel}\nNo hay datos de calidad del aire en este punto.`;

  const label = uaqi.displayName || "UAQI";
  const val = uaqi.aqiDisplay ?? uaqi.aqi ?? "?";
  const cat = uaqi.category || "—";
  const dom = uaqi.dominantPollutant || "—";

  let rec = "";
  if (aq?.healthRecommendations?.generalPopulation) {
    rec = aq.healthRecommendations.generalPopulation;
  }

  // Redondeamos principales concentraciones si vienen
  const picks = (aq?.pollutants || []).slice(0, 3).map(p => {
    const v = p?.concentration?.value;
    const u = p?.concentration?.units;
    return `${(p.displayName || p.code || "").toUpperCase()}: ${v != null ? v : "—"} ${u || ""}`;
  });

  return [
    `${placeLabel}`,
    `${label}: ${val} (${cat})`,
    `Dominante: ${dom}`,
    picks.length ? `Principales: ${picks.join(" · ")}` : null,
    rec ? `Recomendación: ${rec}` : null
  ].filter(Boolean).join("\n");
}

function xmlResponse(message) {
  // TwiML simple
  const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${esc(message)}</Message>
</Response>`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const contentType = req.headers["content-type"] || "";
    let body = {};
    if (contentType.includes("application/json")) {
      // Por si haces pruebas manuales
      const raw = await readRawBody(req);
      body = JSON.parse(raw || "{}");
    } else {
      // Twilio envía application/x-www-form-urlencoded
      const raw = await readRawBody(req);
      body = querystring.parse(raw);
    }

    const incomingText = body.Body || body.body || "";
    const placeText = parseLocationFromText(incomingText);
    if (!placeText) {
      const msg = "Envía: 'calidad del aire <lugar>' (ej. 'calidad del aire Penjamo')";
      res.status(200).setHeader("Content-Type", "text/xml").end(xmlResponse(msg));
      return;
    }

    const gKey = process.env.GMP_API_KEY;
    if (!gKey) throw new Error("Falta GMP_API_KEY");

    const { lat, lon, displayName } = await geocodePlace(placeText, gKey);
    const aq = await lookupAirQuality({ lat, lon }, gKey);

    const reply = formatAQMessage(displayName, aq);
    res.status(200).setHeader("Content-Type", "text/xml").end(xmlResponse(reply));
  } catch (e) {
    const msg = `No pude obtener la calidad del aire. ${e.message}`;
    res.status(200).setHeader("Content-Type", "text/xml").end(xmlResponse(msg));
  }
}