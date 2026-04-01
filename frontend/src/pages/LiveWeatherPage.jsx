import { useState, useMemo, useEffect } from 'react';
import {
  Area, AreaChart, BarChart, Bar, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import LiveDot from '../components/ui/LiveDot';
import { Droplets, Wind, Gauge, CloudRain, Sun, Cloud, CloudLightning, Snowflake, Thermometer, Waves } from 'lucide-react';
import {
  fmt, ts, timeAgo,
  aqiCategory, computeAQI, riskLevel, SENSOR_COLORS, weatherCondition,
} from '../utils/helpers';

// ── Condition météo → composant Lucide ───────────────────────
const COND_ICON_MAP = {
  'Tempête': CloudLightning, 'Forte pluie': CloudRain, 'Pluie': CloudRain,
  'Vent violent': Wind, 'Dépression': Cloud, 'Nuageux': Cloud,
  'Ensoleillé': Sun, 'Partiellement nuageux': Sun,
  'Chaud': Thermometer, 'Gel': Snowflake, 'Stable': Cloud,
};

const ICON_MAP = {
  humidity: Droplets, wind: Wind, pressure: Gauge, rain: CloudRain,
  luminosity: Sun, flood: Waves, storm: CloudLightning, weather: Cloud,
  thermometer: Thermometer,
};

function MeteoIcon({ name, size = 16, color, style }) {
  const C = ICON_MAP[name] || Cloud;
  return <C size={size} color={color} style={style} />;
}

// ── Weather condition symbol ──────────────────────────────────
function WeatherSymbol({ condition, size = 52 }) {
  const C = COND_ICON_MAP[condition] || Cloud;
  return (
    <div style={{
      width: size, height: size, borderRadius: 14,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <C size={Math.round(size * 0.52)} color="var(--text-secondary)" />
    </div>
  );
}

function tempColor(t) {
  if (t == null) return 'var(--text-primary)';
  if (t >= 32) return '#f97316';
  if (t < 22) return '#60a5fa';
  return 'var(--text-primary)';
}

// ── Collapsible card wrapper ──────────────────────────────────
function CollapsibleCard({ title, subtitle, rightContent, children, defaultOpen = true, style = {} }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 20, ...style }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: open ? 16 : 0,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {rightContent}
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 13, flexShrink: 0,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .2s ease',
          }}>
            ▾
          </div>
        </div>
      </button>
      {open && children}
    </div>
  );
}

