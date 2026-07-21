import { BADGE, REGIONES, ADMIN } from './config.js';
import { getVal, genId, h, setVal, toast, mapEmbedUrl, safeUrl, filterImageUrls } from './utils.js';
import {
  getWeeklyClickStats, getTotalWeeklyClicks, getLeads, markLeadContacted, purgeOldLeads, LEAD_RETENTION_DAYS, onDataChange,
} from './analytics.js';
import { formatPropertyPrice } from './uf.js';
import { hasApi, uploadImages, api, getToken } from './api.js';
import { isSupabaseConfigured, hasAdminSession } from './supabase-client.js';
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
      el.className = 'mb-4 p-3 rounded-xl text-sm border border-verde-200 bg-verde-50 text-verde-800';
      el.innerHTML = '<i class="fa-solid fa-cloud mr-1"></i> Los cambios se guardan <strong>permanentemente en Supabase</strong> (nube). Visibles desde cualquier dispositivo.';
      el.classList.remove('hidden');
    } else if (!isLocalDev()) {
      el.className = 'mb-4 p-3 rounded-xl text-sm border border-red-300 bg-red-50 text-red-800';
      el.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> <strong>Problema:</strong> el sitio está en modo «${label}». Las consultas de visitantes <strong>no llegan al admin</strong>. Configura <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> en Vercel y redeploy.`;
      el.classList.remove('hidden');
    } else {
      el.className = 'mb-4 p-3 rounded-xl text-sm border border-amber-200 bg-amber-50 text-amber-900';
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

  async function openLogin() {
    const hint = document.getElementById('loginHint');
    const userEl = document.getElementById('loginUser');
    const passEl = document.getElementById('loginPass');
    document.getElementById('loginError')?.classList.add('hidden');

    if (isSupabaseConfigured()) {
      userEl.value = ADMIN.email;
      userEl.type = 'email';
      userEl.readOnly = true;
      userEl.classList.add('opacity-80');
    } else {
      userEl.value = '';
      userEl.placeholder = 'Usuario';
      userEl.type = 'text';
      userEl.readOnly = false;
      userEl.classList.remove('opacity-80');
      hint?.classList.add('hidden');
    }

    if (auth.refreshSession) await auth.refreshSession();

    if (isSupabaseConfigured() && hint) {
      hint.textContent = auth.isAuthenticated()
        ? 'Por seguridad, confirma tu contraseña para entrar'
        : 'Email y contraseña de Supabase Auth';
      hint.classList.remove('hidden');
    }

    if (passEl) passEl.value = '';
    document.getElementById('loginModal').classList.remove('hidden');
    setTimeout(() => passEl?.focus(), 50);
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
      history.replaceState(null, '', '#admin');
      showPanel();
    } else {
      err.textContent = result.error;
      err.classList.remove('hidden');
      document.getElementById('loginPass').value = '';
      document.getElementById('loginPass').focus();
    }
  }

  function logoutAdmin() {
    auth.logout().then(() => {
      hidePanel();
      if (location.hash === '#admin') {
        history.replaceState(null, '', location.pathname + location.search);
      }
    });
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
      const isActive = btn.dataset.adminTab === tab;
      btn.classList.toggle('admin-sidebar-active', isActive);
      btn.classList.toggle('admin-bottom-nav-active', isActive);
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
    const cards = document.getElementById('adminPropCards');
    const list = filteredProperties();
    if (tbody) tbody.innerHTML = '';
    if (cards) cards.innerHTML = '';

    if (!list.length) {
      const empty = '<p class="text-center py-12 text-gray-400 text-sm">No hay propiedades con esos filtros.</p>';
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-gray-400 text-sm">No hay propiedades con esos filtros.</td></tr>`;
      if (cards) cards.innerHTML = empty;
      return;
    }

    list.forEach(p => {
      const badge = BADGE[p.tipo] || { cls: 'bg-gray-600', label: p.tipo };
      const price = formatPropertyPrice(p);
      const img = h(safeUrl(p.imagenes?.[0]) || '');

      if (tbody) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition';
        tr.innerHTML = `
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <img src="${img}" alt="" class="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100" onerror="this.style.display='none'" />
              <div><p class="font-medium text-sm">${h(p.titulo)}</p><p class="text-xs text-gray-500">${h(p.comuna || '')}${p.region ? ', ' + h(p.region) : ''}</p></div>
            </div>
          </td>
          <td class="px-4 py-3 hidden sm:table-cell"><span class="text-xs font-semibold px-2.5 py-1 rounded-full text-white ${badge.cls}">${badge.label}</span></td>
          <td class="px-4 py-3 hidden md:table-cell text-sm text-gray-500">${h(p.region || '—')}</td>
          <td class="px-4 py-3 text-sm"><span class="font-semibold text-verde-700">${h(price.primary)}</span>${price.secondary ? `<br><span class="text-xs text-gray-500">${h(price.secondary)}</span>` : ''}</td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <a href="propiedad.html?id=${p.id}" target="_blank" rel="noopener" class="text-xs text-blue-600 hover:underline px-2"><i class="fa-solid fa-eye"></i></a>
            <button type="button" data-action="edit-prop" data-id="${p.id}" class="text-xs text-verde-700 hover:underline px-2"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
            <button type="button" data-action="delete-prop" data-id="${p.id}" class="text-xs text-red-500 hover:underline px-2"><i class="fa-solid fa-trash"></i></button>
          </td>`;
        tbody.appendChild(tr);
      }

      if (cards) {
        const card = document.createElement('article');
        card.className = 'admin-prop-card';
        card.innerHTML = `
          <div class="admin-prop-card-img">
            <img src="${img}" alt="" loading="lazy" onerror="this.parentElement.classList.add('admin-prop-card-img--empty')" />
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full text-white ${badge.cls}">${badge.label}</span>
          </div>
          <div class="admin-prop-card-body">
            <p class="font-semibold text-sm leading-snug mb-1">${h(p.titulo)}</p>
            <p class="text-xs text-gray-500 mb-2"><i class="fa-solid fa-location-dot mr-1"></i>${h(p.comuna || '')}${p.region ? ', ' + h(p.region) : ''}</p>
            <p class="text-verde-700 font-bold text-sm">${h(price.primary)}${price.secondary ? `<span class="text-gray-500 font-normal ml-1">${h(price.secondary)}</span>` : ''}</p>
            <div class="admin-prop-card-actions">
              <a href="propiedad.html?id=${p.id}" target="_blank" rel="noopener" class="admin-prop-card-btn"><i class="fa-solid fa-eye"></i> Ver</a>
              <button type="button" data-action="edit-prop" data-id="${p.id}" class="admin-prop-card-btn admin-prop-card-btn--primary"><i class="fa-solid fa-pen"></i> Editar</button>
              <button type="button" data-action="delete-prop" data-id="${p.id}" class="admin-prop-card-btn admin-prop-card-btn--danger"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>`;
        cards.appendChild(card);
      }
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
      <div class="flex items-center gap-4 p-4 rounded-xl border border-gray-100 ${i === 0 ? 'bg-verde-50' : ''}">
        <span class="w-8 h-8 rounded-full bg-verde-800 text-white text-sm font-bold flex items-center justify-center">${i + 1}</span>
        <div class="flex-1"><p class="font-semibold text-sm">${h(s.titulo)}</p>
          <div class="mt-2 h-2 bg-gray-100 rounded-full"><div class="h-full bg-verde-600 rounded-full" style="width:${Math.round((s.count / max) * 100)}%"></div></div>
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
      const retention = `Las consultas de más de ${LEAD_RETENTION_DAYS} días se pueden borrar con el botón «Borrar consultas +14 días» o automáticamente en Supabase.`;
      if (isSupabaseConfigured()) {
        hint.textContent = `Consultas en Supabase (cualquier red/dispositivo). Se actualiza cada 30 s. ${retention}`;
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
      <div class="admin-lead-card p-4 rounded-xl border border-gray-100 ${l.contacted ? 'opacity-60' : 'bg-white'}">
        <div class="flex flex-col sm:flex-row sm:justify-between gap-1 mb-2">
          <div class="min-w-0"><p class="font-semibold truncate">${h(l.nombre)}</p><p class="text-sm text-gray-400 truncate">${h(l.email)}</p></div>
          <span class="text-xs text-gray-400 shrink-0">${new Date(l.at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <p class="text-sm text-verde-700 mb-1"><i class="fa-solid fa-house mr-1"></i>${h(l.propertyTitle)}</p>
        ${l.mensaje ? `<p class="text-sm text-gray-500 mb-3 line-clamp-3">${h(l.mensaje)}</p>` : ''}
        <div class="flex flex-col sm:flex-row gap-2">
          <a href="mailto:${h(l.email)}?subject=${encodeURIComponent('Re: ' + l.propertyTitle)}" class="text-sm btn-verde px-4 py-2.5 text-center"><i class="fa-solid fa-envelope mr-1"></i>Contactar</a>
          ${!l.contacted ? `<button type="button" data-action="mark-contacted" data-id="${l.id}" class="text-sm px-4 py-2.5 border border-gray-200 rounded-xl">Marcar contactado</button>` : '<span class="text-sm text-gray-400 py-2.5">✓ Contactado</span>'}
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
      <div class="relative group rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100">
        <img src="${h(safeUrl(url))}" alt="" class="w-full h-full object-cover" />
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

  function syncPriceFormLabels() {
    const tipo = getVal('formTipo');
    const ufLabel = document.getElementById('formPrecioUFLabel');
    const clpLabel = document.getElementById('formPrecioCLPLabel');
    const nota = getVal('formPrecioNota');
    if (tipo === 'arriendo') {
      if (ufLabel) ufLabel.textContent = 'Base UF (solo cálculo)';
      if (clpLabel) clpLabel.textContent = 'Precio público en pesos';
      if (!nota) setVal('formPrecioNota', '/mes');
    } else {
      if (ufLabel) ufLabel.textContent = 'Precio UF';
      if (clpLabel) clpLabel.textContent = 'CLP (respaldo / referencia)';
    }
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
    syncPriceFormLabels();
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
    if (isSupabaseConfigured() && !(await hasAdminSession())) {
      toast('Debes iniciar sesión como admin para guardar en la nube.');
      openLogin();
      return;
    }
    const id = getVal('formId') || genId();
    const titulo = getVal('formTitulo').trim();
    if (!titulo) { toast('El título es obligatorio.'); return; }
    const urlLines = filterImageUrls(getVal('formImagenes').split('\n').map(s => s.trim()).filter(Boolean));
    const imagenes = filterImageUrls([...new Set([...editorImages, ...urlLines])]);

    const tipo = getVal('formTipo');
    let precioNota = getVal('formPrecioNota').trim();
    if (tipo === 'arriendo' && !precioNota) precioNota = '/mes';

    const prop = {
      id, titulo, tipo, region: getVal('formRegion'),
      comuna: getVal('formComuna').trim(), direccion: getVal('formDireccion').trim(),
      lat: parseFloat(getVal('formLat')) || undefined, lng: parseFloat(getVal('formLng')) || undefined,
      precioUF: parseFloat(getVal('formPrecioUF')) || 0, precioNota,
      precioCLP: getVal('formPrecioCLP').trim(),
      superficie: parseInt(getVal('formSuperficie'), 10) || 0,
      dorms: parseInt(getVal('formDorms'), 10) || 0,
      banos: parseInt(getVal('formBanos'), 10) || 0,
      estac: parseInt(getVal('formEstac'), 10) || 0,
      desc: getVal('formDesc').trim(), descLarga: getVal('formDescLarga').trim(),
      imagenes, extras: getVal('formExtras').split(',').map(s => s.trim()).filter(Boolean),
    };

    const existed = state.properties.some(x => x.id === id);
    try {
      state.properties = await store.upsert(state.properties, prop);
      await updateAdminStats();
      app.applyFilters();
      switchTab('propiedades');
      renderAdminTable();
      if (isSupabaseConfigured()) {
        createCloudBackup('auto-propiedad').catch(() => {});
        toast(existed ? 'Propiedad actualizada — guardada permanentemente en la nube ✓' : 'Propiedad agregada — guardada permanentemente en la nube ✓');
      } else {
        toast(existed ? 'Propiedad actualizada ✓' : 'Propiedad agregada ✓');
      }
    } catch (err) {
      toast(err.message || 'Error al guardar. ¿Sesión admin activa?');
    }
  }

  async function deleteProperty(id) {
    if (!confirm('¿Eliminar esta propiedad?')) return;
    try {
      state.properties = await store.remove(state.properties, id);
      renderAdminTable();
      await updateAdminStats();
      app.applyFilters();
      if (isSupabaseConfigured()) {
        createCloudBackup('auto-eliminar').catch(() => {});
        toast('Propiedad eliminada de la nube ✓');
      } else {
        toast('Propiedad eliminada');
      }
    } catch (err) {
      toast(err.message || 'Error al eliminar');
    }
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
    document.getElementById('formTipo')?.addEventListener('change', syncPriceFormLabels);

    ['adminFilterSearch', 'adminFilterTipo', 'adminFilterRegion'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderAdminTable);
      document.getElementById(id)?.addEventListener('change', renderAdminTable);
    });

    document.getElementById('adminTableBody')?.addEventListener('click', onAdminPropAction);
    document.getElementById('adminPropCards')?.addEventListener('click', onAdminPropAction);

    function onAdminPropAction(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'edit-prop') openPropertyForm(btn.dataset.id);
      if (btn.dataset.action === 'delete-prop') deleteProperty(btn.dataset.id);
    }

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
      const url = safeUrl(getVal('formImageUrl').trim());
      if (!url) { toast('URL inválida — usa http:// o https://'); return; }
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
    document.getElementById('btnPurgeOldLeads')?.addEventListener('click', async () => {
      if (!confirm(`¿Borrar consultas con más de ${LEAD_RETENTION_DAYS} días? Esta acción no se puede deshacer.`)) return;
      try {
        const n = await purgeOldLeads(LEAD_RETENTION_DAYS);
        toast(n ? `Se eliminaron ${n} consulta(s) antigua(s).` : 'No había consultas antiguas para borrar.');
        await renderLeads();
        await updateAdminStats();
      } catch (err) {
        toast(err.message || 'No se pudieron borrar las consultas.');
      }
    });
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
