import { SITE, STORAGE_KEY } from './config.js';
import { LocalPropertyStore } from './storage.js';
import { SupabasePropertyStore } from './supabase-store.js';
import { isSupabaseConfigured, getSupabase } from './supabase-client.js';
import { LocalAuthService, ApiAuthService, SupabaseAuthService } from './auth.js';
import { ApiPropertyStore } from './api-store.js';
import { createApp } from './app.js';
import { createAdmin } from './admin.js';
import { startUFService } from './uf.js';
import { onDataChange } from './analytics.js';
import { detectApi } from './api.js';
import { isLocalDev } from './env.js';
import { toast } from './utils.js';

const state = { properties: [], currentSection: 'todas' };
let store, auth, app, admin;

async function resolveBackend() {
  if (isSupabaseConfigured()) {
    return { store: new SupabasePropertyStore(), auth: new SupabaseAuthService(), mode: 'supabase' };
  }
  const apiOk = await detectApi();
  if (apiOk) {
    return { store: new ApiPropertyStore(), auth: new ApiAuthService(), mode: 'api' };
  }
  return { store: new LocalPropertyStore(), auth: new LocalAuthService(), mode: 'local' };
}

async function init() {
  try {
    const backend = await resolveBackend();
    store = backend.store;
    auth = backend.auth;
    window.__PEWENCHE_BACKEND__ = backend.mode;

    if (backend.mode === 'supabase' && auth.init) {
      await auth.init();
    }

    if (backend.mode !== 'supabase' && !isLocalDev()) {
      console.error('[Pewenche] Sin Supabase en producción — consultas no sincronizan.');
    }

    app = createApp(store, state);
    admin = createAdmin(store, auth, state, app);

    startUFService();

    try {
      state.properties = await store.getAll();
    } catch (err) {
      console.error('Error cargando propiedades:', err);
      toast('No se pudieron cargar las propiedades. Revisa la conexión.');
      state.properties = [];
    }

    app.initTheme();
    app.populateRegionSelects();
    app.injectContactLinks();
    app.bindEvents(state);
    admin.bindEvents();

    document.getElementById('siteYear').textContent = SITE.year;
    app.applyFilters();
    app.setActiveNav('todas');

    if (auth.isAuthenticated()) admin.showPanel();

    onDataChange(async key => {
      if (key === STORAGE_KEY || key === 'leads' || key === 'clicks') {
        try {
          state.properties = await store.getAll();
          await app.reloadProperties();
        } catch { /* ignore */ }
      }
      if (auth.isAuthenticated()) {
        await admin.refreshFromStore();
        if (key === 'leads') await admin.refreshLeads?.();
      }
    });

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState !== 'visible' || backend.mode !== 'supabase') return;
      if (auth.refreshSession) await auth.refreshSession();
      try {
        state.properties = await store.getAll();
        await app.reloadProperties();
        if (auth.isAuthenticated()) await admin.refreshFromStore();
      } catch { /* ignore */ }
    });
  } catch (err) {
    console.error('[Pewenche] init failed:', err);
    toast('Error al iniciar la aplicación.');
  }
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('#propertiesGrid, #adminTableBody, #detailModal, #imageGallery')) return;

  const action = el.dataset.action;
  const handlers = {
    'toggle-theme': () => app?.toggleTheme(),
    'toggle-menu': () => app?.toggleMobileMenu(),
    'toggle-admin-menu': () => admin?.toggleMobileSidebar?.(),
    'apply-filters': () => app?.searchAndScroll(),
    'load-more': () => app?.loadMore(),
    'clear-filter': () => app?.clearFilter(el.dataset.filter),
    'scroll-top': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    'clear-hero-filters': () => app?.clearHeroFilters(),
    'reset-filters': () => { e.preventDefault(); app?.resetFilters(); },
    'sidebar-tipo': () => app?.setSidebarTipo(el.dataset.tipo),
    'close-login': () => document.getElementById('loginModal').classList.add('hidden'),
    'open-admin-login': () => admin?.openLogin(),
    'attempt-login': () => admin?.attemptLogin(),
    'open-property-form': () => admin?.openPropertyForm(null),
    'save-property': () => admin?.saveProperty(),
    'create-backup': () => admin?.createBackup?.(),
    'close-detail': () => app?.closeDetail(),
    'logout-admin': () => admin?.logoutAdmin(),
    'show-section': () => { e.preventDefault(); app?.showSection(el.dataset.section); },
    'show-contact': () => { e.preventDefault(); app?.showContact(); if (el.closest('#mobileMenu')) app?.toggleMobileMenu(); },
  };

  const fn = handlers[action];
  if (fn) {
    if (!['reset-filters', 'show-section', 'show-contact'].includes(action)) e.preventDefault();
    fn();
    if (action === 'show-section' && el.closest('#mobileMenu')) app?.toggleMobileMenu();
  }
});

init();
