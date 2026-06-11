/**
 * Analytics local — clics y leads (migrar a Supabase en producción).
 */
const CLICKS_KEY = 'pewenche_clicks';
const LEADS_KEY = 'pewenche_leads';

function weekStart(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('pewenche-data-change', { detail: { key } }));
}

export function trackClick(propertyId) {
  const clicks = read(CLICKS_KEY, []);
  clicks.push({ propertyId, at: Date.now() });
  if (clicks.length > 5000) clicks.splice(0, clicks.length - 5000);
  write(CLICKS_KEY, clicks);
}

export function getWeeklyClickStats(properties) {
  const start = weekStart();
  const clicks = read(CLICKS_KEY, []).filter(c => c.at >= start);
  const counts = {};
  clicks.forEach(c => {
    counts[c.propertyId] = (counts[c.propertyId] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([id, count]) => {
      const p = properties.find(x => x.id === id);
      return { id, count, titulo: p?.titulo || id, tipo: p?.tipo };
    })
    .sort((a, b) => b.count - a.count);
}

export function getTotalWeeklyClicks() {
  const start = weekStart();
  return read(CLICKS_KEY, []).filter(c => c.at >= start).length;
}

export function saveLead({ propertyId, propertyTitle, nombre, email, mensaje }) {
  const leads = read(LEADS_KEY, []);
  const lead = {
    id: 'l' + Date.now().toString(36),
    propertyId,
    propertyTitle,
    nombre: nombre.trim(),
    email: email.trim(),
    mensaje: (mensaje || '').trim(),
    at: Date.now(),
    contacted: false,
  };
  leads.unshift(lead);
  write(LEADS_KEY, leads);
  return lead;
}

export function getLeads() {
  return read(LEADS_KEY, []);
}

export function markLeadContacted(id) {
  const leads = read(LEADS_KEY, []);
  const lead = leads.find(l => l.id === id);
  if (lead) lead.contacted = true;
  write(LEADS_KEY, leads);
  return leads;
}

export function onDataChange(fn) {
  const handler = e => fn(e.detail?.key);
  window.addEventListener('pewenche-data-change', handler);
  window.addEventListener('storage', e => {
    if (e.key === CLICKS_KEY || e.key === LEADS_KEY || e.key === 'pewenche_props') fn(e.key);
  });
  return () => window.removeEventListener('pewenche-data-change', handler);
}
