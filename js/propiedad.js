import { BADGE, CONTACT, FALLBACK_IMAGE } from './config.js';
import { resolvePublicContact } from './contact-public.js';
import { LocalPropertyStore } from './storage.js';
import { ApiPropertyStore } from './api-store.js';
import { SupabasePropertyStore } from './supabase-store.js';
import { isSupabaseConfigured } from './supabase-client.js';
import { detectApi } from './api.js';
import { trackClick, saveLead } from './analytics.js';
import { toast } from './utils.js';
import { fetchUF, getUF, getUFDate, onUFChange, formatPropertyPrice } from './uf.js';
import { h, mapsUrl, waLink, mapEmbedUrl } from './utils.js';

let store = new LocalPropertyStore();
const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

let property = null;

function forceLightTheme() {
  document.documentElement.classList.remove('dark');
  try { localStorage.removeItem('theme'); } catch { /* ignore */ }
}

function updatePrices() {
  if (!property) return;
  const price = formatPropertyPrice(property);
  const primary = document.getElementById('priceUF');
  const secondary = document.getElementById('priceCLP');
  primary.className = price.showUF ? 'price-uf' : 'price-clp';
  primary.textContent = price.primary;
  secondary.textContent = price.secondary || '';
  secondary.classList.toggle('hidden', !price.secondary);

  const uf = getUF();
  const date = getUFDate();
  const tip = document.getElementById('ufIndicator');
  if (!tip) return;
  if (String(property.tipo || '').toLowerCase() === 'arriendo') {
    tip.textContent = uf
      ? `Precio en pesos · UF referencial $${uf.toLocaleString('es-CL')}`
      : 'Precio en pesos chilenos';
  } else if (uf) {
    tip.textContent = `CLP calculado con UF $${uf.toLocaleString('es-CL')}${date ? ` · ${date.split('T')[0]}` : ''}`;
  }
}

function renderContacts() {
  const c = resolvePublicContact(CONTACT);
  const links = [
    { href: waLink(c.whatsapp, `Hola, me interesa: ${property.titulo}`), iconClass: 'fa-brands fa-whatsapp', color: 'bg-[#25D366]', label: 'WhatsApp', sub: c.whatsappDisplay },
    { href: `mailto:${c.email}?subject=${encodeURIComponent('Consulta: ' + property.titulo)}`, iconClass: 'fa-solid fa-envelope', color: 'bg-verde-700', label: 'Correo', sub: c.email },
    { href: c.instagram, iconClass: 'fa-brands fa-instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500', label: 'Instagram', sub: c.instagramHandle, external: true },
    { href: c.facebook, iconClass: 'fa-brands fa-facebook-f', color: 'bg-[#1877F2]', label: 'Facebook', sub: 'Facebook', external: true },
    { href: `tel:+${c.whatsapp}`, iconClass: 'fa-solid fa-phone', color: 'bg-zinc-700', label: 'Llamar', sub: c.whatsappDisplay },
  ];

  document.getElementById('contactLinks').innerHTML = links.map(l => `
    <a href="${l.href}" ${l.external ? 'target="_blank" rel="noopener"' : ''}
       class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition">
      <span class="w-10 h-10 ${l.color} rounded-xl flex items-center justify-center text-white shrink-0">
        <i class="${l.iconClass}"></i>
      </span>
      <span>
        <span class="font-semibold text-sm block">${l.label}</span>
        <span class="text-xs text-gray-500">${h(l.sub)}</span>
      </span>
    </a>`).join('');
}