// ── Single metric horizontal bar indicator ───────────────────
function MetricBar({ label, icon, value, unit, pct, color, note }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          <MeteoIcon name={icon} size={13} color={color} />
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value != null ? `${value} ${unit}` : '—'}
          {note && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 5 }}>{note}</span>}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 20,
          width: `${Math.min(100, Math.max(0, pct || 0))}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          transition: 'width .6s ease',
        }} />
      </div>
    </div>
  );
}

// ── 7-day forecast card ──────────────────────────────────────
function DayCard({ day, isToday }) {
  const CondIcon = COND_ICON_MAP[day.condLabel] || Cloud;
  const maxT = day.temp_max != null ? Math.round(day.temp_max) : '—';
  const minT = day.temp_min != null ? Math.round(day.temp_min) : '—';
  const rain  = day.rain_prob != null ? Math.round(day.rain_prob) : 0;
  const rainColor = rain >= 60 ? '#3b82f6' : rain >= 30 ? '#60a5fa' : 'var(--text-muted)';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '14px 10px', borderRadius: 12,
      background: isToday ? 'var(--accent-muted)' : 'var(--bg-elevated)',
      border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border-subtle)'}`,
      minWidth: 80, flex: 1,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: isToday ? 'var(--accent)' : 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '.5px',
      }}>{day.dayName}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CondIcon size={20} color="var(--text-muted)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{maxT}°</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{minT}°</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Droplets size={10} color="var(--text-muted)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: rainColor }}>{rain}%</span>
      </div>
      {rain > 0 && (
        <div style={{ width: '100%', height: 3, background: 'var(--bg-hover)', borderRadius: 10 }}>
          <div style={{ width: `${rain}%`, height: '100%', background: rainColor, borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
}

// ── Data helpers ─────────────────────────────────────────────
function deterministicShift(base, d) {
  return Math.round(Math.sin((base + d * 1.7) * 0.4) * 2);
}

function buildEmptyDay(d) {
  const now = new Date(); const date = new Date(now);
  date.setDate(date.getDate() + d);
  const dayName = d === 0 ? 'Auj.' : d === 1 ? 'Dem.' :
    date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3);
  return { dayName, temp_max: null, temp_min: null, rain_prob: null, condLabel: '—', source: 'none' };
}

function buildExtrap(dayName, latest, d) {
  const shift = deterministicShift(latest.temperature, d);
  const pressureFalling = latest.pressure < 1005;
  const basePrecip = latest.rain_level > 2 ? 50 : pressureFalling ? 35 : 15;
  const extrapReading = {
    temperature: latest.temperature + shift,
    humidity: Math.min(100, latest.humidity + shift * 1.5),
    pressure: latest.pressure - d * 0.3,
    rain_level: basePrecip > 40 ? 6 : 1,
    wind_speed: latest.wind_speed,
    luminosity: latest.luminosity,
  };
  return {
    dayName,
    temp_max: latest.temperature + shift + 2,
    temp_min: latest.temperature + shift - 4,
    rain_prob: Math.min(90, basePrecip + d * 2),
    condLabel: weatherCondition(extrapReading).label,
    source: 'estimated',
  };
}

function buildWeekForecast(history, latest, predictions) {
  if (!latest) return Array.from({ length: 7 }, (_, i) => buildEmptyDay(i));
  const toCondLabel = (r) => weatherCondition(r).label;
  const now = new Date();
  const days = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dayName = d === 0 ? 'Auj.' : d === 1 ? 'Dem.' :
      date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3);
    if (d === 0) {
      const todaySamples = history.filter((r) => {
        const h = new Date(r.timestamp > 1e12 ? r.timestamp : r.timestamp * 1000);
        return h.toDateString() === date.toDateString();
      });
      const temps = todaySamples.map((r) => Number(r.temperature)).filter((v) => !isNaN(v));
      const rains = todaySamples.map((r) => Number(r.rain_level)).filter((v) => !isNaN(v));
      days.push({
        dayName,
        temp_max: temps.length ? Math.max(...temps) : latest.temperature + 2,
        temp_min: temps.length ? Math.min(...temps) : latest.temperature - 4,
        rain_prob: rains.length
          ? Math.min(100, (rains.filter((v) => v > 1).length / rains.length) * 100 * 2)
          : (latest.rain_level > 2 ? 60 : 10),
        condLabel: toCondLabel(latest), source: 'actual',
      });
    } else if (d === 1) {
      const pred = (predictions || []).find((p) => p.horizon_hours === 24);
      if (pred) {
        days.push({
          dayName,
          temp_max: pred.predicted_temp + 2, temp_min: pred.predicted_temp - 3,
          rain_prob: Math.min(100, pred.extreme_event_probability * 120),
          condLabel: toCondLabel({ temperature: pred.predicted_temp, humidity: pred.predicted_humidity, pressure: pred.predicted_pressure, rain_level: pred.extreme_event_probability > 0.4 ? 8 : 1, wind_speed: latest.wind_speed }),
          source: 'lstm',
        });
      } else {
        days.push(buildExtrap(dayName, latest, d));
      }
    } else if (d === 2) {
      const pred = (predictions || []).find((p) => p.horizon_hours === 12);
      days.push(pred ? {
        dayName,
        temp_max: pred.predicted_temp + 1 + deterministicShift(latest.temperature, d),
        temp_min: pred.predicted_temp - 4 + deterministicShift(latest.temperature, d),
        rain_prob: Math.min(100, pred.extreme_event_probability * 100 + 10),
        condLabel: toCondLabel({ temperature: pred.predicted_temp, humidity: pred.predicted_humidity, pressure: pred.predicted_pressure, rain_level: 2, wind_speed: latest.wind_speed }),
        source: 'estimated',
      } : buildExtrap(dayName, latest, d));
    } else {
      days.push(buildExtrap(dayName, latest, d));
    }
  }
  return days;
}

