// src/components/MapView.jsx
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapView({ lat, lon, info, aqiBadge }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // Inicializa el mapa una sola vez (sin lat/lon aquí)
  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      const map = L.map(mapRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      mapInstance.current = map;
    }
  }, []);

  // Re-centrar y actualizar marcador/popup al cambiar props
  useEffect(() => {
    if (!mapInstance.current) return;

    mapInstance.current.setView([lat, lon], 15);

    if (markerRef.current) {
      mapInstance.current.removeLayer(markerRef.current);
    }

    const badgeHtml = aqiBadge ? `<br/>${aqiBadge}` : "";
    const html = `
      <strong>${info || ""}</strong><br/>
      Lat: ${Number(lat).toFixed(6)}<br/>
      Lon: ${Number(lon).toFixed(6)}${badgeHtml}
    `;

    markerRef.current = L.marker([lat, lon])
      .addTo(mapInstance.current)
      .bindPopup(html)
      .openPopup();
  }, [lat, lon, info, aqiBadge]);

  return <div ref={mapRef} className="mapa" />;
}