/**
 * Analytics y leads — API Node o localStorage.
 */
import { hasApi, api } from './api.js';

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

export async function trackClick(propertyId) {
  if (hasApi()) {
    await api('/api/analytics/click', { method: 'POST', body: { propertyId } }).catch(() => {});
    window.dispatchEvent(new CustomEvent('pewenche-data-change', { detail: { key: 'clicks' } }));
    return;
  }
  const clicks = read(CLICKS_KEY, []);
  clicks.push({ propertyId, at: Date.now() });
  if (clicks.length > 5000) clicks.splice(0, clicks.length - 5000);
  write(CLICKS_KEY, clicks);
}

async function getClicks() {
  if (hasApi()) {
    const data = await api('/api/analytics/weekly');
    return data.clicks || [];
  }
  const start = weekStart();
  return read(CLICKS_KEY, []).filter(c => c.at >= start);
}

export async function getWeeklyClickStats(properties) {
  const clicks = await getClicks();
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

export async function getTotalWeeklyClicks() {
  if (hasApi()) {
    const data = await api('/api/analytics/weekly');
    return data.total || 0;
  }
  const start = weekStart();
  return read(CLICKS_KEY, []).filter(c => c.at >= start).length;
}

export async function saveLead(payload) {
  if (hasApi()) {
    const lead = await api('/api/leads', { method: 'POST', body: payload });
    window.dispatchEvent(new CustomEvent('pewenche-data-change', { detail: { key: 'leads' } }));
    return lead;
  }
  const leads = read(LEADS_KEY, []);
  const lead = {
    id: 'l' + Date.now().toString(36),
    ...payload,
    nombre: payload.nombre.trim(),
    email: payload.email.trim(),
    mensaje: (payload.mensaje || '').trim(),
    at: Date.now(),
    contacted: false,
  };
  leads.unshift(lead);
  write(LEADS_KEY, leads);
  return lead;
}

export async function getLeads() {
  if (hasApi()) {
    try {
      return await api('/api/leads', { auth: true });
    } catch {
      return [];
    }
  }
  return read(LEADS_KEY, []);
}

export async function markLeadContacted(id) {
  if (hasApi()) {
    const leads = await api(`/api/leads/${id}`, { method: 'PATCH', body: { contacted: true }, auth: true });
    window.dispatchEvent(new CustomEvent('pewenche-data-change', { detail: { key: 'leads' } }));
    return leads;
  }
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
    if ([CLICKS_KEY, LEADS_KEY, 'pewenche_props'].includes(e.key)) fn(e.key);
  });
  return () => window.removeEventListener('pewenche-data-change', handler);
}
