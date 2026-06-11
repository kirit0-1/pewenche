import { SITE, STORAGE_KEY } from './config.js';
import { LocalPropertyStore } from './storage.js';
import { LocalAuthService, ApiAuthService } from './auth.js';
import { ApiPropertyStore } from './api-store.js';
import { createApp } from './app.js';
import { createAdmin } from './admin.js';
import { startUFService } from './uf.js';
import { onDataChange } from './analytics.js';
import { detectApi } from './api.js';

const state = { properties: [], currentSection: 'todas' };
let store, auth, app, admin;

async function init() {
  const apiOk = await detectApi();
  store = apiOk ? new ApiPropertyStore() : new LocalPropertyStore();
  auth = apiOk ? new ApiAuthService() : new LocalAuthService();

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
    if (key === STORAGE_KEY) await app.reloadProperties();
    if (auth.isAuthenticated()) await admin.refreshFromStore();
  });
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('#propertiesGrid, #adminTableBody, #detailModal, #imageGallery')) return;

  const action = el.dataset.action;
  const handlers = {
    'toggle-theme': () => app.toggleTheme(),
    'toggle-menu': () => app.toggleMobileMenu(),
    'apply-filters': () => app.applyFilters(),
    'reset-filters': () => { e.preventDefault(); app.resetFilters(); },
    'sidebar-tipo': () => app.setSidebarTipo(el.dataset.tipo),
    'close-login': () => document.getElementById('loginModal').classList.add('hidden'),
    'open-admin-login': () => admin.openLogin(),
    'attempt-login': () => admin.attemptLogin(),
    'open-property-form': () => admin.openPropertyForm(null),
    'save-property': () => admin.saveProperty(),
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
