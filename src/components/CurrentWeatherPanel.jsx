import React from "react";

function iconUrl(iconBaseUri) {
  return iconBaseUri ? `${iconBaseUri}_color.svg` : "";
}

export default function CurrentWeatherPanel({ data, loading, error, units = "METRIC" }) {
  const cw = data;

  const temp      = cw?.temperature?.degrees;
  const feelsLike = cw?.feelsLikeTemperature?.degrees;
  const dewPoint  = cw?.dewPoint?.degrees;
  const rh        = cw?.relativeHumidity;
  const uv        = cw?.uvIndex;
  const windSpd   = cw?.wind?.speed?.value;
  const windGust  = cw?.wind?.gust?.value;
  const windCard  = cw?.wind?.direction?.cardinal;
  const vis       = cw?.visibility?.distance;
  const cloud     = cw?.cloudCover;
  const precipP   = cw?.precipitation?.probability?.percent;
  const precipQ   = cw?.precipitation?.qpf?.quantity;
  const precipU   = cw?.precipitation?.qpf?.unit;
  const cond      = cw?.weatherCondition;
  const tz        = cw?.timeZone?.id;

  const histMax   = cw?.currentConditionsHistory?.maxTemperature?.degrees;
  const histMin   = cw?.currentConditionsHistory?.minTemperature?.degrees;
  const histDelta = cw?.currentConditionsHistory?.temperatureChange?.degrees;

  const unitTemp  = cw?.temperature?.unit || (units === "IMPERIAL" ? "FAHRENHEIT" : "CELSIUS");
  const unitSpeed = cw?.wind?.speed?.unit || (units === "IMPERIAL" ? "MILES_PER_HOUR" : "KILOMETERS_PER_HOUR");
  const unitVis   = cw?.visibility?.unit   || (units === "IMPERIAL" ? "MILES" : "KILOMETERS");

  return (
    <div className="forecast-panel" style={{minWidth: 320}}>
      <h3>Clima ahora {tz && <small className="small-muted">({tz})</small>}</h3>

      {loading && <p>Cargando clima actual…</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && !data && <p>No hay datos de clima actual para estas coordenadas.</p>}

      {!loading && !error && data && (
        <div className="card" style={{display:"grid", gap: 10}}>
          <div style={{display:"flex", alignItems:"center", gap: 10}}>
            {cond?.iconBaseUri && (
              <img src={iconUrl(cond.iconBaseUri)} width={48} height={48}
                   alt={cond?.description?.text || cond?.type || "Condición"} />
            )}
            <div>
              <div style={{fontSize: 18, fontWeight: 700}}>
                {cond?.description?.text || cond?.type || "—"}
              </div>
              <div className="small-muted">
                {cw?.isDaytime ? "Día" : "Noche"}
              </div>
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 6}}>
            <div><strong>Temp:</strong> {temp != null ? `${temp.toFixed(1)}°${unitTemp === "CELSIUS" ? "C" : "F"}` : "—"}</div>
            <div><strong>Sensación:</strong> {feelsLike != null ? `${feelsLike.toFixed(1)}°${unitTemp === "CELSIUS" ? "C" : "F"}` : "—"}</div>
            <div><strong>Punto rocío:</strong> {dewPoint != null ? `${dewPoint.toFixed(1)}°${unitTemp === "CELSIUS" ? "C" : "F"}` : "—"}</div>
            <div><strong>Humedad:</strong> {rh != null ? `${rh}%` : "—"}</div>
            <div><strong>Viento:</strong> {windSpd != null ? `${windSpd} ${unitSpeed === "KILOMETERS_PER_HOUR" ? "km/h" : "mph"}` : "—"} {windCard ? `(${windCard})` : ""}</div>
            <div><strong>Ráfaga:</strong> {windGust != null ? `${windGust} ${unitSpeed === "KILOMETERS_PER_HOUR" ? "km/h" : "mph"}` : "—"}</div>
            <div><strong>Visibilidad:</strong> {vis != null ? `${vis} ${unitVis === "KILOMETERS" ? "km" : "mi"}` : "—"}</div>
            <div><strong>Nubosidad:</strong> {cloud != null ? `${cloud}%` : "—"}</div>
            <div><strong>UV:</strong> {uv != null ? uv : "—"}</div>
            <div><strong>Precipitación:</strong> {precipP != null ? `${precipP}%` : "—"}{precipQ != null ? ` · ${precipQ} ${precipU || ""}` : ""}</div>
          </div>

          {(histMax != null || histMin != null || histDelta != null) && (
            <div style={{marginTop: 4}}>
              <h4>Últimas 24 h</h4>
              <div className="small-muted">
                {histMax != null && <>Máx: {histMax.toFixed(1)}°{unitTemp === "CELSIUS" ? "C" : "F"} · </>}
                {histMin != null && <>Mín: {histMin.toFixed(1)}°{unitTemp === "CELSIUS" ? "C" : "F"} · </>}
                {histDelta != null && <>Δ Temp: {histDelta.toFixed(1)}°</>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}