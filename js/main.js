import { SITE, STORAGE_KEY } from './config.js';
import { LocalPropertyStore } from './storage.js';
import { LocalAuthService } from './auth.js';
import { createApp } from './app.js';
import { createAdmin } from './admin.js';
import { startUFService } from './uf.js';
import { onDataChange } from './analytics.js';

const store = new LocalPropertyStore();
const auth = new LocalAuthService();

const state = {
  properties: [],
  currentSection: 'todas',
};

const app = createApp(store, state);
const admin = createAdmin(store, auth, state, app);

async function init() {
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

  if (window.location.hash === '#/admin') admin.goAdmin();

  onDataChange(async key => {
    if (key === STORAGE_KEY) await app.reloadProperties();
    if (auth.isAuthenticated()) await admin.refreshFromStore();
  });
}

/* Delegación de acciones globales (data-action en HTML estático) */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('#propertiesGrid, #adminTableBody, #detailModal')) return;

  const action = el.dataset.action;
  const handlers = {
    'toggle-theme': () => app.toggleTheme(),
    'toggle-menu': () => app.toggleMobileMenu(),
    'apply-filters': () => app.applyFilters(),
    'reset-filters': () => { e.preventDefault(); app.resetFilters(); },
    'sidebar-tipo': () => app.setSidebarTipo(el.dataset.tipo),
    'close-login': () => document.getElementById('loginModal').classList.add('hidden'),
    'attempt-login': () => admin.attemptLogin(),
    'open-property-form': () => admin.openPropertyForm(null),
    'close-property-form': () => admin.closePropertyForm(),
    'save-property': () => admin.saveProperty(),
    'close-detail': () => app.closeDetail(),
    'logout-admin': () => admin.logoutAdmin(),
    'show-section': () => { e.preventDefault(); app.showSection(el.dataset.section); },
  };

  const fn = handlers[action];
  if (fn) {
    if (action !== 'reset-filters') e.preventDefault();
    fn();
    if (action === 'show-section' && el.closest('#mobileMenu')) app.toggleMobileMenu();
  }
});

init();
