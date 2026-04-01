import { useMemo } from 'react';
import { fmt, SENSOR_COLORS, weatherCondition } from '../utils/helpers';
import Icon from '../components/ui/Icon';

const COND_ICON = {
  'Tempête': 'storm',
  'Forte pluie': 'rain',
  Pluie: 'rain',
  'Vent violent': 'wind',
  Dépression: 'cloud',
  Nuageux: 'cloud',
  Ensoleillé: 'sun',
  'Partiellement nuageux': 'sun',
  Chaud: 'thermometer',
  Gel: 'thermometer',
  Stable: 'weather',
};

const ZONE_COLOR = {
  Sud: '#3b82f6',
  'Sud-Ouest': '#3b82f6',
  Est: '#64748b',
  'Centre-Ouest': '#64748b',
  Centre: '#64748b',
  'Centre-Nord': '#64748b',
  Ouest: '#6366f1',
  'Nord-Est': '#94a3b8',
  Nord: '#f97316',
  'Nord-Ouest': '#f97316',
};
const DEFAULT_ZONE_COLOR = '#64748b';

const REGION_META = {
  Lagunes: { climate: 'Équatorial côtier', zone: 'Sud', order: 1 },
  'Bas-Sassandra': { climate: 'Sub-équatorial côtier', zone: 'Sud-Ouest', order: 2 },
  'Comoé': { climate: 'Sub-équatorial', zone: 'Est', order: 3 },
  'Sassandra-Marahoué': { climate: 'Transition forestière', zone: 'Centre-Ouest', order: 4 },
  Lacs: { climate: 'Tropical humide', zone: 'Centre', order: 5 },
  'Vallée du Bandama': { climate: 'Tropical', zone: 'Centre-Nord', order: 6 },
  Montagnes: { climate: "Tropical d'altitude", zone: 'Ouest', order: 7 },
  Zanzan: { climate: 'Soudano-guinéen', zone: 'Nord-Est', order: 8 },
  Savanes: { climate: 'Tropical sec', zone: 'Nord', order: 9 },
  Denguélé: { climate: 'Semi-aride', zone: 'Nord-Ouest', order: 10 },
};
const DEFAULT_META = { climate: 'Tropical', zone: "Côte d'Ivoire", order: 99 };

const getMeta = (region) => {
  const m = REGION_META[region] || DEFAULT_META;
  return { ...m, color: ZONE_COLOR[m.zone] || DEFAULT_ZONE_COLOR };
};

function tempColor(t) {
  if (t == null) return 'var(--text-muted)';
  if (t >= 32) return '#f97316';
  if (t < 22) return '#60a5fa';
  return 'var(--text-primary)';
}

function riskColor(risk) {
  if (risk == null) return 'var(--text-muted)';
  if (risk >= 75) return '#dc2626';
  if (risk >= 55) return '#f59e0b';
  if (risk >= 35) return '#84cc16';
  return '#22c55e';
}

function cityFromNode(node) {
  if (!node) return 'Ville inconnue';
  if (node.city && String(node.city).trim()) return String(node.city).trim();
  if (node.location && String(node.location).trim()) {
    const first = String(node.location).split(',')[0].trim();
    return first || String(node.location).trim();
  }
  if (node.name && String(node.name).trim()) return String(node.name).trim();
  return 'Ville inconnue';
}

