import { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../../utils/helpers';

const CUSTOM_CITY = '__custom_city__';

const FALLBACK_REGION_CITY_OPTIONS = {
  Lagunes: ['Abidjan', 'Bingerville', 'Grand-Bassam', 'Anyama'],
  'Bas-Sassandra': ['San-Pedro', 'Sassandra', 'Soubre', 'Tabou'],
  'Sassandra-Marahoué': ['Daloa', 'Issia', 'Gagnoa', 'Bouaflé'],
  'Vallée du Bandama': ['Bouaké', 'Katiola', 'Sakassou', 'Dabakala'],
  Lacs: ['Yamoussoukro', 'Toumodi', 'Dimbokro', 'Tiébissou'],
  Comoé: ['Abengourou', 'Agnibilékrou', 'Aboisso', 'Bonoua'],
  Montagnes: ['Man', 'Danané', 'Biankouma', 'Touba'],
  Zanzan: ['Bondoukou', 'Bouna', 'Tanda'],
  Savanes: ['Korhogo', 'Ferkéssédougou', 'Boundiali', 'Tengréla'],
  Denguélé: ['Odienné', 'Minignan', 'Madinani'],
};

const EMPTY = {
  node_id: '',
  name: '',
  region: '',
  city: '',
  city_custom: '',
  latitude: '',
  longitude: '',
  firmware_version: '',
};

function buildInitialForm(node, regionCityMap = FALLBACK_REGION_CITY_OPTIONS) {
  if (!node) return { ...EMPTY };

  const region = node.region || '';
  const city = node.location || '';
  const cityOptions = regionCityMap[region] || [];
  const isListedCity = !!city && cityOptions.includes(city);

  return {
    node_id: node.id || '',
    name: node.name || '',
    region,
    city: isListedCity ? city : city ? CUSTOM_CITY : '',
    city_custom: isListedCity ? '' : city,
    latitude: node.latitude != null ? String(node.latitude) : '',
    longitude: node.longitude != null ? String(node.longitude) : '',
    firmware_version: node.firmware_version || '',
  };
}

function uniqSorted(list = []) {
  return [...new Set(list.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export default function NodeFormModal({ node, onClose, onSaved }) {
  const isEdit = !!node?.id;
  const [regionCityMap, setRegionCityMap] = useState(FALLBACK_REGION_CITY_OPTIONS);
  const [orderedRegions, setOrderedRegions] = useState(Object.keys(FALLBACK_REGION_CITY_OPTIONS));
  const [form, setForm] = useState(buildInitialForm(node, FALLBACK_REGION_CITY_OPTIONS));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cityOptions = regionCityMap[form.region] || [];
  const cityValue = form.city === CUSTOM_CITY ? form.city_custom.trim() : form.city.trim();
  const regions = useMemo(
    () => uniqSorted([
      ...orderedRegions,
      ...Object.keys(regionCityMap),
      ...(form.region ? [form.region] : []),
    ]),
    [orderedRegions, regionCityMap, form.region]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadGeo() {
      setGeoLoading(true);
      setGeoMessage('');
      try {
        const res = await fetchApi('/geography/ci');
        const regionsFromApi = Array.isArray(res?.data?.regions) ? res.data.regions : [];

        if (cancelled) return;

        if (regionsFromApi.length) {
          const nextMap = { ...FALLBACK_REGION_CITY_OPTIONS };
          const ordered = [];

          regionsFromApi
            .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999))
            .forEach((r) => {
              const name = String(r.name || '').trim();
              if (!name) return;
              const cities = uniqSorted(r.cities || []);
              nextMap[name] = uniqSorted([...(nextMap[name] || []), ...cities]);
              ordered.push(name);
            });

          setRegionCityMap(nextMap);
          setOrderedRegions(uniqSorted(ordered));
          setGeoMessage(`Source backend: ${res?.data?.source || 'dataset local'} (${res?.data?.totalCities || 0} villes).`);
        } else {
          setGeoMessage('');
        }
      } catch {
        if (!cancelled) setGeoMessage('');
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    }

    loadGeo();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    if (!isEdit && !form.node_id.trim()) { setError('L\'identifiant est requis.'); return; }
    if (!form.region.trim()) { setError('La région est requise.'); return; }
    if (!cityValue) { setError('La ville est requise.'); return; }

    setLoading(true);
    try {
      if (isEdit) {
        await fetchApi(`/nodes/${node.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name,
            region: form.region,
            location: cityValue,
            latitude: form.latitude ? parseFloat(form.latitude) : undefined,
            longitude: form.longitude ? parseFloat(form.longitude) : undefined,
            firmware_version: form.firmware_version || undefined,
          }),
        });
      } else {
        await fetchApi('/sensors/register', {
          method: 'POST',
          body: JSON.stringify({
            node_id: form.node_id,
            name: form.name,
            region: form.region,
            location: cityValue,
            latitude: form.latitude ? parseFloat(form.latitude) : undefined,
            longitude: form.longitude ? parseFloat(form.longitude) : undefined,
          }),
        });
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Modifier la station' : 'Nouvelle station'}</span>
          <button className="btn-icon" onClick={onClose} style={{ width: 28, height: 28 }}>✕</button>
        </div>

        <div className="modal-body">
          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Identifiant *</label>
              <input className="form-input" placeholder="ex: node-004" value={form.node_id} onChange={set('node_id')} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nom *</label>
            <input className="form-input" placeholder="ex: Station Delta" value={form.name} onChange={set('name')} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Région *</label>
              <select
                className="form-input"
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value, city: '', city_custom: '' }))}
              >
                <option value="">Sélectionner une région</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ville *</label>
              <select className="form-input" value={form.city} onChange={set('city')} disabled={!form.region}>
                <option value="">Sélectionner une ville</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={CUSTOM_CITY}>Autre (saisie manuelle)</option>
              </select>
              {(geoLoading || geoMessage) && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  {geoLoading ? 'Chargement des régions/villes depuis le backend...' : geoMessage}
                </div>
              )}
            </div>
          </div>

          {form.city === CUSTOM_CITY && (
            <div className="form-group">
              <label className="form-label">Nom de la ville</label>
              <input className="form-input" placeholder="Saisir la ville" value={form.city_custom} onChange={set('city_custom')} />
            </div>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input className="form-input" type="number" placeholder="48.8566" value={form.latitude} onChange={set('latitude')} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-input" type="number" placeholder="2.3522" value={form.longitude} onChange={set('longitude')} />
            </div>
          </div>

          {isEdit && (
            <div className="form-group">
              <label className="form-label">Version firmware</label>
              <input className="form-input" placeholder="ex: 1.2.0" value={form.firmware_version} onChange={set('firmware_version')} />
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: 'var(--risk-high)', background: 'rgba(239,68,68,.1)', padding: '8px 12px', borderRadius: 8 }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sauvegarde...' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
