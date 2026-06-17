/**
 * Analytics y leads — Supabase > API Node > localStorage.
 */
import { isSupabaseConfigured, getSupabase } from './supabase-client.js';
import { hasApi, api, detectApi } from './api.js';

const CLICKS_KEY = 'pewenche_clicks';
const LEADS_KEY = 'pewenche_leads';
const LEADS_PING_KEY = 'pewenche_leads_ping';

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

function notifyLeadsChanged() {
  localStorage.setItem(LEADS_PING_KEY, String(Date.now()));
  window.dispatchEvent(new CustomEvent('pewenche-data-change', { detail: { key: 'leads' } }));
}

function saveLeadLocal(payload) {
  const leads = read(LEADS_KEY, []);
  const lead = {
    id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    propertyId: payload.propertyId,
    propertyTitle: payload.propertyTitle,
    nombre: payload.nombre.trim(),
    email: payload.email.trim(),
    mensaje: (payload.mensaje || '').trim(),
    at: Date.now(),
    contacted: false,
  };
  leads.unshift(lead);
  write(LEADS_KEY, leads);
  notifyLeadsChanged();
  return lead;
}

export async function trackClick(propertyId) {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    await sb.from('clicks').insert({ property_id: propertyId });
    window.dispatchEvent(new CustomEvent('pewenche-data-change', { detail: { key: 'clicks' } }));
    return;
  }
  await detectApi(true);
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
  const start = weekStart();
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data } = await sb.from('clicks').select('property_id, created_at').gte('created_at', new Date(start).toISOString());
    return (data || []).map(c => ({ propertyId: c.property_id, at: new Date(c.created_at).getTime() }));
  }
  await detectApi(true);
  if (hasApi()) {
    const data = await api('/api/analytics/weekly');
    return data.clicks || [];
  }
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
  const clicks = await getClicks();
  return clicks.length;
}

export async function saveLead(payload) {
  if (!payload.nombre?.trim() || !payload.email?.trim()) {
    throw new Error('Nombre y correo son obligatorios.');
  }

  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const lead = {
      id: 'l' + Date.now().toString(36),
      property_id: payload.propertyId,
      property_title: payload.propertyTitle,
      nombre: payload.nombre.trim(),
      email: payload.email.trim(),
      mensaje: (payload.mensaje || '').trim(),
      contacted: false,
    };
    const { error } = await sb.from('leads').insert(lead);
    if (error) throw new Error(error.message);
    notifyLeadsChanged();
    return { ...lead, propertyId: lead.property_id, propertyTitle: lead.property_title, at: Date.now() };
  }

  await detectApi(true);
  if (hasApi()) {
    try {
      const lead = await api('/api/leads', { method: 'POST', body: payload });
      notifyLeadsChanged();
      return lead;
    } catch (err) {
      console.warn('API leads falló, guardando local:', err.message);
    }
  }
  return saveLeadLocal(payload);
}

function mapLead(row) {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    nombre: row.nombre,
    email: row.email,
    mensaje: row.mensaje,
    contacted: row.contacted,
    at: new Date(row.created_at || row.at).getTime(),
  };
}

export async function getLeads() {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data, error } = await sb.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return read(LEADS_KEY, []);
    return (data || []).map(mapLead);
  }

  await detectApi(true);
  const local = read(LEADS_KEY, []);
  if (!hasApi()) return local;
  try {
    const remote = await api('/api/leads', { auth: true });
    const byId = new Map();
    [...remote, ...local].forEach(l => byId.set(l.id, l));
    return [...byId.values()].sort((a, b) => b.at - a.at);
  } catch {
    return local;
  }
}

export async function markLeadContacted(id) {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    await sb.from('leads').update({ contacted: true }).eq('id', id);
    notifyLeadsChanged();
    return getLeads();
  }
  await detectApi(true);
  if (hasApi()) {
    try {
      await api(`/api/leads/${id}`, { method: 'PATCH', body: { contacted: true }, auth: true });
      notifyLeadsChanged();
      return getLeads();
    } catch { /* fallback */ }
  }
  const leads = read(LEADS_KEY, []);
  const lead = leads.find(l => l.id === id);
  if (lead) lead.contacted = true;
  write(LEADS_KEY, leads);
  notifyLeadsChanged();
  return leads;
}

export function onDataChange(fn) {
  const handler = e => fn(e.detail?.key);
  window.addEventListener('pewenche-data-change', handler);
  window.addEventListener('storage', e => {
    if ([CLICKS_KEY, LEADS_KEY, LEADS_PING_KEY, 'pewenche_props'].includes(e.key)) fn(e.key);
  });
  return () => window.removeEventListener('pewenche-data-change', handler);
}
