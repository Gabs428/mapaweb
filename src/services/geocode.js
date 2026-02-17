// src/services/geocode.js
import axios from "axios";

const client = axios.create({
  baseURL: "https://nominatim.openstreetmap.org",
  headers: {
    "User-Agent": "GeoTormenta-React/1.0 (educativo)",
    "Accept-Language": "es",
  },
});

export async function forwardGeocode(query) {
  const { data } = await client.get("/search", {
    params: { q: query, format: "json", limit: 1 },
  });
  if (!data || !data.length) return null;

  const r = data[0];
  return {
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
  };
}
