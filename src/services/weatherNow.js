export async function getCurrentWeather({
  lat,
  lon,
  unitsSystem = "METRIC" // "IMPERIAL" para °F, mph, miles, inches. [1](https://g2tji-my.sharepoint.com/personal/pro1550_g2tji_onmicrosoft_com/Documents/Archivos%20de%20Microsoft%C2%A0Copilot%20Chat/clima_actual_google.pdf)
}) {
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  if (!API_KEY) throw new Error("Falta REACT_APP_GOOGLE_API_KEY en .env.local");

  const base = "https://weather.googleapis.com/v1/currentConditions:lookup";
  const params = new URLSearchParams({
    key: API_KEY,
    "location.latitude": String(Number(lat)),
    "location.longitude": String(Number(lon)),
  });

  if (unitsSystem) params.set("unitsSystem", unitsSystem); // opcional. [1](https://g2tji-my.sharepoint.com/personal/pro1550_g2tji_onmicrosoft_com/Documents/Archivos%20de%20Microsoft%C2%A0Copilot%20Chat/clima_actual_google.pdf)

  const url = `${base}?${params.toString()}`;
  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return resp.json();
}