function renderProperty(p) {
  property = p;
  trackClick(p.id);
  document.title = `${p.titulo} — Pewenche`;

  const badge = BADGE[p.tipo] || { cls: 'bg-gray-600', label: p.tipo };
  document.getElementById('badge').className = `text-xs font-bold px-3 py-1 rounded-full text-white uppercase ${badge.cls}`;
  document.getElementById('badge').textContent = badge.label;
  document.getElementById('title').textContent = p.titulo;
  document.getElementById('location').innerHTML =
    `<i class="fa-solid fa-location-dot text-verde-700"></i> ${h(p.direccion || p.comuna)}${p.region ? ', ' + h(p.region) : ''}`;

  const imgs = p.imagenes?.length ? p.imagenes : [FALLBACK_IMAGE];
  document.getElementById('gallery').innerHTML = imgs.map((url, i) => `
    <div class="${i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''} relative overflow-hidden bg-[#faf8ef] aspect-[4/3] sm:aspect-auto" style="min-height:${i === 0 ? '280px' : '140px'}">
      <img src="${h(url)}" alt="${h(p.titulo)}" class="w-full h-full object-cover absolute inset-0 sm:static" loading="${i < 2 ? 'eager' : 'lazy'}"
        onerror="this.src='${FALLBACK_IMAGE}'" />
    </div>`).join('');

  const statDefs = [
    { icon: 'fa-ruler-combined', label: 'Superficie', val: p.superficie ? `${p.superficie} m²` : null },
    { icon: 'fa-bed', label: 'Dormitorios', val: p.dorms || null },
    { icon: 'fa-shower', label: 'Baños', val: p.banos || null },
    { icon: 'fa-car', label: 'Estacionamientos', val: p.estac || null },
  ].filter(s => s.val);

  document.getElementById('stats').innerHTML = statDefs.map(s => `
    <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
      <i class="fa-solid ${s.icon} text-verde-700 text-lg mb-1 block"></i>
      <span class="font-bold block">${s.val}</span>
      <span class="text-xs text-gray-500">${s.label}</span>
    </div>`).join('');

  document.getElementById('descShort').textContent = p.desc || '';
  const longParas = (p.descLarga || '').split('\n').filter(Boolean);
  document.getElementById('descLong').innerHTML = longParas.map(t => `<p>${h(t)}</p>`).join('');

  document.getElementById('extrasSection').innerHTML = p.extras?.length ? `
    <h2 class="text-lg font-bold mb-3">Características</h2>
    <div class="flex flex-wrap gap-2">
      ${p.extras.map(e => `<span class="bg-verde-50 text-verde-700 text-xs font-medium px-3 py-1.5 rounded-full">${h(e)}</span>`).join('')}
    </div>` : '';

  const mapUrl = mapsUrl(p);
  document.getElementById('mapLink').href = mapUrl;
  document.getElementById('mapFrame').src = mapEmbedUrl(p);

  updatePrices();
  renderContacts();

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('content').classList.remove('hidden');
}

document.getElementById('leadForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!property) {
    toast('Espera a que cargue la propiedad.');
    return;
  }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await saveLead({
      propertyId: property.id,
      propertyTitle: property.titulo,
      email: document.getElementById('leadEmail').value,
      mensaje: document.getElementById('leadMensaje').value,
      website: document.getElementById('leadWebsite')?.value || '',
    });
    document.getElementById('leadForm').classList.add('hidden');
    document.getElementById('leadSuccess').classList.remove('hidden');
  } catch (err) {
    toast(err.message || 'No se pudo enviar. Intenta de nuevo.');
    btn.disabled = false;
  }
});

async function init() {
  forceLightTheme();
  if (isSupabaseConfigured()) store = new SupabasePropertyStore();
  else if (await detectApi()) store = new ApiPropertyStore();
  await fetchUF();
  onUFChange(updatePrices);

  if (!propertyId) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notFound').classList.remove('hidden');
    return;
  }

  let properties = [];
  try {
    properties = await store.getAll();
  } catch (err) {
    console.error(err);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notFound').classList.remove('hidden');
    toast('Error al cargar la propiedad.');
    return;
  }
  const p = properties.find(x => x.id === propertyId);
  if (!p) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notFound').classList.remove('hidden');
    return;
  }
  renderProperty(p);
}

init();
