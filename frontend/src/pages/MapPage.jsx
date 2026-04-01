import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  riskLevel, fmt, timeAgo, computeOverallRisk, SENSOR_COLORS, fetchApi,
} from '../utils/helpers';
import Icon from '../components/ui/Icon';
import LiveDot from '../components/ui/LiveDot';
import NodeFormModal from '../components/ui/NodeFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SquarePen } from 'lucide-react';

// ─── Sidebar Filters ────────────────────────────────────────────────────────
function SidebarFilters({
  regions,
  selectedRegion,
  onRegionChange,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  onReset,
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        className="input"
        type="text"
        placeholder="Rechercher: nom, id, ville..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ minWidth: 220, flex: '1 1 260px' }}
      />

      <select
        value={selectedRegion}
        onChange={(e) => onRegionChange(e.target.value)}
        className="input"
        style={{ cursor: 'pointer', minWidth: 180, flex: '0 1 220px' }}
      >
        <option value="">Toutes les regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <div className="tabs">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'online', label: 'En ligne' },
          { id: 'offline', label: 'Hors ligne' },
        ].map(({ id, label }) => (
          <button key={id} className={`tab${statusFilter === id ? ' active' : ''}`} onClick={() => onStatusChange(id)}>
            {label}
          </button>
        ))}
      </div>

      <button className="btn btn-secondary btn-sm" onClick={onReset}>
        Reinitialiser
      </button>
    </div>
  );
}

// ─── Station Detail Panel ────────────────────────────────────────────────────
function StationDetailPanel({
  node,
  latest,
  onEdit,
  onDelete,
  onClose,
}) {
  if (!node) {
    return (
      <div style={{
        width: '100%',
        padding: '8px 0 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 12,
      }}>
        <Icon name="stations" size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
        Sélectionnez une station sur la carte
      </div>
    );
  }

  const risk = riskLevel(latest?.overall_risk ?? 0);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '0 0 16px',
        borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 2 }}>
              {node.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {node.location || node.id}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 20,
              padding: '0',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color .15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Status & Risk badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: 999,
            background: node.status === 'online' ? 'rgba(34,197,94,.12)' : 'rgba(148,163,184,.08)',
            color: node.status === 'online' ? '#22c55e' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            {node.status === 'online' ? 'En ligne' : 'Hors ligne'}
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: 999,
            background: `${risk.color}15`,
            color: risk.color,
            border: `1px solid ${risk.color}40`,
          }}>
            {risk.label}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Temperature Hero */}
        {latest ? (
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
            borderRadius: 14,
            padding: '20px 16px',
            textAlign: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(249,115,22,.2)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.9, marginBottom: 8 }}>TEMPÉRATURE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
              {fmt(latest.temperature)}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>°C</div>
          </div>
        ) : null}

        {/* Infos Géographiques Section */}
        <div>
          <div style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Icon name="location" size={12} color="var(--text-muted)" />
            POSITION
          </div>
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 10,
            padding: '12px',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <div>Lat: {Number(node.latitude).toFixed(4)}°</div>
              <div>Lon: {Number(node.longitude).toFixed(4)}°</div>
            </div>
          </div>
        </div>

        {/* Capteurs en temps réel Section */}
        {latest ? (
          <>
            <div>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '.5px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Icon name="sensors" size={12} color="var(--text-muted)" />
                CAPTEURS EN TEMPS RÉEL
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Humidité', value: fmt(latest.humidity), unit: '%', icon: 'humidity', color: SENSOR_COLORS.humidity },
                  { label: 'Pression', value: latest.pressure ? Math.round(latest.pressure) : '—', unit: 'hPa', icon: 'pressure', color: SENSOR_COLORS.pressure },
                  { label: 'Vent', value: fmt(latest.wind_speed, 0), unit: 'km/h', icon: 'wind', color: SENSOR_COLORS.wind_speed },
                  { label: 'Pluie', value: fmt(latest.rain_level, 1), unit: 'mm', icon: 'rain', color: SENSOR_COLORS.rain_level },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 10,
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color }}>
                      {value}
                      <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyse des risques Section */}
            <div>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '.5px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Icon name="alerts" size={12} color="var(--text-muted)" />
                ANALYSE DES RISQUES
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Inondation', value: latest?.flood_risk ?? 0, color: '#3b82f6', icon: 'water' },
                  { label: 'Tempête', value: latest?.storm_risk ?? 0, color: '#f59e0b', icon: 'storm' },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} style={{
                    background: `${color}08`,
                    borderRadius: 10,
                    padding: '12px',
                    border: `1px solid ${color}30`,
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                    <div style={{ height: 6, background: `${color}20`, borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{
                        height: '100%',
                        width: `${value}%`,
                        background: color,
                        borderRadius: 99,
                        transition: 'width .3s ease',
                      }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color }}>
                      {Math.round(value)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Métadonnées Section */}
            <div style={{
              background: 'var(--bg-elevated)',
              borderRadius: 10,
              padding: '12px',
              border: '1px solid var(--border-subtle)',
              fontSize: 9,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}>
              <div style={{ marginBottom: 4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Dernière mesure:</strong>
                <div style={{ marginTop: 2 }}>{timeAgo(latest.timestamp)}</div>
              </div>
              {node.firmware_version && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Firmware:</strong>
                  <div style={{ marginTop: 2, fontFamily: 'var(--font-mono)' }}>{node.firmware_version}</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 10,
            padding: '20px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 12,
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ marginBottom: 8 }}>⚠️</div>
            Aucune donnée capteur disponible
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 0 0',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        gap: 10,
      }}>
        <button
          onClick={() => onEdit(node)}
          style={{
            flex: 1,
            padding: '12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'opacity .15s',
          }}
          onMouseOver={(e) => e.target.style.opacity = '0.9'}
          onMouseOut={(e) => e.target.style.opacity = '1'}
        >
          <SquarePen size={14} /> Modifier
        </button>
        <button
          onClick={() => onDelete(node)}
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(239,68,68,.08)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all .15s',
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(239,68,68,.15)';
            e.target.style.borderColor = 'rgba(239,68,68,.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(239,68,68,.08)';
            e.target.style.borderColor = 'rgba(239,68,68,.25)';
          }}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

