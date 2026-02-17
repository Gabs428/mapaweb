// src/components/ReverseBox.jsx
import React, { useState } from "react";

export default function ReverseBox({ onReverse }) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const r = await onReverse(lat, lon);
    setMsg(r);
  };

  return (
    <>
      <form onSubmit={submit} className="reverse-box">
        <input
          type="number"
          placeholder="Latitud"
          step="0.00001"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          type="number"
          placeholder="Longitud"
          step="0.00001"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
        />
        <button type="submit">🗺️ Buscar Dirección</button>
      </form>

      {msg && <div className="reverse-result">{msg}</div>}
    </>
  );
}