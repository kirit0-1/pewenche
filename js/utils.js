export function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  t.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl z-[9999] fade-in';
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
