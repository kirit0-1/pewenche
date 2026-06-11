/**
 * Valor UF en tiempo real — API pública mindicador.cl
 */
const UF_API = 'https://mindicador.cl/api/uf';
const REFRESH_MS = 5 * 60 * 1000;

let ufValue = null;
let ufDate = null;
let listeners = new Set();

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

export async function fetchUF() {
  try {
    const res = await fetch(UF_API);
    if (!res.ok) throw new Error('UF fetch failed');
    const data = await res.json();
    const latest = data.serie?.[0];
    if (!latest?.valor) throw new Error('UF sin datos');
    ufValue = latest.valor;
    ufDate = latest.fecha;
    notify();
    return ufValue;
  } catch {
    return ufValue;
  }
}

export function startUFService() {
  fetchUF();
  setInterval(fetchUF, REFRESH_MS);
}

export function clpFromUF(ufAmount, nota = '') {
  if (!ufValue || !ufAmount) return null;
  const clp = Math.round(ufAmount * ufValue);
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(clp);
  return nota ? `${formatted}${nota}` : formatted;
}
