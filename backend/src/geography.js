const fs = require('fs');
const path = require('path');

const GEO_FILE = path.resolve(__dirname, 'data', 'ci-geography.json');

const FALLBACK = {
  country: "Côte d'Ivoire",
  source: 'fallback-local',
  generatedAt: null,
  totalRegions: 10,
  totalCities: 38,
  regions: [
    { name: 'Lagunes', zone: 'Sud', order: 1, cityCount: 4, cities: ['Abidjan', 'Anyama', 'Bingerville', 'Grand-Bassam'] },
    { name: 'Bas-Sassandra', zone: 'Sud-Ouest', order: 2, cityCount: 4, cities: ['San-Pedro', 'Sassandra', 'Soubre', 'Tabou'] },
    { name: 'Sassandra-Marahoué', zone: 'Centre-Ouest', order: 3, cityCount: 4, cities: ['Bouaflé', 'Daloa', 'Gagnoa', 'Issia'] },
    { name: 'Vallée du Bandama', zone: 'Centre-Nord', order: 4, cityCount: 4, cities: ['Bouaké', 'Dabakala', 'Katiola', 'Sakassou'] },
    { name: 'Lacs', zone: 'Centre', order: 5, cityCount: 4, cities: ['Dimbokro', 'Tiébissou', 'Toumodi', 'Yamoussoukro'] },
    { name: 'Comoé', zone: 'Est', order: 6, cityCount: 4, cities: ['Abengourou', 'Aboisso', 'Agnibilékrou', 'Bonoua'] },
    { name: 'Montagnes', zone: 'Ouest', order: 7, cityCount: 4, cities: ['Biankouma', 'Danané', 'Man', 'Touba'] },
    { name: 'Zanzan', zone: 'Nord-Est', order: 8, cityCount: 3, cities: ['Bondoukou', 'Bouna', 'Tanda'] },
    { name: 'Savanes', zone: 'Nord', order: 9, cityCount: 4, cities: ['Boundiali', 'Ferkéssédougou', 'Korhogo', 'Tengréla'] },
    { name: 'Denguélé', zone: 'Nord-Ouest', order: 10, cityCount: 3, cities: ['Madinani', 'Minignan', 'Odienné'] },
  ],
};

let cached = null;

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function sortedUnique(arr = []) {
  return [...new Set(arr.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

function loadGeography() {
  if (cached) return cached;

  try {
    const raw = fs.readFileSync(GEO_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const regions = Array.isArray(parsed?.regions) ? parsed.regions : [];

    const sanitizedRegions = regions
      .map((r, idx) => {
        const cities = sortedUnique(r.cities || []);
        return {
          name: String(r.name || '').trim(),
          zone: String(r.zone || '').trim() || null,
          order: Number.isFinite(Number(r.order)) ? Number(r.order) : idx + 1,
          cityCount: cities.length,
          cities,
        };
      })
      .filter((r) => r.name && r.cities.length > 0)
      .sort((a, b) => a.order - b.order);

    cached = {
      country: parsed?.country || FALLBACK.country,
      source: parsed?.source || 'file-local',
      generatedAt: parsed?.generatedAt || null,
      totalRegions: sanitizedRegions.length,
      totalCities: sanitizedRegions.reduce((sum, r) => sum + r.cityCount, 0),
      regions: sanitizedRegions,
    };

    return cached;
  } catch {
    cached = FALLBACK;
    return cached;
  }
}

function getCiGeography() {
  return loadGeography();
}

function listCiRegions() {
  return loadGeography().regions.map((r) => r.name);
}

function listCitiesForRegion(regionName) {
  const target = normalize(regionName);
  if (!target) return [];

  const region = loadGeography().regions.find((r) => normalize(r.name) === target);
  return region ? region.cities : [];
}

module.exports = {
  getCiGeography,
  listCiRegions,
  listCitiesForRegion,
};