function StationListCard({ node, latest, selected, onSelect, onEdit, onDelete }) {
  const overallRisk = latest?.overall_risk ?? computeOverallRisk(latest);
  const rl = riskLevel(overallRisk);

  return (
    <div
      className="node-card"
      onClick={() => onSelect(node.id)}
      style={{
        cursor: 'pointer',
        border: selected ? `1px solid ${rl.color}` : undefined,
        boxShadow: selected ? `0 0 0 1px ${rl.color}40` : undefined,
      }}
    >
      <div className="node-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <LiveDot active={node.status === 'online'} />
            <div className="node-card-name truncate">{node.name}</div>
            <span className={`badge ${node.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
              {node.status === 'online' ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          {node.location && (
            <div className="node-card-location">
              <Icon name="node" size={11} color="var(--text-muted)" /> {node.location}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{node.id}</div>
        </div>
        <div className="node-card-actions">
          <button
            className="btn-icon btn-xl"
            title="Modifier"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
          >
            <SquarePen size={14} />
          </button>
          <button
            className="btn-icon btn-xl"
            title="Supprimer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
            style={{ color: 'var(--risk-high)' }}
          >
            <Icon name="delete" size={14} />
          </button>
        </div>
      </div>

      {latest ? (
        <div className="node-metrics">
          <div className="node-metric">
            <div className="node-metric-val" style={{ color: '#f97316' }}>{fmt(latest.temperature)}°</div>
            <div className="node-metric-lbl">Temp</div>
          </div>
          <div className="node-metric">
            <div className="node-metric-val" style={{ color: '#3b82f6' }}>{fmt(latest.humidity)}%</div>
            <div className="node-metric-lbl">Hum</div>
          </div>
          <div className="node-metric">
            <div className="node-metric-val">{latest.pressure != null ? Math.round(latest.pressure) : '—'}</div>
            <div className="node-metric-lbl">hPa</div>
          </div>
          <div className="node-metric">
            <div className="node-metric-val">{fmt(latest.wind_speed, 0)}</div>
            <div className="node-metric-lbl">km/h</div>
          </div>
          <div className="node-metric">
            <div className="node-metric-val">{fmt(latest.rain_level)}</div>
            <div className="node-metric-lbl">mm</div>
          </div>
          <div className="node-metric">
            <div className="node-metric-val" style={{ color: rl.color }}>{Math.round(overallRisk)}%</div>
            <div className="node-metric-lbl">Risque</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
          Aucune donnée capteur
        </div>
      )}
    </div>
  );
}

// ─── Main Integrated Map Page ──────────────────────────────────────────────────
export default function MapPage({ nodes = [], latestByNode = {}, onNodeChange, onNav }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [deleteNode, setDeleteNode] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add node data and latest to nodes
  const nodesWithLatest = useMemo(
    () => nodes.map((n) => ({ ...n, latest: latestByNode[n.id] || null })),
    [nodes, latestByNode]
  );

  // Extract unique regions
  const regions = useMemo(
    () => [...new Set(nodes.map((n) => n.region).filter(Boolean))].sort(),
    [nodes]
  );

  // Filter nodes based on search, region, status
  const filteredNodes = useMemo(() => {
    const normalizeText = (value) => String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const q = normalizeText(searchQuery.trim());
    return nodesWithLatest.filter((n) => {
      if (q) {
        const haystack = [n.name, n.id, n.location, n.region]
          .filter(Boolean)
          .join(' ')
          ;
        const normalizedHaystack = normalizeText(haystack);
        if (!normalizedHaystack.includes(q)) return false;
      }

      if (selectedRegion) {
        const region = normalizeText(n.region);
        const selected = normalizeText(selectedRegion);
        if (region !== selected) return false;
      }

      const status = String(n.status || '').toLowerCase();
      if (statusFilter === 'online' && status !== 'online') return false;
      if (statusFilter === 'offline' && status !== 'offline') return false;

      return true;
    });
  }, [nodesWithLatest, searchQuery, selectedRegion, statusFilter]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const stillVisible = filteredNodes.some((n) => n.id === selectedNodeId);
    if (!stillVisible) setSelectedNodeId(null);
  }, [filteredNodes, selectedNodeId]);

  // Get nodes with GPS for map
  const mapNodes = useMemo(
    () => filteredNodes.filter((n) => n.latitude && n.longitude),
    [filteredNodes]
  );

  // Compute map center
  const { center, zoom } = useMemo(() => {
    if (!mapNodes.length) return { center: [5.35, -4.0], zoom: 9 };
    const lats = mapNodes.map((n) => parseFloat(n.latitude));
    const lngs = mapNodes.map((n) => parseFloat(n.longitude));
    const cLat  = lats.reduce((a, b) => a + b, 0) / lats.length;
    const cLng  = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    const spread = Math.max(
      Math.max(...lats) - Math.min(...lats),
      Math.max(...lngs) - Math.min(...lngs)
    );
    const z = spread < 0.02 ? 15
            : spread < 0.05 ? 14
            : spread < 0.15 ? 13
            : spread < 0.4  ? 12
            : spread < 1    ? 11
            : spread < 3    ? 10 : 8;
    return { center: [cLat, cLng], zoom: z };
  }, [mapNodes]);

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const tileAttrib = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const selectedNode = nodesWithLatest.find((n) => n.id === selectedNodeId);

  const handleEdit = (node) => {
    setEditNode(node);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditNode(null);
    setShowForm(true);
  };

  const handleDelete = (node) => {
    setDeleteNode(node);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditNode(null);
    onNodeChange?.();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteNode) return;
    setDeleteLoading(true);
    try {
      await fetchApi(`/nodes/${deleteNode.id}`, { method: 'DELETE' });
      if (selectedNodeId === deleteNode.id) setSelectedNodeId(null);
      setDeleteNode(null);
      onNodeChange?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!nodes.length) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Carte IoT</div>
            <div className="page-subtitle">Gestion géographique des stations réseau</div>
          </div>
        </div>
        <div className="section">
          <div className="card">
            <div className="empty-state">
              <Icon name="stations" size={36} className="empty-state-icon" />
              <div className="empty-state-title">Aucune station</div>
              <div className="empty-state-text">
                Créez votre première station IoT pour commencer.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Carte IoT</div>
          <div className="page-subtitle">
            {mapNodes.length} station{mapNodes.length !== 1 ? 's' : ''} avec GPS · Gestion intégrée réseau
          </div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>
            <Icon name="add" size={14} /> Nouvelle station
          </button>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Filtres</span>
          </div>
          <SidebarFilters
            regions={regions}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onReset={() => {
              setSearchQuery('');
              setSelectedRegion('');
              setStatusFilter('all');
            }}
          />
        </div>
      </div>

      <div className="section">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '16px 20px 0', marginBottom: 12 }}>
            <span className="card-title">Carte interactive</span>
          </div>
          {mapNodes.length ? (
            <div style={{ height: '520px', minHeight: 360 }}>
              <MapContainer
                key={isDark ? 'dark' : 'light'}
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer url={tileUrl} attribution={tileAttrib} />
                {mapNodes.map((node) => {
                  const lat = parseFloat(node.latitude);
                  const lng = parseFloat(node.longitude);
                  const risk = riskLevel(node.latest?.overall_risk ?? 0);
                  const radius = 10 + ((node.latest?.overall_risk ?? 0) / 100) * 12;

                  return (
                    <CircleMarker
                      key={node.id}
                      center={[lat, lng]}
                      radius={radius}
                      pathOptions={{
                        fillColor: risk.color,
                        fillOpacity: node.status === 'online' ? 0.85 : 0.4,
                        color: selectedNodeId === node.id ? '#fff' : 'rgba(255,255,255,0.8)',
                        weight: selectedNodeId === node.id ? 3 : 2,
                        opacity: 1,
                      }}
                      eventHandlers={{
                        click: () => setSelectedNodeId(node.id),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -radius - 2]} opacity={0.95}>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)' }}>
                          <strong>{node.name}</strong>
                          {node.latest?.temperature != null && (
                            <span style={{ marginLeft: 8, color: '#f97316', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {fmt(node.latest.temperature)}°C
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          ) : (
            <div style={{
              minHeight: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              textAlign: 'center',
              paddingBottom: 20,
            }}>
              <div>
                <Icon name="stations" size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                <div>Aucune station avec GPS</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Details station</span>
          </div>
          <StationDetailPanel
            node={selectedNode}
            latest={selectedNode?.latest}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Stations du reseau</span>
            <span className="badge badge-blue">{filteredNodes.length} visible{filteredNodes.length > 1 ? 's' : ''}</span>
          </div>

          {filteredNodes.length === 0 ? (
            <div className="empty-state" style={{ padding: '10px 0 0' }}>
              <Icon name="stations" size={36} className="empty-state-icon" />
              <div className="empty-state-title">Aucune station filtrée</div>
              <div className="empty-state-text">Ajustez les filtres pour afficher des stations.</div>
            </div>
          ) : (
            <div className="grid-2">
              {filteredNodes.map((node) => (
                <StationListCard
                  key={node.id}
                  node={node}
                  latest={node.latest}
                  selected={selectedNodeId === node.id}
                  onSelect={setSelectedNodeId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Connecter un capteur physique (ESP32 / Raspberry Pi)</span>
            <span className="badge badge-blue">API REST · MQTT</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                1. Enregistrer le capteur
              </div>
              <pre style={{
                background: 'var(--bg-page)', border: '1px solid var(--border-subtle)',
                borderRadius: 8, padding: '10px 14px', fontSize: 11.5,
                fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                overflow: 'auto', lineHeight: 1.7,
              }}>
{`POST /api/sensors/register
{
  "node_id": "node-005",
  "name":    "Ma station",
  "location":"Site A"
}`}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                2. Envoyer des mesures
              </div>
              <pre style={{
                background: 'var(--bg-page)', border: '1px solid var(--border-subtle)',
                borderRadius: 8, padding: '10px 14px', fontSize: 11.5,
                fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                overflow: 'auto', lineHeight: 1.7,
              }}>
{`POST /api/sensors/data
{
  "node_id":     "node-005",
  "temperature": 22.5,
  "humidity":    58.0,
  "pressure":    1013.2
}`}
              </pre>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                3. MQTT (optionnel)
              </div>
              <pre style={{
                background: 'var(--bg-page)', border: '1px solid var(--border-subtle)',
                borderRadius: 8, padding: '10px 14px', fontSize: 11.5,
                fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                overflow: 'auto', lineHeight: 1.7,
              }}>
{`Topic: meteo/node-005/data
Payload: {
  "temperature": 22.5,
  "humidity": 58.0
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <NodeFormModal node={editNode} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
      {deleteNode && (
        <ConfirmDialog
          title="Supprimer la station"
          message={`Supprimer "${deleteNode.name}" ? Toutes les données associées seront définitivement supprimées.`}
          confirmLabel="Supprimer"
          danger
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteNode(null)}
        />
      )}
    </div>
  );
}