// Aggregate all-stations latest into a single synthetic reading
function aggregateLatest(latestByNode, nodeIds) {
  const latests = nodeIds.map((id) => latestByNode[id]).filter(Boolean);
  if (!latests.length) return null;
  const avg = (field) => {
    const vals = latests.map((r) => Number(r[field])).filter((v) => !isNaN(v));
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const maxVal = (field) => {
    const vals = latests.map((r) => Number(r[field])).filter((v) => !isNaN(v));
    return vals.length ? Math.max(...vals) : null;
  };
  const latestSample = latests.reduce((best, current) => {
    const bestTs = Number(best?.timestamp || 0);
    const currentTs = Number(current?.timestamp || 0);
    return currentTs > bestTs ? current : best;
  }, latests[0]);

  const merged = {
    temperature: avg('temperature'),
    humidity:    avg('humidity'),
    pressure:    avg('pressure'),
    wind_speed:  maxVal('wind_speed'),
    rain_level:  avg('rain_level'),
    luminosity:  avg('luminosity'),
    anomaly_score: maxVal('anomaly_score'),
    flood_risk: maxVal('flood_risk'),
    storm_risk: maxVal('storm_risk'),
    overall_risk: maxVal('overall_risk'),
    aqi: avg('aqi'),
    timestamp:   Math.max(...latests.map((r) => r.timestamp || 0)),
  };

  if (merged.aqi == null) {
    merged.aqi = computeAQI(merged);
  }

  return {
    ...latestSample,
    ...merged,
  };
}

function buildCitySeriesChart(historyByNode, nodeIds = [], cutoff24h, field, label) {
  const buckets = {};
  nodeIds.forEach((id) => {
    const readings = (historyByNode[id] || []).filter((r) => r.timestamp >= cutoff24h).slice(-72);
    readings.forEach((r) => {
      const t = ts(r.timestamp);
      if (!buckets[t]) buckets[t] = { time: t, total: 0, count: 0 };
      if (r[field] != null && !Number.isNaN(Number(r[field]))) {
        buckets[t].total += Number(r[field]);
        buckets[t].count += 1;
      }
    });
  });

  return Object.values(buckets)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(({ time, total, count }) => ({
      time,
      [label]: count > 0 ? Number((total / count).toFixed(1)) : 0,
    }));
}

function cityFromNode(node) {
  if (!node) return 'Ville inconnue';
  const loc = String(node.location || '').trim();
  if (!loc) return node.name || 'Ville inconnue';
  return loc.split(',')[0].trim() || loc;
}

function buildCityLiveRows(nodes = [], latestByNode = {}) {
  const map = {};
  for (const n of nodes) {
    const city = cityFromNode(n);
    const region = n.region || 'Non définie';
    const key = `${region}::${city}`;
    if (!map[key]) {
      map[key] = {
        key,
        city,
        region,
        nodeCount: 0,
        onlineCount: 0,
        temps: [],
        hums: [],
        rains: [],
        winds: [],
        condCounts: {},
        stations: [],
      };
    }
    const row = map[key];
    row.nodeCount += 1;
    if (n.status === 'online') row.onlineCount += 1;
    row.stations.push({ id: n.id, name: n.name, status: n.status });

    const latest = latestByNode[n.id];
    if (latest) {
      if (latest.temperature != null) row.temps.push(Number(latest.temperature));
      if (latest.humidity != null) row.hums.push(Number(latest.humidity));
      if (latest.rain_level != null) row.rains.push(Number(latest.rain_level));
      if (latest.wind_speed != null) row.winds.push(Number(latest.wind_speed));
      const cond = latest.condition_label || weatherCondition(latest).label;
      row.condCounts[cond] = (row.condCounts[cond] || 0) + 1;
    }
  }

  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const max = (arr) => (arr.length ? Math.max(...arr) : null);

  return Object.values(map)
    .map((c) => ({
      city: c.city,
      nodeCount: c.nodeCount,
      onlineCount: c.onlineCount,
      temperature: avg(c.temps),
      humidity: avg(c.hums),
      rain: avg(c.rains),
      wind: max(c.winds),
      condition: Object.entries(c.condCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
      stations: c.stations,
      key: c.key,
      region: c.region,
    }))
    .sort((a, b) => {
      if ((a.onlineCount > 0) !== (b.onlineCount > 0)) return a.onlineCount > 0 ? -1 : 1;
      const byRegion = a.region.localeCompare(b.region, 'fr', { sensitivity: 'base' });
      if (byRegion !== 0) return byRegion;
      return a.city.localeCompare(b.city, 'fr', { sensitivity: 'base' });
    });
}

function buildCityForecastRows(cityRows, nodes, latestByNode, historyByNode, predictions) {
  return cityRows.map((cityRow) => {
    const relatedNodes = nodes.filter(
      (n) => cityFromNode(n) === cityRow.city && (n.region || 'Non définie') === cityRow.region
    );

    const cityNodeIds = relatedNodes.map((n) => n.id);
    const cityLatest = aggregateLatest(latestByNode, cityNodeIds);
    const cityHistory = cityNodeIds.flatMap((id) => historyByNode[id] || []);
    const cityForecast = buildWeekForecast(cityHistory, cityLatest, predictions);

    return {
      ...cityRow,
      forecast: cityForecast,
      condition: cityLatest?.condition_label || weatherCondition(cityLatest).label,
      updatedAt: cityLatest?.timestamp || null,
    };
  });
}

// ── Main component ────────────────────────────────────────────
export default function LiveWeatherPage({
  nodes = [],
  historyByNode = {},
  latestByNode = {},
  predictions = [],
  regionFilter = null,
}) {
  const [activeSlide, setActiveSlide] = useState(0);

  const cutoff24h = Date.now() / 1000 - 24 * 3600;

  const cityRows = useMemo(() => buildCityLiveRows(nodes, latestByNode), [nodes, latestByNode]);
  const cityForecastRows = useMemo(
    () => buildCityForecastRows(cityRows, nodes, latestByNode, historyByNode, predictions),
    [cityRows, nodes, latestByNode, historyByNode, predictions]
  );

  const selectedCity = cityForecastRows[activeSlide] || null;

  const selectedCityNodeIds = useMemo(() => {
    if (!selectedCity) return [];
    return nodes
      .filter((n) => cityFromNode(n) === selectedCity.city && (n.region || 'Non définie') === selectedCity.region)
      .map((n) => n.id);
  }, [nodes, selectedCity]);

  const latest = useMemo(() => {
    if (!selectedCityNodeIds.length) return null;
    return aggregateLatest(latestByNode, selectedCityNodeIds);
  }, [latestByNode, selectedCityNodeIds]);

  const history = useMemo(() => {
    return selectedCityNodeIds
      .flatMap((id) => historyByNode[id] || [])
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [historyByNode, selectedCityNodeIds]);

  const tempChart = useMemo(() => {
    return buildCitySeriesChart(historyByNode, selectedCityNodeIds, cutoff24h, 'temperature', 'Température');
  }, [historyByNode, selectedCityNodeIds, cutoff24h]);

  const rainChart = useMemo(() => {
    return buildCitySeriesChart(historyByNode, selectedCityNodeIds, cutoff24h, 'rain_level', 'Pluie');
  }, [historyByNode, selectedCityNodeIds, cutoff24h]);

  // Utiliser les champs pré-calculés par le backend
  const floodRisk = latest?.flood_risk ?? 0;
  const stormRisk = latest?.storm_risk ?? 0;
  const aqi       = latest?.aqi ?? computeAQI(latest);
  const aqiCat    = aqiCategory(aqi);
  const condition = { label: latest?.condition_label ?? '—', severity: latest?.condition_severity ?? 'none' };
  const beaufort  = latest ? { scale: latest.beaufort_scale ?? 0, label: latest.beaufort_label ?? 'Calme' } : null;
  const isAnomaly = (latest?.anomaly_score ?? 0) >= 0.7 || latest?.is_anomaly;
  const floodRL   = riskLevel(floodRisk);
  const stormRL   = riskLevel(stormRisk);

  const weekForecast = useMemo(
    () => buildWeekForecast(history, latest, predictions),
    [history, latest, predictions]
  );

  const onlineCount = selectedCity?.onlineCount || 0;

  const regionSnapshots = useMemo(() => {
    const map = {};
    cityForecastRows.forEach((c) => {
      if (!map[c.region]) map[c.region] = [];
      map[c.region].push(c);
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }));
  }, [cityForecastRows]);

  useEffect(() => {
    setActiveSlide(0);
  }, [regionFilter, cityForecastRows.length]);

  useEffect(() => {
    if (cityForecastRows.length < 2) return undefined;
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % cityForecastRows.length);
    }, 4500);
    return () => clearInterval(id);
  }, [cityForecastRows.length]);

  const slide = selectedCity;
  const slideTomorrow = slide?.forecast?.[1] || null;
  const slideAfterTomorrow = slide?.forecast?.[2] || null;

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Météo en direct</div>
          <div className="page-subtitle">
            {selectedCity
              ? `${selectedCity.region} · ${selectedCity.city} · météo et prévisions en direct`
              : 'Sélectionnez une région dans le filtre supérieur pour afficher la météo par ville'}
          </div>
        </div>
      </div>

      {!regionFilter && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Affichage sur les régions
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Utilisez le filtre de région en haut de page pour afficher la météo en direct des villes de cette région.
            Les données seront ensuite détaillées par ville et par station.
          </div>
        </div>
      )}

      {slide && (
        <CollapsibleCard
          title="Slide météo villes"
          subtitle={regionFilter ? `${regionFilter} · défilement automatique` : 'Toutes les régions'}
          style={{ padding: 5, overflow: 'hidden' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(90deg, var(--accent-muted), transparent)',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
                Slide météo villes {regionFilter ? `· ${regionFilter}` : '· toutes régions'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Prévisions en défilement automatique par ville et région
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                className="select"
                value={String(activeSlide)}
                onChange={(e) => setActiveSlide(Number(e.target.value) || 0)}
                style={{ maxWidth: 240, fontSize: 12, height: 28 }}
              >
                {cityForecastRows.map((c, idx) => (
                  <option key={c.key} value={idx}>
                    {c.city} · {c.region}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setActiveSlide((prev) => (prev - 1 + cityForecastRows.length) % cityForecastRows.length)}
                aria-label="Ville précédente"
              >
                ◀
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 62, textAlign: 'center' }}>
                {activeSlide + 1} / {cityForecastRows.length}
              </span>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setActiveSlide((prev) => (prev + 1) % cityForecastRows.length)}
                aria-label="Ville suivante"
              >
                ▶
              </button>
            </div>
          </div>

          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--bg-elevated)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{slide.city}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-muted)', padding: '3px 8px', borderRadius: 999 }}>
                  {slide.region}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>{slide.condition}</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: tempColor(slide.temperature) }}>
                  {slide.temperature != null ? `${Math.round(slide.temperature)}°` : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <div>Humidité: {slide.humidity != null ? `${fmt(slide.humidity, 0)}%` : '—'}</div>
                  <div>Vent max: {slide.wind != null ? `${fmt(slide.wind, 0)} km/h` : '—'}</div>
                  <div>Pluie: {slide.rain != null ? `${fmt(slide.rain, 1)} mm` : '—'}</div>
                </div>
              </div>
              {slide.updatedAt && (
                <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                  Mise à jour: {timeAgo(slide.updatedAt)}
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--bg-elevated)', padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Demain
              </div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {slideTomorrow?.condLabel || '—'}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <div>Max: <strong>{slideTomorrow?.temp_max != null ? `${Math.round(slideTomorrow.temp_max)}°` : '—'}</strong></div>
                <div>Min: <strong>{slideTomorrow?.temp_min != null ? `${Math.round(slideTomorrow.temp_min)}°` : '—'}</strong></div>
                <div>Pluie: <strong>{slideTomorrow?.rain_prob != null ? `${Math.round(slideTomorrow.rain_prob)}%` : '—'}</strong></div>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--bg-elevated)', padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Après-demain
              </div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {slideAfterTomorrow?.condLabel || '—'}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <div>Max: <strong>{slideAfterTomorrow?.temp_max != null ? `${Math.round(slideAfterTomorrow.temp_max)}°` : '—'}</strong></div>
                <div>Min: <strong>{slideAfterTomorrow?.temp_min != null ? `${Math.round(slideAfterTomorrow.temp_min)}°` : '—'}</strong></div>
                <div>Pluie: <strong>{slideAfterTomorrow?.rain_prob != null ? `${Math.round(slideAfterTomorrow.rain_prob)}%` : '—'}</strong></div>
              </div>
            </div>
          </div>
        </CollapsibleCard>
      )}

      {/* ── Hero — current conditions ─────────────────────────── */}
      <CollapsibleCard
        title={`Ville sélectionnée · ${selectedCity?.city || '—'}`}
        subtitle={selectedCity ? `${selectedCity.region} · ${selectedCity.nodeCount} station(s)` : 'Aucune ville sélectionnée'}
      >
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 16, padding: '24px', marginBottom: 0,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 220 }}>
          <WeatherSymbol condition={condition.label} size={64} />
          <div>
            <div style={{ fontSize: 52, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>
              {latest?.temperature != null ? `${Math.round(latest.temperature)}°` : '—'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>{condition.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <>
                <LiveDot active={onlineCount > 0} size={7} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {onlineCount}/{selectedCity?.nodeCount || 0} stations en ligne
                </span>
                {latest && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {timeAgo(latest.timestamp)}</span>}
              </>
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 80, background: 'var(--border-subtle)', flexShrink: 0 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, flex: 1, minWidth: 220 }}>
          {[
            { icon: 'humidity', label: 'Humidité',  value: fmt(latest?.humidity, 0),   unit: '%',    color: SENSOR_COLORS.humidity },
            { icon: 'wind',     label: 'Vent',       value: fmt(latest?.wind_speed, 0), unit: 'km/h', color: SENSOR_COLORS.wind_speed, note: beaufort?.label },
            { icon: 'pressure', label: 'Pression',   value: latest?.pressure != null ? Math.round(latest.pressure) : '—', unit: 'hPa', color: SENSOR_COLORS.pressure },
            { icon: 'rain',     label: 'Pluie',      value: fmt(latest?.rain_level, 1), unit: 'mm',   color: SENSOR_COLORS.rain_level },
          ].map(({ icon, label, value, unit, color, note }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MeteoIcon name={icon} size={16} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {value}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>
                </div>
                {note && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{note}</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: 1, height: 80, background: 'var(--border-subtle)', flexShrink: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            border: `4px solid ${aqiCat.color}`, background: `${aqiCat.color}12`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: aqiCat.color }}>{aqi != null ? Math.round(aqi) : '—'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>IQA</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: aqiCat.color }}>{aqiCat.label}</div>
          {isAnomaly && <span className="badge badge-red" style={{ fontSize: 9 }}>⚠ Anomalie IA</span>}
        </div>
      </div>
      </CollapsibleCard>

      {/* ── 7-day forecast ────────────────────────────────────── */}
      <CollapsibleCard
        title={`Prévisions 7 jours · ${selectedCity?.city || '—'}`}
        subtitle={selectedCity ? `${selectedCity.region} · prévisions ville individuelles` : undefined}
        defaultOpen={false}
        rightContent={
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Mesuré
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} /> LSTM
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Estimé
          </span>
        }
      >
        <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 4 }}>
          {weekForecast.map((day, idx) => <DayCard key={idx} day={day} isToday={idx === 0} />)}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          J+0 : capteurs réels · J+1 : LSTM 24h · J+2 : LSTM extrapolé · J+3–J+6 : estimation tendance
        </div>
      </CollapsibleCard>

      {/* ── Bloc unique : indicateurs + risques + tendances ───────────────── */}
      <CollapsibleCard
        title="Synthèse opérationnelle"
        subtitle="Indicateurs, risques et tendances 24h regroupés"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MetricBar
              label="Humidité relative"
              icon="humidity"
              value={latest?.humidity != null ? Math.round(latest.humidity) : null}
              unit="%" pct={latest?.humidity} color={SENSOR_COLORS.humidity}
              note={latest?.humidity > 80 ? 'Élevée' : latest?.humidity < 30 ? 'Sèche' : 'Normale'}
            />
            <MetricBar
              label="Vitesse du vent"
              icon="wind"
              value={latest?.wind_speed != null ? Math.round(latest.wind_speed) : null}
              unit="km/h" pct={latest?.wind_speed != null ? Math.min(100, latest.wind_speed) : 0}
              color={SENSOR_COLORS.wind_speed} note={beaufort?.label}
            />
            <MetricBar
              label="Pression"
              icon="pressure"
              value={latest?.pressure != null ? Math.round(latest.pressure) : null}
              unit="hPa"
              pct={latest?.pressure != null ? Math.min(100, Math.max(0, ((latest.pressure - 970) / 60) * 100)) : 0}
              color={SENSOR_COLORS.pressure}
              note={latest?.pressure < 995 ? 'Basse' : latest?.pressure > 1025 ? 'Haute' : 'Normale'}
            />
            <MetricBar
              label="Luminosité"
              icon="luminosity"
              value={latest?.luminosity != null ? Math.round(latest.luminosity).toLocaleString() : null}
              unit="lux"
              pct={latest?.luminosity != null ? Math.min(100, (latest.luminosity / 80000) * 100) : 0}
              color={SENSOR_COLORS.luminosity}
              note={latest?.luminosity > 20000 ? 'Lumière vive' : latest?.luminosity > 1000 ? 'Nuageux' : 'Faible'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {[
              {
                label: 'Risque inondation', risk: floodRisk, rl: floodRL, icon: 'flood',
                detail: `Pluie: ${fmt(latest?.rain_level)} mm · Pression: ${latest?.pressure != null ? Math.round(latest.pressure) : '—'} hPa`,
              },
              {
                label: 'Risque tempête', risk: stormRisk, rl: stormRL, icon: 'storm',
                detail: `Vent: ${fmt(latest?.wind_speed, 0)} km/h · ${beaufort?.label || '—'}`,
              },
            ].map(({ label, risk, rl, icon, detail }) => (
              <div key={label} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderLeft: `3px solid ${rl.color}`, borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    <MeteoIcon name={icon} size={15} color={rl.color} /> {label}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: rl.color, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(risk)}%
                  </span>
                </div>
                <div style={{ height: 7, background: 'var(--bg-elevated)', borderRadius: 20, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 20, width: `${risk}%`,
                    background: `linear-gradient(90deg, ${rl.color}88, ${rl.color})`,
                    transition: 'width .6s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Température — 24h
            </div>
            {tempChart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                Pas assez de données
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={tempChart} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} unit="°" width={28} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Température" stroke="#f97316" fill="url(#tempGrad)" strokeWidth={2.2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Précipitations — 24h
            </div>
            {rainChart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                Pas assez de données
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={rainChart} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} unit="mm" width={30} />
                  <Tooltip />
                  <Bar dataKey="Pluie" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Analyse régionale (ancien onglet dédié) ───────────── */}
      <CollapsibleCard
        title="Analyse régionale · Côte d'Ivoire"
        subtitle="Structure compacte sans duplication"
        defaultOpen={false}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {regionSnapshots.map(([region, list]) => {
            const avgTemp = list.length
              ? list.reduce((s, c) => s + (c.temperature || 0), 0) / list.length
              : null;
            const avgHum = list.length
              ? list.reduce((s, c) => s + (c.humidity || 0), 0) / list.length
              : null;
            const maxRisk = list.length
              ? Math.max(...list.map((c) => c.risk || 0))
              : 0;
            const onlineCities = list.filter((c) => c.onlineCount > 0).length;
            const topCities = [...list]
              .sort((a, b) => (b.risk || 0) - (a.risk || 0))
              .slice(0, 3);

            return (
              <div key={region} style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{region}</div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{onlineCities}/{list.length} villes actives</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: tempColor(avgTemp) }}>{avgTemp != null ? `${fmt(avgTemp, 1)}°` : '—'}</strong><br />Temp
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    <strong>{avgHum != null ? `${fmt(avgHum, 0)}%` : '—'}</strong><br />Hum
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: riskLevel(maxRisk).color }}>{Math.round(maxRisk)}%</strong><br />Risque max
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {topCities.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => {
                        const idx = cityForecastRows.findIndex((x) => x.key === c.key);
                        if (idx >= 0) setActiveSlide(idx);
                      }}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        borderRadius: 999,
                        padding: '3px 8px',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {c.city} · {Math.round(c.risk || 0)}%
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleCard>
    </div>
  );
}
