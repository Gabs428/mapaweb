// src/services/airQuality.js
export async function getAirQuality(lat, lon) {
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  if (!API_KEY) throw new Error("Falta REACT_APP_GOOGLE_API_KEY en tu .env.local");

  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${API_KEY}`;

  const body = {
    location: { latitude: Number(lat), longitude: Number(lon) },
    universalAqi: true,
    extraComputations: [
      "HEALTH_RECOMMENDATIONS",
      "DOMINANT_POLLUTANT_CONCENTRATION",
      "POLLUTANT_CONCENTRATION",
      "LOCAL_AQI"
    ],
    languageCode: "es"
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return resp.json();
}
