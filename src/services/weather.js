export async function getDailyForecast({
  lat,
  lon,
  days = 5,
  pageSize = 5,
  pageToken = ""
}) {
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  if (!API_KEY) throw new Error("Falta REACT_APP_GOOGLE_API_KEY en .env.local");

  const base = "https://weather.googleapis.com/v1/forecast/days:lookup";
  const params = new URLSearchParams({
    key: API_KEY,
    "location.latitude": String(Number(lat)),
    "location.longitude": String(Number(lon)),
    days: String(days),
    pageSize: String(pageSize),
  });

  if (pageToken) params.set("pageToken", pageToken);

  const url = `${base}?${params.toString()}`;

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return resp.json();
}