import { SITE, STORAGE_KEY } from './config.js';
import { LocalPropertyStore } from './storage.js';
import { SupabasePropertyStore } from './supabase-store.js';
import { isSupabaseConfigured } from './supabase-client.js';
import { LocalAuthService, ApiAuthService } from './auth.js';
import { ApiPropertyStore } from './api-store.js';
import { createApp } from './app.js';
import { createAdmin } from './admin.js';
import { startUFService } from './uf.js';
import { onDataChange } from './analytics.js';
import { detectApi } from './api.js';

const state = { properties: [], currentSection: 'todas' };
let store, auth, app, admin;

async function resolveBackend() {
  if (isSupabaseConfigured()) {
    return { store: new SupabasePropertyStore(), auth: new LocalAuthService(), mode: 'supabase' };
  }
  const apiOk = await detectApi();
  if (apiOk) {
    return { store: new ApiPropertyStore(), auth: new ApiAuthService(), mode: 'api' };
  }
  return { store: new LocalPropertyStore(), auth: new LocalAuthService(), mode: 'local' };
}

async function init() {
  const backend = await resolveBackend();
  store = backend.store;
  auth = backend.auth;

  app = createApp(store, state);
  admin = createAdmin(store, auth, state, app);

  startUFService();
  state.properties = await store.getAll();

  app.initTheme();
  app.populateRegionSelects();
  app.injectContactLinks();
  app.bindEvents(state);
  admin.bindEvents();

  document.getElementById('siteYear').textContent = SITE.year;
  document.getElementById('resultCount').textContent = `${state.properties.length} propiedades disponibles`;
  app.renderGrid(state.properties);
  app.setActiveNav('todas');

  if (auth.isAuthenticated()) admin.showPanel();

  onDataChange(async key => {
    if (key === STORAGE_KEY || key === 'leads' || key === 'clicks') {
      state.properties = await store.getAll();
      await app.reloadProperties();
    }
    if (auth.isAuthenticated()) {
      await admin.refreshFromStore();
      if (key === 'leads') await admin.refreshLeads?.();
    }
  });
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('#propertiesGrid, #adminTableBody, #detailModal, #imageGallery')) return;

  const action = el.dataset.action;
  const handlers = {
    'toggle-theme': () => app.toggleTheme(),
    'toggle-menu': () => app.toggleMobileMenu(),
    'toggle-admin-menu': () => admin.toggleMobileSidebar?.(),
    'apply-filters': () => app.applyFilters(),
    'clear-hero-filters': () => app.clearHeroFilters(),
    'reset-filters': () => { e.preventDefault(); app.resetFilters(); },
    'sidebar-tipo': () => app.setSidebarTipo(el.dataset.tipo),
    'close-login': () => document.getElementById('loginModal').classList.add('hidden'),
    'open-admin-login': () => admin.openLogin(),
    'attempt-login': () => admin.attemptLogin(),
    'open-property-form': () => admin.openPropertyForm(null),
    'save-property': () => admin.saveProperty(),
    'create-backup': () => admin.createBackup?.(),
    'close-detail': () => app.closeDetail(),
    'logout-admin': () => admin.logoutAdmin(),
    'show-section': () => { e.preventDefault(); app.showSection(el.dataset.section); },
  };

  const fn = handlers[action];
  if (fn) {
    if (!['reset-filters', 'show-section'].includes(action)) e.preventDefault();
    fn();
    if (action === 'show-section' && el.closest('#mobileMenu')) app.toggleMobileMenu();
  }
});

init();
