/**
 * Valor UF en tiempo real.
 * Fuentes: mindicador.cl → gael.cloud → caché local.
 */
const UF_SOURCES = [
  {
    url: 'https://mindicador.cl/api/uf',
    parse(data) {
      const latest = data?.serie?.[0];
      if (!latest?.valor) return null;
      return { valor: Number(latest.valor), fecha: latest.fecha || null };
    },
  },
  {
    url: 'https://api.gael.cloud/general/public/monedas/UF',
    parse(data) {
      const raw = String(data?.Valor || '').replace(/\./g, '').replace(',', '.');
      const valor = Number(raw);
      if (!valor) return null;
      return { valor, fecha: data?.Fecha || null };
    },
  },
];

const REFRESH_MS = 5 * 60 * 1000;
const CACHE_KEY = 'pewenche_uf_cache';

let ufValue = null;
let ufDate = null;
let listeners = new Set();

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const valor = Number(parsed?.valor);
    if (!valor) return null;
    return { valor, fecha: parsed.fecha || null };
  } catch {
    return null;
  }
}

function writeCache(valor, fecha) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ valor, fecha, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

function applyUF(valor, fecha) {
  ufValue = valor;
  ufDate = fecha;
  writeCache(valor, fecha);
  notify();
}

// Hidratar al cargar el módulo para no dejar precios en blanco
const cached = typeof localStorage !== 'undefined' ? readCache() : null;
if (cached) {
  ufValue = cached.valor;
  ufDate = cached.fecha;
}

export function getUF() {
  return ufValue;
}

export function getUFDate() {
  return ufDate;
}

export function onUFChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(ufValue, ufDate));
}

async function fetchFrom(source) {
  const res = await fetch(source.url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`UF ${res.status}`);
  const data = await res.json();
  const parsed = source.parse(data);
  if (!parsed?.valor) throw new Error('UF sin datos');
  return parsed;
}

export async function fetchUF() {
  for (const source of UF_SOURCES) {
    try {
      const { valor, fecha } = await fetchFrom(source);
      applyUF(valor, fecha);
      return ufValue;
    } catch {
      /* probar siguiente fuente */
    }
  }
  if (!ufValue) {
    const fallback = readCache();
    if (fallback) applyUF(fallback.valor, fallback.fecha);
  }
  return ufValue;
}

export function startUFService() {
  fetchUF();
  setInterval(fetchUF, REFRESH_MS);
}

export function formatCLP(amount, nota = '') {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount)));
  return nota ? `${formatted}${nota}` : formatted;
}

export function clpFromUF(ufAmount, nota = '') {
  if (!ufValue || !ufAmount) return null;
  return formatCLP(ufAmount * ufValue, nota);
}

/** Arriendos: solo pesos. Ventas/otros: UF principal + CLP secundario. */
export function formatPropertyPrice(p) {
  const tipo = String(p?.tipo || '').toLowerCase();
  const isArriendo = tipo === 'arriendo';
  const nota = p?.precioNota
    || (isArriendo ? '/mes' : '')
    || '';

  const storedCLP = String(p?.precioCLP || '').trim();
  const liveCLP = clpFromUF(p?.precioUF, nota);
  const clpText = liveCLP
    || (storedCLP
      ? (nota && !/(\/mes|\/noche)$/i.test(storedCLP) ? `${storedCLP}${nota}` : storedCLP)
      : '');

  if (isArriendo) {
    return {
      primary: clpText || 'Consultar',
      secondary: '',
      showUF: false,
      clp: clpText,
    };
  }

  const ufText = p?.precioUF
    ? `${Number(p.precioUF).toLocaleString('es-CL')} UF`
    : '';

  return {
    primary: ufText || clpText || '—',
    secondary: ufText ? clpText : '',
    showUF: Boolean(ufText),
    clp: clpText,
  };
}
