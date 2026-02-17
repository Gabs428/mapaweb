import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

import SearchBar from "./components/SearchBar";
import MapView from "./components/MapView";
import InfoPanel from "./components/InfoPanel";
import ForecastPanel from "./components/ForecastPanel";
import CurrentWeatherPanel from "./components/CurrentWeatherPanel";

import { forwardGeocode } from "./services/geocode";
import { getAirQuality } from "./services/airQuality";
import { getDailyForecast } from "./services/weather";
import { getCurrentWeather } from "./services/weatherNow";

export default function App() {
  const [lat, setLat] = useState(19.4326);
  const [lon, setLon] = useState(-99.1332);
  const [info, setInfo] = useState("Ingresa una dirección para ver los detalles");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [air, setAir] = useState(null);
  const [aqLoading, setAqLoading] = useState(false);
  const [aqError, setAqError] = useState("");

  const [cw, setCw] = useState(null);
  const [cwLoading, setCwLoading] = useState(false);
  const [cwError, setCwError] = useState("");
  const [units, setUnits] = useState("METRIC");

  const [forecast, setForecast] = useState(null);
  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState("");
  const [wfNextToken, setWfNextToken] = useState("");

  const setLocation = (newLat, newLon, description) => {
    setLat(Number(newLat));
    setLon(Number(newLon));
    setInfo(description || "");
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setError("Por favor ingresa una dirección");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await forwardGeocode(query);
      if (!result) {
        setError("Dirección no encontrada");
        return;
      }
      setLocation(result.lat, result.lon, result.displayName);
    } catch (e) {
      setError("Error al buscar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancel = false;
    async function runAQ() {
      setAqLoading(true);
      setAqError("");
      try {
        const data = await getAirQuality(lat, lon);
        if (!cancel) setAir(data);
      } catch (e) {
        if (!cancel) setAqError(e.message || "Error al obtener calidad del aire");
      } finally {
        if (!cancel) setAqLoading(false);
      }
    }
    runAQ();
    return () => { cancel = true; };
  }, [lat, lon]);

  useEffect(() => {
    let cancel = false;
    async function runCW() {
      setCwLoading(true);
      setCwError("");
      try {
        const data = await getCurrentWeather({ lat, lon, unitsSystem: units });
        if (!cancel) setCw(data);
      } catch (e) {
        if (!cancel) setCwError(e.message || "Error al obtener clima actual");
      } finally {
        if (!cancel) setCwLoading(false);
      }
    }
    runCW();
    return () => { cancel = true; };
  }, [lat, lon, units]);

  useEffect(() => {
    let cancel = false;
    async function runWF() {
      setWfLoading(true);
      setWfError("");
      try {
        const data = await getDailyForecast({
          lat,
          lon,
          days: 6,
          pageSize: 6,
        });
        if (!cancel) {
          setForecast(data);
          setWfNextToken(data?.nextPageToken || "");
        }
      } catch (e) {
        if (!cancel) setWfError(e.message || "Error al obtener pronóstico");
      } finally {
        if (!cancel) setWfLoading(false);
      }
    }
    runWF();
    return () => { cancel = true; };
  }, [lat, lon]);

  const loadMoreForecast = async () => {
    if (!wfNextToken) return;
    try {
      setWfLoading(true);
      const more = await getDailyForecast({
        lat, lon,
        days: 10,
        pageSize: 5,
        pageToken: wfNextToken,
      });
      setForecast(prev => ({
        ...more,
        forecastDays: [ ...(prev?.forecastDays || []), ...(more?.forecastDays || []) ]
      }));
      setWfNextToken(more?.nextPageToken || "");
    } catch (e) {
      setWfError(e.message || "Error al paginar pronóstico");
    } finally {
      setWfLoading(false);
    }
  };

  const aqiBadge = useMemo(() => {
    if (!air?.indexes?.length) return "";
    const uaqi = air.indexes.find((i) => i.code === "uaqi") || air.indexes[0];
    const label = uaqi?.displayName || "AQI";
    const value = uaqi?.aqiDisplay ?? uaqi?.aqi ?? "?";
    const category = uaqi?.category || "";
    const color = uaqi?.color;
    let r = 0, g = 150, b = 0;
    if (color) {
      const scale = color.red <= 1 && color.green <= 1 && color.blue <= 1 ? 255 : 1;
      r = Math.round((color.red ?? 0) * scale);
      g = Math.round((color.green ?? 150) * scale);
      b = Math.round((color.blue ?? 0) * scale);
    }
    const style = `display:inline-block;padding:2px 6px;border-radius:4px;background:rgb(${r},${g},${b});color:#000;font-weight:600;`;
    return `<span style="${style}" title="${category}">${label}: ${value}</span>`;
  }, [air]);

  return (
    <div className="container">
      <header>
        <h1>GeoTormenta React</h1>
        <p>Buscador de Coordenadas, Calidad del Aire y Clima</p>
      </header>

      <main>
        <section className="search-section">
          <SearchBar onSearch={handleSearch} loading={loading} />
          {error && <div className="error-message show">{error}</div>}
          <div style={{marginTop: 10, display:"flex", gap: 10, alignItems:"center"}}>
            <span className="small-muted">Unidades del clima:</span>
            <button
              className="btn"
              onClick={() => setUnits(u => (u === "METRIC" ? "IMPERIAL" : "METRIC"))}
              title="Cambiar METRIC/IMPERIAL"
            >
              {units === "METRIC" ? "Métrico (°C, km/h)" : "Imperial (°F, mph)"}
            </button>
          </div>
        </section>

        <section className="results-section">
          <div className="map-row">
            <div className="map-card">
              <MapView lat={lat} lon={lon} info={info} aqiBadge={aqiBadge} />
            </div>
          </div>

          <div className="panels-row">
            <div className="panel-card">
              <InfoPanel
                lat={lat}
                lon={lon}
                info={info}
                air={air}
                aqLoading={aqLoading}
                aqError={aqError}
              />
            </div>

            <div className="panel-card">
              <CurrentWeatherPanel
                data={cw}
                loading={cwLoading}
                error={cwError}
                units={units}
              />
            </div>

            <div className="panel-card">
              <ForecastPanel
                forecast={forecast}
                loading={wfLoading}
                error={wfError}
                onLoadMore={wfNextToken ? loadMoreForecast : null}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}