import React from "react";

export default function InfoPanel({ lat, lon, info, air, aqLoading, aqError }) {
  const copy = () => {
    const coords = `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
    navigator.clipboard.writeText(coords);
    alert("Coordenadas copiadas: " + coords);
  };

  const uaqi = air?.indexes?.find((i) => i.code === "uaqi") || air?.indexes?.[0];

  let badgeStyle = {};
  if (uaqi?.color) {
    const { red = 0, green = 150, blue = 0 } = uaqi.color;
    const scale = red <= 1 && green <= 1 && blue <= 1 ? 255 : 1;
    const r = Math.round(red * scale);
    const g = Math.round(green * scale);
    const b = Math.round(blue * scale);
    badgeStyle = {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 6,
      background: `rgb(${r}, ${g}, ${b})`,
      color: "#000",
      fontWeight: 700,
    };
  }

  return (
    <div className="info-panel">
      <h3>Información de la Ubicación</h3>
      <div className="ubicacion-info">{info}</div>

      <div className="coords-display">
        <span>Latitud: {Number(lat).toFixed(6)}</span>
        <span>Longitud: {Number(lon).toFixed(6)}</span>
      </div>

      <button onClick={copy} className="btn-copy">📋 Copiar Coordenadas</button>

      <hr />

      <h3>Calidad del aire</h3>

      {aqLoading && <p>Cargando calidad del aire…</p>}
      {aqError && <p className="error-message">Error: {aqError}</p>}

      {!aqLoading && !aqError && uaqi && (
        <div>
          <p>
            <span style={badgeStyle}>
              {uaqi.displayName || "AQI"}: {uaqi.aqiDisplay ?? uaqi.aqi}
            </span>
          </p>
          {uaqi.category && <p><strong>Categoría:</strong> {uaqi.category}</p>}
          {uaqi.dominantPollutant && (
            <p><strong>Contaminante dominante:</strong> {uaqi.dominantPollutant}</p>
          )}

          {air?.pollutants?.length > 0 && (
            <>
              <h4>Concentraciones</h4>
              <ul>
                {air.pollutants.map((p) => (
                  <li key={p.code}>
                    <strong>{p.displayName || p.code}:</strong>{" "}
                    {p.concentration?.value} {p.concentration?.units}
                  </li>
                ))}
              </ul>
            </>
          )}

          {air?.healthRecommendations && (
            <>
              <h4>Recomendaciones</h4>
              <ul>
                {Object.entries(air.healthRecommendations).map(([grupo, texto]) => (
                  <li key={grupo}>
                    <strong>{grupo}:</strong> {texto}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {!aqLoading && !aqError && !uaqi && (
        <p>No hay datos de calidad del aire para estas coordenadas.</p>
      )}
    </div>
  );
}