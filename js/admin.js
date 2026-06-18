import { BADGE, REGIONES } from './config.js';
import { getVal, genId, h, setVal, toast, mapEmbedUrl } from './utils.js';
import {
  getWeeklyClickStats, getTotalWeeklyClicks, getLeads, markLeadContacted, onDataChange,
} from './analytics.js';
import { clpFromUF } from './uf.js';
import { hasApi, uploadImages, api, getToken } from './api.js';
import { isSupabaseConfigured } from './supabase-client.js';
import { createCloudBackup, listBackups } from './backup.js';
import { uploadPropertyImage } from './supabase-store.js';
import { isLocalDev, getBackendLabel } from './env.js';

export function createAdmin(store, auth, state, app) {
  let activeTab = 'inicio';
  let editorImages = [];
  let leadsRefreshTimer = null;

  function updateBackendBanner() {
    const el = document.getElementById('adminBackendBanner');
    if (!el) return;
    const mode = window.__PEWENCHE_BACKEND__ || (isSupabaseConfigured() ? 'supabase' : hasApi() ? 'api' : 'local');
    const label = getBackendLabel(mode);
    if (mode === 'supabase') {
      el.className = 'mb-4 p-3 rounded-xl text-sm border border-verde-200 dark:border-verde-800 bg-verde-50 dark:bg-verde-900/20 text-verde-800 dark:text-green-300';
      el.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> Datos en <strong>Supabase</strong> — las consultas de cualquier dispositivo aparecen aquí.`;
      el.classList.remove('hidden');
    } else if (!isLocalDev()) {
      el.className = 'mb-4 p-3 rounded-xl text-sm border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      el.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> <strong>Problema:</strong> el sitio está en modo «${label}». Las consultas de visitantes <strong>no llegan al admin</strong>. Configura <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> en Vercel y redeploy.`;
      el.classList.remove('hidden');
    } else {
      el.className = 'mb-4 p-3 rounded-xl text-sm border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200';
      el.innerHTML = `<i class="fa-solid fa-laptop mr-1"></i> Modo local: <strong>${label}</strong>. En producción (Vercel) debe decir Supabase.`;
      el.classList.remove('hidden');
    }
  }

  function showPanel() {
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('adminPage').classList.remove('hidden');
    document.getElementById('waFloat')?.classList.add('hidden');
    updateBackendBanner();
    switchTab('inicio');
  }

  function hidePanel() {
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
    document.getElementById('waFloat')?.classList.remove('hidden');
  }

  function openLogin() {
    const hint = document.getElementById('loginHint');
    const userEl = document.getElementById('loginUser');
    if (isSupabaseConfigured()) {
      userEl.placeholder = 'admin@pewenche.cl';
      userEl.type = 'email';
      if (hint) {
        hint.textContent = 'Email y contraseña de Supabase Auth';
        hint.classList.remove('hidden');
      }
    } else {
      userEl.placeholder = 'Usuario';
      userEl.type = 'text';
      hint?.classList.add('hidden');
    }
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

  function closeMobileSidebar() {
    document.getElementById('adminSidebar')?.classList.remove('admin-sidebar-open');
    document.getElementById('adminSidebarOverlay')?.classList.add('hidden');
  }

  function toggleMobileSidebar() {
    const open = document.getElementById('adminSidebar')?.classList.toggle('admin-sidebar-open');
    document.getElementById('adminSidebarOverlay')?.classList.toggle('hidden', !open);
  }

  function switchTab(tab) {
    closeMobileSidebar();
    if (leadsRefreshTimer) {
      clearInterval(leadsRefreshTimer);
      leadsRefreshTimer = null;
    }
    activeTab = tab;
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.classList.toggle('admin-sidebar-active', btn.dataset.adminTab === tab);
    });
    document.querySelectorAll('[data-admin-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.adminPanel !== tab);
    });
    document.getElementById('adminPageTitle').textContent = {
      inicio: 'Inicio', propiedades: 'Propiedades', editor: 'Editor de propiedad',
      estadisticas: 'Estadísticas', leads: 'Consultas de clientes', sitio: 'Vista del sitio', config: 'Configuración',
    }[tab] || 'Panel Admin';

    if (tab === 'inicio' || tab === 'propiedades') { updateAdminStats(); if (tab === 'propiedades') renderAdminTable(); }
    if (tab === 'estadisticas') renderAnalytics();
    if (tab === 'leads') {
      renderLeads();
      leadsRefreshTimer = setInterval(() => renderLeads(), 30000);
    }
    if (tab === 'sitio') showSitePreview();
    if (tab === 'config') loadConfig();
    if (tab === 'editor') updateMapPreview();
  }

  function showSitePreview() {
    document.getElementById('adminPreviewFrame').src = 'index.html';
  }

  function filteredProperties() {
    const q = (getVal('adminFilterSearch') || '').toLowerCase();
    const tipo = getVal('adminFilterTipo');
    const region = getVal('adminFilterRegion');
    return state.properties.filter(p => {
      if (tipo && p.tipo !== tipo) return false;
      if (region && p.region !== region) return false;
      if (q && ![p.titulo, p.comuna, p.region, p.desc].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    const list = filteredProperties();
    tbody.innerHTML = '';
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-12 text-gray-400 text-sm">No hay propiedades con esos filtros.</td></tr>';
      return;
    }
    list.forEach(p => {
      const badge = BADGE[p.tipo] || { cls: 'bg-gray-600', label: p.tipo };
      const clp = clpFromUF(p.precioUF, p.precioNota || '') || p.precioCLP || '';
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition';
      tr.innerHTML = `
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <img src="${(p.imagenes && p.imagenes[0]) || ''}" alt="" class="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-zinc-700" onerror="this.style.display='none'" />
            <div><p class="font-medium text-sm">${h(p.titulo)}</p><p class="text-xs text-gray-400">${h(p.comuna || '')}${p.region ? ', ' + h(p.region) : ''}</p></div>
          </div>
        </td>
        <td class="px-4 py-3 hidden sm:table-cell"><span class="text-xs font-semibold px-2.5 py-1 rounded-full text-white ${badge.cls}">${badge.label}</span></td>
        <td class="px-4 py-3 hidden md:table-cell text-sm text-gray-500">${h(p.region || '—')}</td>
        <td class="px-4 py-3 text-sm"><span class="font-semibold text-verde-700 dark:text-green-400">${p.precioUF ? p.precioUF.toLocaleString('es-CL') + ' UF' : '—'}</span>${clp ? `<br><span class="text-xs text-gray-400">${h(clp)}</span>` : ''}</td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <a href="propiedad.html?id=${p.id}" target="_blank" rel="noopener" class="text-xs text-blue-600 hover:underline px-2"><i class="fa-solid fa-eye"></i></a>
          <button type="button" data-action="edit-prop" data-id="${p.id}" class="text-xs text-verde-700 hover:underline px-2"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
          <button type="button" data-action="delete-prop" data-id="${p.id}" class="text-xs text-red-500 hover:underline px-2"><i class="fa-solid fa-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  async function updateAdminStats() {
    document.getElementById('statTotal').textContent = state.properties.length;
    document.getElementById('statVenta').textContent = state.properties.filter(p => p.tipo === 'venta').length;
    document.getElementById('statArriendo').textContent = state.properties.filter(p => p.tipo === 'arriendo').length;
    document.getElementById('statHostal').textContent = state.properties.filter(p => ['hostal', 'camping'].includes(p.tipo)).length;
    document.getElementById('statClicks').textContent = await getTotalWeeklyClicks();
    const leads = await getLeads();
    document.getElementById('statLeads').textContent = leads.filter(l => !l.contacted).length;
  }

  async function renderAnalytics() {
    const stats = await getWeeklyClickStats(state.properties);
    const container = document.getElementById('analyticsList');
    document.getElementById('analyticsTotal').textContent = await getTotalWeeklyClicks();
    if (!stats.length) {
      container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Sin clics esta semana.</p>';
      return;
    }
    const max = stats[0].count;
    container.innerHTML = stats.map((s, i) => `
      <div class="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 ${i === 0 ? 'bg-verde-50 dark:bg-verde-900/20' : ''}">
        <span class="w-8 h-8 rounded-full bg-verde-800 text-white text-sm font-bold flex items-center justify-center">${i + 1}</span>
        <div class="flex-1"><p class="font-semibold text-sm">${h(s.titulo)}</p>
          <div class="mt-2 h-2 bg-gray-100 dark:bg-zinc-700 rounded-full"><div class="h-full bg-verde-600 rounded-full" style="width:${Math.round((s.count / max) * 100)}%"></div></div>
        </div>
        <span class="text-lg font-bold text-verde-700">${s.count}</span>
      </div>`).join('');
  }

  async function renderLeads() {
    const container = document.getElementById('leadsList');
    const hint = document.getElementById('leadsHint');
    let leads = [];
    try {
      leads = await getLeads();
    } catch (err) {
      if (hint) hint.innerHTML = `<span class="text-red-600">${h(err.message)}</span>`;
      container.innerHTML = '<p class="text-red-500 text-sm text-center py-8">Error al cargar consultas.</p>';
      return;
    }
    if (hint) {
      if (isSupabaseConfigured()) {
        hint.textContent = 'Consultas en Supabase (cualquier red/dispositivo). Se actualiza cada 30 s.';
      } else if (hasApi() && !getToken()) {
        hint.innerHTML = '<span class="text-amber-600">Cierra sesión y vuelve a entrar (con npm start activo) para ver consultas del servidor.</span>';
      } else if (hasApi()) {
        hint.textContent = 'Consultas en el servidor. Pulsa «Actualizar» si enviaste una desde otra pestaña.';
      } else {
        hint.textContent = 'Sin servidor: consultas solo en este navegador. Configura Supabase o npm start.';
      }
    }
    if (!leads.length) {
      container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">No hay consultas todavía.</p>';
      return;
    }
    container.innerHTML = leads.map(l => `
      <div class="p-4 rounded-xl border border-gray-100 dark:border-zinc-700 ${l.contacted ? 'opacity-60' : 'bg-white dark:bg-zinc-800'}">
        <div class="flex justify-between gap-2 mb-2">
          <div><p class="font-semibold">${h(l.nombre)}</p><p class="text-sm text-gray-400">${h(l.email)}</p></div>
          <span class="text-xs text-gray-400">${new Date(l.at).toLocaleString('es-CL')}</span>
        </div>
        <p class="text-sm text-verde-700 mb-1"><i class="fa-solid fa-house mr-1"></i>${h(l.propertyTitle)}</p>
        ${l.mensaje ? `<p class="text-sm text-gray-500 mb-3">${h(l.mensaje)}</p>` : ''}
        <div class="flex gap-2">
          <a href="mailto:${h(l.email)}?subject=${encodeURIComponent('Re: ' + l.propertyTitle)}" class="text-xs btn-verde px-3 py-1.5"><i class="fa-solid fa-envelope mr-1"></i>Contactar</a>
          ${!l.contacted ? `<button type="button" data-action="mark-contacted" data-id="${l.id}" class="text-xs px-3 py-1.5 border rounded-lg">Marcar contactado</button>` : '<span class="text-xs text-gray-400">✓ Contactado</span>'}
        </div>
      </div>`).join('');
  }

  function renderImageGallery() {
    const el = document.getElementById('imageGallery');
    if (!el) return;
    if (!editorImages.length) {
      el.innerHTML = '<p class="text-xs text-gray-400 col-span-full">Sin imágenes. Sube fotos o agrega URLs.</p>';
      return;
    }
    el.innerHTML = editorImages.map((url, i) => `
      <div class="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 aspect-video bg-gray-100">
        <img src="${h(url)}" alt="" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          ${i > 0 ? `<button type="button" data-action="img-up" data-i="${i}" class="w-8 h-8 bg-white rounded-full text-xs">↑</button>` : ''}
          <button type="button" data-action="img-remove" data-i="${i}" class="w-8 h-8 bg-red-500 text-white rounded-full text-xs">✕</button>
        </div>
        ${i === 0 ? '<span class="absolute top-1 left-1 text-[10px] bg-verde-800 text-white px-1.5 py-0.5 rounded">Principal</span>' : ''}
      </div>`).join('');
  }

  function syncImagesToTextarea() {
    setVal('formImagenes', editorImages.join('\n'));
  }

  function updateMapPreview() {
    const frame = document.getElementById('editorMapPreview');
    if (!frame) return;
    const prop = {
      direccion: getVal('formDireccion'),
      comuna: getVal('formComuna'),
      region: getVal('formRegion'),
      lat: parseFloat(getVal('formLat')) || undefined,
      lng: parseFloat(getVal('formLng')) || undefined,
    };
    frame.src = mapEmbedUrl(prop);
  }

  function openPropertyForm(id) {
    document.getElementById('editorTitle').textContent = id ? 'Editar propiedad' : 'Nueva propiedad';
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
      editorImages = [...(p.imagenes || [])];
      setVal('formExtras', (p.extras || []).join(', '));
    } else {
      fields.forEach(f => setVal(f, ''));
      setVal('formTipo', 'venta');
      setVal('formRegion', 'Metropolitana de Santiago');
      editorImages = [];
    }
    syncImagesToTextarea();
    renderImageGallery();
    switchTab('editor');
    setTimeout(() => document.getElementById('formTitulo')?.focus(), 50);
  }

  async function handleImageUpload(files) {
    if (!files?.length) return;
    if (isSupabaseConfigured()) {
      try {
        const urls = await Promise.all([...files].map(f => uploadPropertyImage(f)));
        editorImages.push(...urls);
      } catch (e) {
        toast(e.message || 'Error al subir a Supabase');
        return;
      }
    } else if (hasApi()) {
      try {
        const { urls } = await uploadImages(files);
        editorImages.push(...urls);
      } catch (e) {
        toast(e.message || 'Error al subir');
        return;
      }
    } else {
      toast('Sube fotos con Supabase o servidor Node (npm start). Usa URLs por ahora.');
      return;
    }
    syncImagesToTextarea();
    renderImageGallery();
    toast(`${files.length} imagen(es) subida(s) ✓`);
  }

  async function saveProperty() {
    const id = getVal('formId') || genId();
    const titulo = getVal('formTitulo').trim();
    if (!titulo) { toast('El título es obligatorio.'); return; }
    const urlLines = getVal('formImagenes').split('\n').map(s => s.trim()).filter(Boolean);
    const imagenes = [...new Set([...editorImages, ...urlLines])];

    const prop = {
      id, titulo, tipo: getVal('formTipo'), region: getVal('formRegion'),
      comuna: getVal('formComuna').trim(), direccion: getVal('formDireccion').trim(),
      lat: parseFloat(getVal('formLat')) || undefined, lng: parseFloat(getVal('formLng')) || undefined,
      precioUF: parseFloat(getVal('formPrecioUF')) || 0, precioNota: getVal('formPrecioNota').trim(),
      precioCLP: getVal('formPrecioCLP').trim(),
      superficie: parseInt(getVal('formSuperficie'), 10) || 0,
      dorms: parseInt(getVal('formDorms'), 10) || 0,
      banos: parseInt(getVal('formBanos'), 10) || 0,
      estac: parseInt(getVal('formEstac'), 10) || 0,
      desc: getVal('formDesc').trim(), descLarga: getVal('formDescLarga').trim(),
      imagenes, extras: getVal('formExtras').split(',').map(s => s.trim()).filter(Boolean),
    };

    const existed = state.properties.some(x => x.id === id);
    state.properties = await store.upsert(state.properties, prop);
    await updateAdminStats();
    app.applyFilters();
    switchTab('propiedades');
    renderAdminTable();
    toast(existed ? 'Propiedad actualizada ✓' : 'Propiedad agregada ✓');
  }

  async function deleteProperty(id) {
    if (!confirm('¿Eliminar esta propiedad?')) return;
    state.properties = await store.remove(state.properties, id);
    renderAdminTable();
    await updateAdminStats();
    app.applyFilters();
    toast('Propiedad eliminada');
  }

  async function loadConfig() {
    const hint = document.getElementById('configApiHint');
    const credBlock = document.getElementById('configCredBlock');
    const authNote = document.getElementById('configSupabaseAuth');
    const backupsWrap = document.getElementById('backupsListWrap');
    if (isSupabaseConfigured()) {
      if (hint) hint.textContent = 'Supabase activo — respaldos en tabla backups.';
      credBlock?.classList.add('hidden');
      authNote?.classList.remove('hidden');
      backupsWrap?.classList.remove('hidden');
      await renderBackupsList();
    } else {
      credBlock?.classList.remove('hidden');
      authNote?.classList.add('hidden');
      backupsWrap?.classList.add('hidden');
      if (hint) {
        if (hasApi()) hint.textContent = 'Backend Node activo — credenciales en data/admin.json';
        else hint.textContent = 'Modo local — credenciales en js/config.js';
      }
    }
    if (hasApi()) {
      try {
        const cfg = await api('/api/admin/config', { auth: true });
        setVal('configUsername', cfg.username);
      } catch { /* ignore */ }
    }
  }

  async function saveConfig() {
    if (isSupabaseConfigured()) {
      toast('En producción el admin usa Supabase Auth (Authentication en el dashboard).');
      return;
    }
    if (!hasApi()) { toast('Cambia credenciales en js/config.js (modo sin servidor).'); return; }
    try {
      await api('/api/admin/config', {
        method: 'PUT', auth: true,
        body: {
          username: getVal('configUsername').trim(),
          password: getVal('configCurrentPass'),
          newPassword: getVal('configNewPass').trim() || undefined,
        },
      });
      setVal('configCurrentPass', '');
      setVal('configNewPass', '');
      toast('Credenciales actualizadas ✓');
    } catch (e) {
      toast(e.message);
    }
  }

  async function createBackup() {
    if (!isSupabaseConfigured()) {
      toast('Configura Supabase primero.');
      return;
    }
    try {
      await createCloudBackup('manual');
      toast('Respaldo guardado en Supabase ✓');
      await renderBackupsList();
    } catch (e) {
      toast(e.message || 'Error al crear respaldo');
    }
  }

  async function renderBackupsList() {
    const ul = document.getElementById('backupsList');
    if (!ul || !isSupabaseConfigured()) return;
    try {
      const rows = await listBackups();
      ul.innerHTML = rows.length
        ? rows.map(b => `<li>· ${h(b.label || 'Respaldo')} — ${new Date(b.created_at).toLocaleString('es-CL')}</li>`).join('')
        : '<li class="text-gray-400">Sin respaldos todavía.</li>';
    } catch {
      ul.innerHTML = '<li class="text-red-400">No se pudieron cargar respaldos.</li>';
    }
  }

  async function refreshFromStore() {
    state.properties = await store.getAll();
    await updateAdminStats();
    if (activeTab === 'propiedades') renderAdminTable();
    if (activeTab === 'estadisticas') renderAnalytics();
    if (activeTab === 'leads') renderLeads();
    app.applyFilters();
  }

  function populateAdminFilters() {
    const sel = document.getElementById('adminFilterRegion');
    if (!sel || sel.options.length > 1) return;
    REGIONES.forEach(r => {
      const o = document.createElement('option');
      o.value = o.textContent = r;
      sel.appendChild(o);
    });
  }

  function bindEvents() {
    populateAdminFilters();

    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.adminTab === 'editor' && !getVal('formId') && activeTab !== 'editor') openPropertyForm(null);
        else switchTab(btn.dataset.adminTab);
      });
    });

    document.getElementById('adminQuickNew')?.addEventListener('click', () => openPropertyForm(null));
    document.getElementById('adminQuickList')?.addEventListener('click', () => switchTab('propiedades'));
    document.getElementById('adminQuickLeads')?.addEventListener('click', () => switchTab('leads'));

    ['adminFilterSearch', 'adminFilterTipo', 'adminFilterRegion'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderAdminTable);
      document.getElementById(id)?.addEventListener('change', renderAdminTable);
    });

    document.getElementById('adminTableBody')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit-prop') openPropertyForm(btn.dataset.id);
      if (btn.dataset.action === 'delete-prop') deleteProperty(btn.dataset.id);
    });

    document.getElementById('imageGallery')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const i = +btn.dataset.i;
      if (btn.dataset.action === 'img-remove') editorImages.splice(i, 1);
      if (btn.dataset.action === 'img-up' && i > 0) [editorImages[i - 1], editorImages[i]] = [editorImages[i], editorImages[i - 1]];
      syncImagesToTextarea();
      renderImageGallery();
    });

    document.getElementById('imageUploadZone')?.addEventListener('click', () => document.getElementById('imageFileInput')?.click());
    document.getElementById('imageFileInput')?.addEventListener('change', e => handleImageUpload(e.target.files));
    document.getElementById('imageUploadZone')?.addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
    document.getElementById('imageUploadZone')?.addEventListener('dragleave', e => e.currentTarget.classList.remove('drag-over'));
    document.getElementById('imageUploadZone')?.addEventListener('drop', e => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      handleImageUpload(e.dataTransfer.files);
    });

    document.getElementById('btnAddImageUrl')?.addEventListener('click', () => {
      const url = getVal('formImageUrl').trim();
      if (!url) return;
      editorImages.push(url);
      setVal('formImageUrl', '');
      syncImagesToTextarea();
      renderImageGallery();
    });

    ['formDireccion', 'formComuna', 'formRegion', 'formLat', 'formLng'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateMapPreview);
    });

    document.getElementById('leadsList')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (btn?.dataset.action === 'mark-contacted') {
        try {
          await markLeadContacted(btn.dataset.id);
          renderLeads();
          await updateAdminStats();
          toast('Marcado como contactado');
        } catch (err) {
          toast(err.message || 'Error al actualizar');
        }
      }
    });

    document.getElementById('btnSaveConfig')?.addEventListener('click', saveConfig);
    document.getElementById('btnRefreshLeads')?.addEventListener('click', () => renderLeads());
    document.getElementById('loginPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
    document.getElementById('loginModal')?.addEventListener('click', e => { if (e.target.id === 'loginModal') e.target.classList.add('hidden'); });
  }

  async function refreshLeads() {
    if (activeTab === 'leads') await renderLeads();
    await updateAdminStats();
  }

  return {
    openLogin, attemptLogin, logoutAdmin, showPanel,
    openPropertyForm, saveProperty, bindEvents, refreshFromStore, refreshLeads,
    toggleMobileSidebar, createBackup,
  };
}
