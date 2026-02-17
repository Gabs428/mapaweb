import React from "react";

function fmtDisplayDate(displayDate) {
  if (!displayDate) return "";
  const { year, month, day } = displayDate;
  const d = new Date(year, (month || 1) - 1, day || 1);
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function iconUrl(iconBaseUri) {
  if (!iconBaseUri) return "";
  return `${iconBaseUri}_color.svg`;
}

export default function ForecastPanel({ forecast, loading, error, onLoadMore }) {
  const days = forecast?.forecastDays || [];
  const tz = forecast?.timeZone?.id || "";

  return (
    <div className="forecast-panel" style={{minWidth: 320, flex: "1 1 420px"}}>
      <h3>Pronóstico diario {tz && <small style={{opacity:.7}}>({tz})</small>}</h3>

      {loading && <p>Cargando pronóstico…</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && days.length === 0 && (
        <p>No hay datos de pronóstico para esta ubicación.</p>
      )}

      <div className="forecast-grid">
        {days.map((d, idx) => {
          const dateStr = fmtDisplayDate(d.displayDate);
          const dayCond = d.daytimeForecast?.weatherCondition;
          const nightCond = d.nighttimeForecast?.weatherCondition;
          const maxT = d.maxTemperature?.degrees;
          const minT = d.minTemperature?.degrees;
          const rhDay = d.daytimeForecast?.relativeHumidity;
          const popDay = d.daytimeForecast?.precipitation?.probability?.percent;
          const windDay = d.daytimeForecast?.wind?.speed?.value;

          return (
            <div key={idx} className="card">
              <div style={{display:"flex", alignItems:"center", gap: 8}}>
                {dayCond?.iconBaseUri && (
                  <img src={iconUrl(dayCond.iconBaseUri)} alt={dayCond?.description?.text || ""} width={36} height={36} />
                )}
                <div>
                  <strong>{dateStr}</strong>
                  <div style={{fontSize:12,opacity:.8}}>
                    {dayCond?.description?.text || dayCond?.type || "—"}
                  </div>
                </div>
              </div>

              <div style={{marginTop:8, display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
                <div><strong>Máx:</strong> {maxT != null ? `${maxT.toFixed(1)}°C` : "—"}</div>
                <div><strong>Mín:</strong> {minT != null ? `${minT.toFixed(1)}°C` : "—"}</div>
                <div><strong>Humedad(día):</strong> {rhDay != null ? `${rhDay}%` : "—"}</div>
                <div><strong>Viento(día):</strong> {windDay != null ? `${windDay} km/h` : "—"}</div>
                <div><strong>Precip. %:</strong> {popDay != null ? `${popDay}%` : "—"}</div>
              </div>

              {nightCond?.iconBaseUri && (
                <div style={{marginTop:8, display:"flex", alignItems:"center", gap:6}}>
                  <img src={iconUrl(nightCond.iconBaseUri)} alt={nightCond?.description?.text || ""} width={24} height={24} />
                  <span style={{fontSize:12,opacity:.8}}>
                    Noche: {nightCond?.description?.text || nightCond?.type}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onLoadMore && !loading && (
        <div style={{marginTop:12}}>
          <button className="btn" onClick={onLoadMore}>Cargar más días</button>
        </div>
      )}
    </div>
  );
}