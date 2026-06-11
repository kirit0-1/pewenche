import { BADGE, REGIONES } from './config.js';
import { getVal, genId, h, setVal, toast } from './utils.js';

export function createAdmin(store, auth, state, app) {
  function showPanel() {
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('adminPage').classList.remove('hidden');
    window.location.hash = '#/admin';
    renderAdminTable();
    updateAdminStats();
  }

  function hidePanel() {
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
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

  function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    if (!state.properties.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-12 text-gray-400 text-sm">No hay propiedades. ¡Agrega la primera!</td></tr>';
      return;
    }
    state.properties.forEach(p => {
      const badge = BADGE[p.tipo] || { cls: 'bg-gray-600', label: p.tipo };
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
        <td class="px-4 py-3 text-sm font-semibold text-verde-700 dark:text-green-400">
          ${p.precioUF ? p.precioUF.toLocaleString('es-CL') + ' UF' : '—'}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
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
  }

  function openPropertyForm(id) {
    document.getElementById('formModalTitle').textContent = id ? 'Editar propiedad' : 'Nueva propiedad';
    const fields = ['formId', 'formTitulo', 'formPrecioUF', 'formPrecioCLP', 'formSuperficie', 'formDorms', 'formBanos', 'formEstac', 'formDesc', 'formImagenes', 'formExtras', 'formComuna'];

    if (id) {
      const p = state.properties.find(x => x.id === id);
      if (!p) return;
      setVal('formId', p.id);
      setVal('formTitulo', p.titulo || '');
      setVal('formTipo', p.tipo || 'venta');
      setVal('formRegion', p.region || '');
      setVal('formComuna', p.comuna || '');
      setVal('formPrecioUF', p.precioUF || '');
      setVal('formPrecioCLP', p.precioCLP || '');
      setVal('formSuperficie', p.superficie || '');
      setVal('formDorms', p.dorms || '');
      setVal('formBanos', p.banos || '');
      setVal('formEstac', p.estac || '');
      setVal('formDesc', p.desc || '');
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
      precioUF: parseFloat(getVal('formPrecioUF')) || 0,
      precioCLP: getVal('formPrecioCLP').trim(),
      superficie: parseInt(getVal('formSuperficie'), 10) || 0,
      dorms: parseInt(getVal('formDorms'), 10) || 0,
      banos: parseInt(getVal('formBanos'), 10) || 0,
      estac: parseInt(getVal('formEstac'), 10) || 0,
      desc: getVal('formDesc').trim(),
      imagenes: getVal('formImagenes').split('\n').map(s => s.trim()).filter(Boolean),
      extras: getVal('formExtras').split(',').map(s => s.trim()).filter(Boolean),
    };

    const existed = state.properties.some(x => x.id === id);
    state.properties = await store.upsert(state.properties, prop);
    closePropertyForm();
    renderAdminTable();
    updateAdminStats();
    app.applyFilters();
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

  function bindEvents() {
    document.getElementById('adminTableBody').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit-prop') openPropertyForm(btn.dataset.id);
      if (btn.dataset.action === 'delete-prop') deleteProperty(btn.dataset.id);
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
  };
}