function buildCityRows(nodes = []) {
  return Object.values(
    nodes.reduce((acc, n) => {
      const city = cityFromNode(n);
      if (!acc[city]) {
        acc[city] = {
          city,
          stations: [],
          onlineStations: 0,
          temps: [],
          hums: [],
          winds: [],
          rains: [],
          risks: [],
          condCounts: {},
        };
      }

      const row = acc[city];
      row.stations.push({
        id: n.id,
        name: n.name,
        status: n.status,
        temperature: n.latest?.temperature ?? null,
      });
      if (n.status === 'online') row.onlineStations += 1;

      const latest = n.latest;
      if (latest) {
        if (latest.temperature != null) row.temps.push(Number(latest.temperature));
        if (latest.humidity != null) row.hums.push(Number(latest.humidity));
        if (latest.wind_speed != null) row.winds.push(Number(latest.wind_speed));
        if (latest.rain_level != null) row.rains.push(Number(latest.rain_level));
        if (latest.overall_risk != null) row.risks.push(Number(latest.overall_risk));

        const condLabel = latest.condition_label || weatherCondition(latest).label;
        row.condCounts[condLabel] = (row.condCounts[condLabel] || 0) + 1;
      }

      return acc;
    }, {})
  )
    .map((c) => {
      const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
      const condLabel = Object.entries(c.condCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      return {
        city: c.city,
        stationCount: c.stations.length,
        onlineStations: c.onlineStations,
        temperature: avg(c.temps),
        humidity: avg(c.hums),
        wind: avg(c.winds),
        rain: avg(c.rains),
        risk: c.risks.length ? Math.max(...c.risks) : null,
        condLabel,
        stations: c.stations,
      };
    })
    .sort((a, b) => {
      if ((a.onlineStations > 0) !== (b.onlineStations > 0)) return a.onlineStations > 0 ? -1 : 1;
      if ((b.risk ?? -1) !== (a.risk ?? -1)) return (b.risk ?? -1) - (a.risk ?? -1);
      return a.city.localeCompare(b.city, 'fr', { sensitivity: 'base' });
    });
}

function RegionPanel({ regionData, isExpanded, onToggle }) {
  const meta = getMeta(regionData.region);
  const {
    avg_temperature,
    avg_humidity,
    avg_pressure,
    max_wind_speed,
    max_rain_level,
    node_count,
    online_count,
    nodes,
  } = regionData;

  const refLatest = nodes.map((n) => n.latest).find(Boolean);
  const condLabel =
    refLatest?.condition_label ||
    weatherCondition({ temperature: avg_temperature, rain_level: max_rain_level, wind_speed: max_wind_speed }).label;
  const condIconName = COND_ICON[condLabel] || 'weather';
  const cityRows = useMemo(() => buildCityRows(nodes), [nodes]);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: isExpanded ? '2px solid var(--accent)' : '1px solid var(--border-default)',
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: isExpanded
          ? '0 0 0 3px var(--accent-glow), 0 4px 16px rgba(0,0,0,.08)'
          : '0 1px 4px rgba(0,0,0,.04)',
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(regionData.region)}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1.2fr) repeat(5, minmax(80px, 1fr)) 30px',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {regionData.region}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {meta.zone}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{meta.climate}</div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stations</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>{node_count}</div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>En ligne</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#22c55e' }}>{online_count}</div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Hors ligne</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-muted)' }}>
              {Math.max(0, node_count - online_count)}
            </div>
          </div>

          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Condition</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', fontWeight: 700, fontSize: 12 }}>
              <Icon name={condIconName} size={13} color="var(--text-secondary)" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{condLabel}</span>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Temp. moy.</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, color: tempColor(avg_temperature), fontSize: 18 }}>
              {avg_temperature != null ? `${fmt(avg_temperature, 1)}°C` : '—'}
            </div>
          </div>

          <div
            style={{
              color: 'var(--text-muted)',
              fontWeight: 800,
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform .2s ease',
              fontSize: 16,
            }}
          >
            ›
          </div>
        </div>
      </button>

      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border-default)', padding: '12px 14px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
            {[
              {
                label: 'Humidité moy.',
                value: avg_humidity != null ? `${fmt(avg_humidity, 0)}%` : '—',
                color: SENSOR_COLORS.humidity,
              },
              {
                label: 'Vent max',
                value: max_wind_speed != null ? `${fmt(max_wind_speed, 0)} km/h` : '—',
                color: SENSOR_COLORS.wind_speed,
              },
              {
                label: 'Pluie max',
                value: max_rain_level != null ? `${fmt(max_rain_level, 1)} mm` : '—',
                color: SENSOR_COLORS.rain_level,
              },
              {
                label: 'Pression moy.',
                value: avg_pressure != null ? `${fmt(avg_pressure, 0)} hPa` : '—',
                color: SENSOR_COLORS.pressure,
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {cityRows.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Aucune station disponible dans cette région pour le moment.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                    {['Ville', 'Stations', 'En ligne', 'Condition', 'Temp.', 'Hum.', 'Vent', 'Pluie', 'Risque'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 10px',
                          textAlign: h === 'Risque' ? 'right' : 'left',
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          fontWeight: 700,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cityRows.map((c) => (
                    <tr key={c.city} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.city}</div>
                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {c.stations.map((s) => (
                            <span
                              key={s.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 999,
                                background: 'var(--bg-surface)',
                                padding: '2px 7px',
                                fontSize: 10,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: s.status === 'online' ? '#22c55e' : 'var(--text-muted)',
                                }}
                              />
                              <span>{s.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{c.stationCount}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: c.onlineStations > 0 ? '#22c55e' : 'var(--text-muted)' }}>
                        {c.onlineStations}
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{c.condLabel}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: tempColor(c.temperature) }}>
                        {c.temperature != null ? `${fmt(c.temperature, 1)}°C` : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {c.humidity != null ? `${fmt(c.humidity, 0)}%` : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {c.wind != null ? `${fmt(c.wind, 0)} km/h` : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {c.rain != null ? `${fmt(c.rain, 1)} mm` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          color: riskColor(c.risk),
                        }}
                      >
                        {c.risk != null ? `${Math.round(c.risk)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
            ✓ Filtre actif sur toutes les pages
          </div>
        </div>
      )}
    </div>
  );
}

function TempRanking({ regions }) {
  const withTemp = [...regions].filter((r) => r.avg_temperature != null).sort((a, b) => b.avg_temperature - a.avg_temperature);

  if (!withTemp.length) return null;

  const maxT = Math.max(...withTemp.map((r) => r.avg_temperature));
  const minT = Math.min(...withTemp.map((r) => r.avg_temperature));
  const range = maxT - minT || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {withTemp.map((r) => {
        const meta = getMeta(r.region);
        const pct = ((r.avg_temperature - minT) / range) * 75 + 25;
        return (
          <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 180, flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{r.region}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{meta.zone}</div>
            </div>
            <div style={{ flex: 1, height: 12, background: 'var(--bg-elevated)', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, var(--accent-muted), var(--accent))',
                  opacity: 0.75 + 0.25 * (pct / 100),
                  borderRadius: 6,
                  transition: 'width .5s ease',
                }}
              />
            </div>
            <div
              style={{
                width: 60,
                textAlign: 'right',
                flexShrink: 0,
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                fontSize: 15,
                color: tempColor(r.avg_temperature),
              }}
            >
              {fmt(r.avg_temperature, 1)}°C
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RegionsPage({ nodes = [], latestByNode = {}, regionFilter = null, onRegionChange, embedded = false }) {
  const simulatedData = useMemo(() => {
    const hasManStationInMontagnes = nodes.some((n) => {
      const region = String(n.region || '').trim();
      const city = cityFromNode(n).toLowerCase();
      return region === 'Montagnes' && city === 'man';
    });

    if (hasManStationInMontagnes) {
      return { effectiveNodes: nodes, effectiveLatestByNode: latestByNode, isSimulated: false };
    }

    const simulatedNode = {
      id: 'sim-man-001',
      name: 'Station Man Centre (Sim.)',
      city: 'Man',
      region: 'Montagnes',
      location: 'Man, Côte d\'Ivoire',
      status: 'online',
    };

    const simulatedLatest = {
      temperature: 24.8,
      humidity: 86,
      pressure: 1009,
      wind_speed: 14,
      rain_level: 4.2,
      overall_risk: 41,
      condition_label: 'Partiellement nuageux',
    };

    return {
      effectiveNodes: [...nodes, simulatedNode],
      effectiveLatestByNode: { ...latestByNode, [simulatedNode.id]: simulatedLatest },
      isSimulated: true,
    };
  }, [nodes, latestByNode]);

  const { effectiveNodes, effectiveLatestByNode, isSimulated } = simulatedData;

  const regionData = useMemo(() => {
    const map = {};
    for (const node of effectiveNodes) {
      const key = node.region || node.location || 'Inconnue';
      if (!map[key]) map[key] = { region: key, nodes: [] };
      map[key].nodes.push({ ...node, latest: effectiveLatestByNode[node.id] || null });
    }

    for (const region of Object.keys(REGION_META)) {
      if (!map[region]) map[region] = { region, nodes: [] };
    }

    return Object.values(map)
      .map((r) => {
        const withData = r.nodes.filter((n) => n.latest);
        const vals = (field) => withData.map((n) => n.latest[field]).filter((v) => v != null);
        const avg = (arr) => (arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null);
        const max = (arr) => (arr.length ? Number(Math.max(...arr).toFixed(1)) : null);

        return {
          region: r.region,
          node_count: r.nodes.length,
          online_count: r.nodes.filter((n) => n.status === 'online').length,
          avg_temperature: avg(vals('temperature')),
          avg_humidity: avg(vals('humidity')),
          avg_pressure: avg(vals('pressure')),
          max_wind_speed: max(vals('wind_speed')),
          max_rain_level: max(vals('rain_level')),
          nodes: r.nodes,
        };
      })
      .sort((a, b) => (getMeta(a.region).order || 99) - (getMeta(b.region).order || 99));
  }, [effectiveNodes, effectiveLatestByNode]);

  const allTemps = regionData.filter((r) => r.avg_temperature != null).map((r) => r.avg_temperature);
  const nationalAvgT = allTemps.length ? (allTemps.reduce((a, b) => a + b, 0) / allTemps.length).toFixed(1) : null;
  const totalOnline = effectiveNodes.filter((n) => n.status === 'online').length;
  const hottest = [...regionData].sort((a, b) => (b.avg_temperature ?? -99) - (a.avg_temperature ?? -99))[0];
  const coolest = [...regionData].sort((a, b) => (a.avg_temperature ?? 999) - (b.avg_temperature ?? 999))[0];
  const nationalRef = regionData.find((r) => r.avg_temperature != null);
  const natCondition = nationalRef
    ? {
        label:
          nationalRef.nodes.map((n) => n.latest?.condition_label).find(Boolean) ||
          weatherCondition({
            temperature: nationalRef.avg_temperature,
            rain_level: nationalRef.max_rain_level,
            wind_speed: nationalRef.max_wind_speed,
          }).label,
      }
    : { label: 'Variable' };

  const handleSelect = (region) => {
    if (onRegionChange) onRegionChange(regionFilter === region ? null : region);
  };

  return (
    <div>
      {!embedded && (
        <div className="page-header">
          <div>
            <div className="page-title">Météo par Région · Côte d'Ivoire</div>
            <div className="page-subtitle">
              {regionData.length} régions · {effectiveNodes.length} stations · {totalOnline} en ligne
              {regionFilter && (
                <span style={{ marginLeft: 10, color: '#f97316', fontWeight: 700 }}>· Filtre actif : {regionFilter}</span>
              )}
            </div>
            {isSimulated && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                Simulation active: une station de démonstration a été ajoutée à Man (région Montagnes).
              </div>
            )}
          </div>
          {regionFilter && (
            <button className="btn" onClick={() => onRegionChange && onRegionChange(null)} style={{ fontSize: 12 }}>
              ✕ Effacer le filtre
            </button>
          )}
        </div>
      )}

      <div className="section">
        <div className="section-title">
          Registres régionaux
          <div className="section-title-line" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {regionData.map((r) => (
            <RegionPanel key={r.region} regionData={r} isExpanded={regionFilter === r.region} onToggle={handleSelect} />
          ))}
        </div>
      </div>

      <div className="section">
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,.08) 0%, var(--bg-surface) 60%)',
            border: '1px solid var(--border-default)',
            borderRadius: 18,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <div
              style={{
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-elevated)',
                borderRadius: 16,
              }}
            >
              <Icon name="map" size={32} color="var(--text-secondary)" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  letterSpacing: '.5px',
                  textTransform: 'uppercase',
                }}
              >
                Température nationale moyenne
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 900,
                    fontSize: 52,
                    color: tempColor(nationalAvgT ? parseFloat(nationalAvgT) : null),
                    lineHeight: 1,
                  }}
                >
                  {nationalAvgT ?? '—'}
                </span>
                <span style={{ fontSize: 22, color: 'var(--text-muted)' }}>°C</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {natCondition.label} · Conditions variables selon la latitude
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 70, background: 'var(--border-default)', flexShrink: 0 }} />

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {hottest?.avg_temperature != null && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Max. enregistré</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#ef4444' }}>{hottest.region}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900, color: '#ef4444' }}>
                  {fmt(hottest.avg_temperature, 1)}°C
                </div>
              </div>
            )}
            {coolest?.avg_temperature != null && coolest.region !== hottest?.region && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Min. enregistré</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#22c55e' }}>{coolest.region}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900, color: '#22c55e' }}>
                  {fmt(coolest.avg_temperature, 1)}°C
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* <div className="section">
        <div className="section-title">
          Classement — du plus chaud au plus frais
          <div className="section-title-line" />
        </div>
        <div className="card">
          <TempRanking regions={regionData} />
        </div>
      </div> */}
    </div>
  );
}
