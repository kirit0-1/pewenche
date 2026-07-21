export function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Solo URLs http(s) — evita javascript: y XSS en atributos src/href */
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  if (!/^https?:\/\//i.test(t)) return '';
  try {
    const u = new URL(t);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.href;
  } catch {
    return '';
  }
}

export function isValidEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (e.length > 254) return false;
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e);
}

/** Límites de formularios públicos */
export const LEAD_LIMITS = {
  email: 254,
  mensaje: 1000,
  nombre: 120,
};

/** Texto seguro para guardar: sin HTML ni caracteres de control */
export function sanitizeLeadText(str, maxLen = 1000) {
  return String(str ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeLeadEmail(email) {
  return String(email || '').trim().toLowerCase().slice(0, LEAD_LIMITS.email);
}

export function filterImageUrls(urls) {
  return (urls || []).map(u => safeUrl(u)).filter(Boolean);
}

export function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

export function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

export function genId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl z-[9999] fade-in';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function mapsUrl(propOrComuna, region) {
  const p = typeof propOrComuna === 'object' ? propOrComuna : null;
  if (p?.lat && p?.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  const comuna = p ? p.comuna : propOrComuna;
  const reg = p ? p.region : region;
  const addr = p?.direccion ? `${p.direccion}, ` : '';
  const q = encodeURIComponent(`${addr}${comuna || ''}, ${reg || ''}, Chile`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function mapEmbedUrl(prop) {
  if (prop?.lat && prop?.lng) {
    return `https://maps.google.com/maps?q=${prop.lat},${prop.lng}&z=15&output=embed`;
  }
  const addr = prop?.direccion ? `${prop.direccion}, ` : '';
  const q = encodeURIComponent(`${addr}${prop?.comuna || ''}, ${prop?.region || ''}, Chile`);
  return `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

export function waLink(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function sortProperties(list, sortBy) {
  const copy = [...list];
  switch (sortBy) {
    case 'price-asc':
      return copy.sort((a, b) => (a.precioUF || 0) - (b.precioUF || 0));
    case 'price-desc':
      return copy.sort((a, b) => (b.precioUF || 0) - (a.precioUF || 0));
    case 'title-asc':
      return copy.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    default:
      return copy;
  }
}

export function filterBySearch(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(p =>
    [p.titulo, p.comuna, p.region, p.desc, ...(p.extras || [])]
      .some(field => String(field).toLowerCase().includes(q))
  );
}
