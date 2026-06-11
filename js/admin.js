import { BADGE } from './config.js';
import { getVal, genId, h, setVal, toast } from './utils.js';
import {
  getWeeklyClickStats, getTotalWeeklyClicks, getLeads, markLeadContacted, onDataChange,
} from './analytics.js';
import { clpFromUF } from './uf.js';

export function createAdmin(store, auth, state, app) {
  let activeTab = 'propiedades';

  function showPanel() {
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('adminPage').classList.remove('hidden');
    window.location.hash = '#/admin';
    switchTab('propiedades');
  }

  function hidePanel() {
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
    document.getElementById('adminPreviewWrap')?.classList.add('hidden');
    window.history.replaceState(null, '', window.location.pathname);
  }

  function goAdmin() {
    if (auth.isAuthenticated()) showPanel();
    else {
      document.getElementById('loginModal').classList.remove('hidden');
      setTimeout(() => document.getElementById('loginUser').focus(), 50);
    }
  }

  async function attemptLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    const err = document.getElementById('loginError');
    const result = await auth.login(u, p);
    if (result.ok) {
      err.classList.add('hidden');
      document.getElementById('loginModal').classList.add('hidden');
      document.getElementById('loginPass').value = '';
      showPanel();
    } else {
      err.textContent = result.error;
      err.classList.remove('hidden');
      document.getElementById('loginPass').value = '';
      document.getElementById('loginPass').focus();
    }
  }

  function logoutAdmin() {
    auth.logout();
    hidePanel();
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.classList.toggle('admin-tab-active', btn.dataset.adminTab === tab);
    });
    document.querySelectorAll('[data-admin-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.adminPanel !== tab);
    });

    if (tab === 'propiedades') { renderAdminTable(); updateAdminStats(); }
    if (tab === 'estadisticas') renderAnalytics();
    if (tab === 'leads') renderLeads();
    if (tab === 'sitio') showSitePreview();
  }

  function showSitePreview() {
    const wrap = document.getElementById('adminPreviewWrap');
    const frame = document.getElementById('adminPreviewFrame');
    if (!wrap || !frame) return;
    wrap.classList.remove('hidden');
    frame.src = 'index.html?_preview=1';
  }

  function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    if (!state.properties.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-12 text-gray-400 text-sm">No hay propiedades. ¡Agrega la primera!</td></tr>';
      return;
    }
    state.properties.forEach(p => {
      const badge = BADGE[p.tipo] || { cls: 'bg-gray-600', label: p.tipo };
      const clp = clpFromUF(p.precioUF, p.precioNota || '') || p.precioCLP || '';
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition';
      tr.innerHTML = `
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <img src="${(p.imagenes && p.imagenes[0]) || ''}" alt=""
              class="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-zinc-700"
              onerror="this.src='https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=100'" />
            <div>
              <p class="font-medium text-sm">${h(p.titulo)}</p>
              <p class="text-xs text-gray-400">${h(p.comuna || '')}${p.region ? ', ' + h(p.region) : ''}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 hidden sm:table-cell">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full text-white ${badge.cls}">${badge.label}</span>
        </td>
        <td class="px-4 py-3 hidden md:table-cell text-sm text-gray-500 dark:text-zinc-400">${h(p.region || '—')}</td>
        <td class="px-4 py-3 text-sm">
          <span class="font-semibold text-verde-700 dark:text-green-400">${p.precioUF ? p.precioUF.toLocaleString('es-CL') + ' UF' : '—'}</span>
          ${clp ? `<br><span class="text-xs text-gray-400">${h(clp)}</span>` : ''}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <a href="propiedad.html?id=${p.id}" target="_blank" rel="noopener"
            class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 mr-1">
            <i class="fa-solid fa-eye mr-1"></i>Ver
          </a>
          <button type="button" data-action="edit-prop" data-id="${p.id}"
            class="text-xs font-medium text-verde-700 dark:text-green-400 hover:underline px-2 py-1 rounded-lg hover:bg-verde-50 dark:hover:bg-verde-900/20 transition mr-1">
            <i class="fa-solid fa-pen-to-square mr-1"></i>Editar
          </button>
          <button type="button" data-action="delete-prop" data-id="${p.id}"
            class="text-xs font-medium text-red-500 hover:underline px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            <i class="fa-solid fa-trash mr-1"></i>Eliminar
          </button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function updateAdminStats() {
    document.getElementById('statTotal').textContent = state.properties.length;
    document.getElementById('statVenta').textContent = state.properties.filter(p => p.tipo === 'venta').length;
    document.getElementById('statArriendo').textContent = state.properties.filter(p => p.tipo === 'arriendo').length;
    document.getElementById('statHostal').textContent = state.properties.filter(p => ['hostal', 'camping'].includes(p.tipo)).length;
    const clicksEl = document.getElementById('statClicks');
    if (clicksEl) clicksEl.textContent = getTotalWeeklyClicks();
    const leadsEl = document.getElementById('statLeads');
    if (leadsEl) leadsEl.textContent = getLeads().filter(l => !l.contacted).length;
  }

  function renderAnalytics() {
    const stats = getWeeklyClickStats(state.properties);
    const container = document.getElementById('analyticsList');
    const total = document.getElementById('analyticsTotal');
    if (!container) return;
    total.textContent = getTotalWeeklyClicks();
    if (!stats.length) {
      container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Sin clics esta semana aún.</p>';
      return;
    }
    const max = stats[0].count;
    container.innerHTML = stats.map((s, i) => `
      <div class="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 ${i === 0 ? 'bg-verde-50 dark:bg-verde-900/20 border-verde-200 dark:border-verde-800' : ''}">
        <span class="w-8 h-8 rounded-full bg-verde-800 text-white text-sm font-bold flex items-center justify-center shrink-0">${i + 1}</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate">${h(s.titulo)}</p>
          <div class="mt-2 h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div class="h-full bg-verde-600 rounded-full" style="width:${Math.round((s.count / max) * 100)}%"></div>
          </div>
        </div>
        <span class="text-lg font-bold text-verde-700 dark:text-green-400 shrink-0">${s.count}</span>
      </div>`).join('');
  }

  function renderLeads() {
    const leads = getLeads();
    const container = document.getElementById('leadsList');
    if (!container) return;
    if (!leads.length) {
      container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">No hay consultas pendientes.</p>';
      return;
    }
    container.innerHTML = leads.map(l => `
      <div class="p-4 rounded-xl border border-gray-100 dark:border-zinc-700 ${l.contacted ? 'opacity-60' : 'bg-white dark:bg-zinc-800'}">
        <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div>
            <p class="font-semibold">${h(l.nombre)}</p>
            <p class="text-sm text-gray-400">${h(l.email)}</p>
          </div>
          <span class="text-xs text-gray-400">${new Date(l.at).toLocaleString('es-CL')}</span>
        </div>
        <p class="text-sm text-verde-700 dark:text-green-400 mb-1"><i class="fa-solid fa-house mr-1"></i>${h(l.propertyTitle)}</p>
        ${l.mensaje ? `<p class="text-sm text-gray-500 dark:text-zinc-400 mb-3">${h(l.mensaje)}</p>` : ''}
        <div class="flex gap-2 flex-wrap">
          <a href="mailto:${h(l.email)}?subject=${encodeURIComponent('Re: ' + l.propertyTitle)}&body=${encodeURIComponent('Hola ' + l.nombre + ',\n\nGracias por tu interés en ' + l.propertyTitle + '.\n\n')}"
             class="text-xs btn-verde px-3 py-1.5 inline-flex items-center gap-1">
            <i class="fa-solid fa-envelope"></i> Contactar
          </a>
          ${!l.contacted ? `<button type="button" data-action="mark-contacted" data-id="${l.id}"
            class="text-xs px-3 py-1.5 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700">
            Marcar contactado
          </button>` : '<span class="text-xs text-gray-400"><i class="fa-solid fa-check mr-1"></i>Contactado</span>'}
        </div>
      </div>`).join('');
  }

  function openPropertyForm(id) {
    document.getElementById('formModalTitle').textContent = id ? 'Editar propiedad' : 'Nueva propiedad';
    const fields = ['formId', 'formTitulo', 'formPrecioUF', 'formPrecioNota', 'formPrecioCLP', 'formSuperficie', 'formDorms', 'formBanos', 'formEstac', 'formDesc', 'formDescLarga', 'formDireccion', 'formLat', 'formLng', 'formImagenes', 'formExtras', 'formComuna'];

    if (id) {
      const p = state.properties.find(x => x.id === id);
      if (!p) return;
      setVal('formId', p.id);
      setVal('formTitulo', p.titulo || '');
      setVal('formTipo', p.tipo || 'venta');
      setVal('formRegion', p.region || '');
      setVal('formComuna', p.comuna || '');
      setVal('formDireccion', p.direccion || '');
      setVal('formLat', p.lat || '');
      setVal('formLng', p.lng || '');
      setVal('formPrecioUF', p.precioUF || '');
      setVal('formPrecioNota', p.precioNota || '');
      setVal('formPrecioCLP', p.precioCLP || '');
      setVal('formSuperficie', p.superficie || '');
      setVal('formDorms', p.dorms || '');
      setVal('formBanos', p.banos || '');
      setVal('formEstac', p.estac || '');
      setVal('formDesc', p.desc || '');
      setVal('formDescLarga', p.descLarga || '');
      setVal('formImagenes', (p.imagenes || []).join('\n'));
      setVal('formExtras', (p.extras || []).join(', '));
    } else {
      fields.forEach(f => setVal(f, ''));
      setVal('formTipo', 'venta');
      setVal('formRegion', 'Metropolitana de Santiago');
    }

    document.getElementById('propertyFormModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('formTitulo').focus(), 50);
  }

  function closePropertyForm() {
    document.getElementById('propertyFormModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function saveProperty() {
    const id = getVal('formId') || genId();
    const titulo = getVal('formTitulo').trim();
    if (!titulo) { toast('El título es obligatorio.'); return; }

    const prop = {
      id,
      titulo,
      tipo: getVal('formTipo'),
      region: getVal('formRegion'),
      comuna: getVal('formComuna').trim(),
      direccion: getVal('formDireccion').trim(),
      lat: parseFloat(getVal('formLat')) || undefined,
      lng: parseFloat(getVal('formLng')) || undefined,
      precioUF: parseFloat(getVal('formPrecioUF')) || 0,
      precioNota: getVal('formPrecioNota').trim(),
      precioCLP: getVal('formPrecioCLP').trim(),
      superficie: parseInt(getVal('formSuperficie'), 10) || 0,
      dorms: parseInt(getVal('formDorms'), 10) || 0,
      banos: parseInt(getVal('formBanos'), 10) || 0,
      estac: parseInt(getVal('formEstac'), 10) || 0,
      desc: getVal('formDesc').trim(),
      descLarga: getVal('formDescLarga').trim(),
      imagenes: getVal('formImagenes').split('\n').map(s => s.trim()).filter(Boolean),
      extras: getVal('formExtras').split(',').map(s => s.trim()).filter(Boolean),
    };

    const existed = state.properties.some(x => x.id === id);
    state.properties = await store.upsert(state.properties, prop);
    closePropertyForm();
    renderAdminTable();
    updateAdminStats();
    app.applyFilters();
    if (activeTab === 'sitio') showSitePreview();
    toast(existed ? 'Propiedad actualizada ✓' : 'Propiedad agregada ✓');
  }

  async function deleteProperty(id) {
    if (!confirm('¿Eliminar esta propiedad? No se puede deshacer.')) return;
    state.properties = await store.remove(state.properties, id);
    renderAdminTable();
    updateAdminStats();
    app.applyFilters();
    toast('Propiedad eliminada');
  }

  async function refreshFromStore() {
    state.properties = await store.getAll();
    if (activeTab === 'propiedades') { renderAdminTable(); updateAdminStats(); }
    if (activeTab === 'estadisticas') renderAnalytics();
    if (activeTab === 'leads') renderLeads();
    app.applyFilters();
  }

  function bindEvents() {
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.adminTab));
    });

    document.getElementById('adminTableBody').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit-prop') openPropertyForm(btn.dataset.id);
      if (btn.dataset.action === 'delete-prop') deleteProperty(btn.dataset.id);
    });

    document.getElementById('leadsList')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn?.dataset.action === 'mark-contacted') {
        markLeadContacted(btn.dataset.id);
        renderLeads();
        updateAdminStats();
        toast('Lead marcado como contactado');
      }
    });

    document.getElementById('loginPass').addEventListener('keydown', e => {
      if (e.key === 'Enter') attemptLogin();
    });

    document.getElementById('loginModal').addEventListener('click', e => {
      if (e.target.id === 'loginModal') e.target.classList.add('hidden');
    });

    document.getElementById('propertyFormModal').addEventListener('click', e => {
      if (e.target.id === 'propertyFormModal') closePropertyForm();
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      closePropertyForm();
      document.getElementById('loginModal').classList.add('hidden');
    });

    onDataChange(() => refreshFromStore());
  }

  return {
    goAdmin,
    attemptLogin,
    logoutAdmin,
    showPanel,
    openPropertyForm,
    closePropertyForm,
    saveProperty,
    bindEvents,
    refreshFromStore,
  };
}
