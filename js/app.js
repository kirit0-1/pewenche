import {
  BADGE, CONTACT, FALLBACK_IMAGE, LIST_PAGE_SIZE, REGIONES, SECTION_MAP,
} from './config.js';
import {
  debounce, filterBySearch, getVal, h, setVal, sortProperties, toast, waLink,
} from './utils.js';
import { trackClick, saveLead } from './analytics.js';
import { clpFromUF, getUF, getUFDate, onUFChange } from './uf.js';

const cardIdx = {};
let mIdx = 0;
let mImgs = [];
let currentSection = 'todas';
let filteredList = [];
let visibleCount = LIST_PAGE_SIZE;

const TIPO_LABELS = {
  venta: 'En venta',
  arriendo: 'En arriendo',
  hostal: 'Hostal',
  camping: 'Camping',
  terreno: 'Terreno',
};

export function createApp(store, state) {
  const debouncedApply = debounce(() => {
    syncAllFilterFields();
    applyFilters(state);
  }, 280);

  function populateRegionSelects() {
    ['heroRegion', 'sideRegion', 'mobileSideRegion', 'formRegion'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id !== 'formRegion') el.innerHTML = '<option value="">Todas las regiones</option>';
      REGIONES.forEach(r => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = r;
        el.appendChild(opt);
      });
    });
  }

  function injectContactLinks() {
    document.querySelectorAll('[data-contact="whatsapp"]').forEach(el => {
      el.href = waLink(CONTACT.whatsapp, el.dataset.waText || 'Hola, me interesa una propiedad de Pewenche');
    });
    document.querySelectorAll('[data-contact="whatsapp-display"]').forEach(el => {
      el.textContent = CONTACT.whatsappDisplay;
    });
    document.querySelectorAll('[data-contact="email"]').forEach(el => {
      el.href = `mailto:${CONTACT.email}`;
    });
    document.querySelectorAll('[data-contact="email-display"]').forEach(el => {
      el.textContent = CONTACT.email;
    });
    document.querySelectorAll('[data-contact="instagram"]').forEach(el => {
      el.href = CONTACT.instagram;
    });
    document.querySelectorAll('[data-contact="instagramHandle"]').forEach(el => {
      el.textContent = CONTACT.instagramHandle;
    });
    document.querySelectorAll('[data-contact="facebook"]').forEach(el => {
      el.href = CONTACT.facebook;
    });
    document.querySelectorAll('[data-contact="response"]').forEach(el => {
      el.textContent = CONTACT.responseTime;
    });
  }

  function showContact() {
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active-nav', a.dataset.action === 'show-contact');
    });
    const section = document.getElementById('contacto');
    if (!section) return;
    section.classList.remove('contact-section--highlight');
    void section.offsetWidth;
    section.classList.add('contact-section--highlight');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('contactNombre')?.focus(), 450);
  }

  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    const onScroll = () => {
      const scrolled = window.scrollY > 48;
      header.classList.toggle('site-header--scrolled', scrolled);
      header.classList.toggle('site-header--hero', !scrolled);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  async function submitContactForm(e) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('contactFormStatus');
    const btn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    btn.disabled = true;
    if (status) {
      status.textContent = 'Enviando…';
      status.className = 'text-xs text-center min-h-[1rem] text-zinc-500';
    }
    try {
      await saveLead({
        propertyId: 'general',
        propertyTitle: 'Consulta desde contacto',
        email: fd.get('email'),
        mensaje: fd.get('mensaje'),
        website: fd.get('website'),
      });
      form.reset();
      if (status) {
        status.textContent = 'Consulta enviada. Te responderemos pronto.';
        status.className = 'text-xs text-center min-h-[1rem] text-verde-700 dark:text-green-400';
      }
      toast('Consulta enviada correctamente.');
    } catch (err) {
      if (status) {
        status.textContent = err.message || 'No se pudo enviar.';
        status.className = 'text-xs text-center min-h-[1rem] text-red-600';
      }
    } finally {
      btn.disabled = false;
    }
  }

  function syncAllFilterFields() {
    const tipo = getVal('heroTipo') || getVal('mobileFilterTipo');
    setVal('heroTipo', tipo);
    setVal('mobileFilterTipo', tipo);
    const region = getVal('heroRegion') || getVal('sideRegion') || getVal('mobileSideRegion');
    setVal('heroRegion', region);
    setVal('sideRegion', region);
    setVal('mobileSideRegion', region);
    const maxUF = getVal('sidePrecioMax') || getVal('mobileSidePrecioMax');
    setVal('sidePrecioMax', maxUF);
    setVal('mobileSidePrecioMax', maxUF);
  }

  function updateActiveFilters() {
    const wrap = document.getElementById('activeFilters');
    if (!wrap) return;
    const chips = [];
    const tipo = getVal('heroTipo');
    const region = getVal('heroRegion');
    const search = getVal('searchQuery').trim();
    const maxUF = parseFloat(getVal('sidePrecioMax')) || 0;
    const sectionTipos = SECTION_MAP[currentSection] || [];

    if (sectionTipos.length) {
      const label = currentSection === 'arriendo' ? 'Arriendos' : 'Hostales & Campings';
      chips.push({ key: 'section', label });
    }
    if (tipo) chips.push({ key: 'tipo', label: TIPO_LABELS[tipo] || tipo });
    if (region) chips.push({ key: 'region', label: region });
    if (search) chips.push({ key: 'search', label: `"${search}"` });
    if (maxUF) chips.push({ key: 'precio', label: `≤ ${maxUF.toLocaleString('es-CL')} UF` });

    if (!chips.length) {
      wrap.classList.add('hidden');
      wrap.innerHTML = '';
      return;
    }

    wrap.classList.remove('hidden');
    wrap.innerHTML = `
      <div class="active-filters-inner">
        <span class="active-filters-label"><i class="fa-solid fa-filter mr-1"></i>Filtros activos:</span>
        ${chips.map(c => `
          <button type="button" class="filter-chip" data-action="clear-filter" data-filter="${c.key}">
            ${h(c.label)} <i class="fa-solid fa-xmark ml-1 text-[10px]"></i>
          </button>
        `).join('')}
        <button type="button" class="filter-chip filter-chip--clear" data-action="reset-filters">Limpiar todo</button>
      </div>`;
  }

  function clearFilter(key) {
    switch (key) {
      case 'section':
        currentSection = 'todas';
        state.currentSection = 'todas';
        document.getElementById('sectionTitle').textContent = 'Todas las propiedades';
        setActiveNav('todas');
        break;
      case 'tipo':
        setVal('heroTipo', '');
        setVal('mobileFilterTipo', '');
        break;
      case 'region':
        setVal('heroRegion', '');
        setVal('sideRegion', '');
        break;
      case 'search':
        setVal('searchQuery', '');
        break;
      case 'precio':
        setVal('sidePrecioMax', '');
        break;
      default:
        break;
    }
    applyFilters(state);
  }

  function searchAndScroll() {
    syncAllFilterFields();
    applyFilters(state);
    document.getElementById('listado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadMore() {
    visibleCount += LIST_PAGE_SIZE;
    renderGrid();
  }
  function showSection(name) {
    currentSection = name;
    state.currentSection = name;
    const titles = {
      todas: 'Todas las propiedades',
      arriendo: 'Propiedades en Arriendo',
      hostales: 'Hostales & Campings',
    };
    document.getElementById('sectionTitle').textContent = titles[name] || 'Propiedades';
    setVal('heroTipo', '');
    setVal('heroRegion', '');
    setVal('sideRegion', '');
    setVal('sidePrecioMax', '');
    setVal('mobileFilterTipo', '');
    setVal('searchQuery', '');
    setActiveNav(name);
    applyFilters(state);
    document.getElementById('listado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setActiveNav(name) {
    document.querySelectorAll('.nav-link').forEach(a => {
      if (a.dataset.action === 'show-contact') {
        a.classList.remove('active-nav');
        return;
      }
      a.classList.toggle('active-nav', a.dataset.section === name);
    });
  }

  function syncFilterFields(sourceId) {
    if (sourceId === 'heroTipo' || sourceId === 'mobileFilterTipo') {
      const v = getVal(sourceId);
      setVal('heroTipo', v);
      setVal('mobileFilterTipo', v);
    }
    if (['heroRegion', 'sideRegion', 'mobileSideRegion'].includes(sourceId)) {
      const v = getVal(sourceId);
      setVal('heroRegion', v);
      setVal('sideRegion', v);
      setVal('mobileSideRegion', v);
    }
    if (sourceId === 'sidePrecioMax' || sourceId === 'mobileSidePrecioMax') {
      const v = getVal(sourceId);
      setVal('sidePrecioMax', v);
      setVal('mobileSidePrecioMax', v);
    }
  }

  function applyFilters(st) {
    const tipo = getVal('heroTipo');
    const region = getVal('heroRegion');
    const maxUF = parseFloat(getVal('sidePrecioMax')) || 0;
    const search = getVal('searchQuery');
    const sortBy = getVal('sortBy') || 'relevance';
    const sectionTipos = SECTION_MAP[currentSection] || [];

    let list = st.properties.filter(p => {
      if (sectionTipos.length && !sectionTipos.includes(p.tipo)) return false;
      if (tipo && p.tipo !== tipo) return false;
      if (region && p.region !== region) return false;
      if (maxUF && p.precioUF && p.precioUF > maxUF) return false;
      return true;
    });

    list = filterBySearch(list, search);
    list = sortProperties(list, sortBy);

    document.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });

    filteredList = list;
    visibleCount = LIST_PAGE_SIZE;
    updateActiveFilters();
    renderGrid();
  }

  function setSidebarTipo(tipo) {
    setVal('heroTipo', tipo);
    setVal('mobileFilterTipo', tipo);
    currentSection = 'todas';
    state.currentSection = 'todas';
    setActiveNav('todas');
    applyFilters(state);
  }

  function clearHeroFilters() {
    ['heroTipo', 'heroRegion', 'sideRegion', 'sidePrecioMax', 'mobileSideRegion', 'mobileSidePrecioMax', 'searchQuery', 'mobileFilterTipo'].forEach(id => setVal(id, ''));
    applyFilters(state);
  }

  function resetFilters(st) {
    currentSection = 'todas';
    st.currentSection = 'todas';
    ['heroTipo', 'heroRegion', 'sideRegion', 'sidePrecioMax', 'mobileSideRegion', 'mobileSidePrecioMax', 'mobileFilterTipo', 'searchQuery'].forEach(id => setVal(id, ''));
    setVal('sortBy', 'relevance');
    document.getElementById('sectionTitle').textContent = 'Todas las propiedades';
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
    setActiveNav('todas');
    applyFilters(st);
  }

  function buildChips(p) {
    const items = [];
    if (p.superficie) items.push(`<i class="fa-solid fa-ruler-combined"></i> ${p.superficie} m²`);
    if (p.dorms) items.push(`<i class="fa-solid fa-bed"></i> ${p.dorms}`);
    if (p.banos) items.push(`<i class="fa-solid fa-shower"></i> ${p.banos}`);
    if (p.estac) items.push(`<i class="fa-solid fa-car"></i> ${p.estac}`);
    return items.map(c =>
      `<span class="inline-flex items-center gap-1 bg-beige dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs px-2.5 py-1 rounded-lg font-medium">${c}</span>`
    ).join('');
  }

  function priceCLP(p) {
    return clpFromUF(p.precioUF, p.precioNota || '') || p.precioCLP || '';
  }

  function buildCard(p, animIdx) {
    const imgs = p.imagenes?.length ? p.imagenes : [FALLBACK_IMAGE];
    const badge = BADGE[p.tipo] || { cls: 'bg-gray-600', label: p.tipo };
    const slides = imgs.map(url =>
      `<div class="carousel-slide shrink-0 w-full h-full">
         <img src="${h(url)}" alt="${h(p.titulo)}" class="w-full h-full object-cover" loading="lazy" width="400" height="220"
           onerror="this.src='${FALLBACK_IMAGE}'" />
       </div>`
    ).join('');
    const dots = imgs.length > 1 ? imgs.map((_, i) =>
      `<button type="button" data-action="card-dot" data-id="${p.id}" data-index="${i}" data-total="${imgs.length}"
         class="cdot-${p.id} w-1.5 h-1.5 rounded-full transition-all ${i === 0 ? 'bg-white' : 'bg-white/50'}"
         aria-label="Imagen ${i + 1} de ${imgs.length}"></button>`
    ).join('') : '';

    const div = document.createElement('article');
    div.className = 'prop-card bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm fade-in';
    div.style.animationDelay = `${animIdx * 55}ms`;

    div.innerHTML = `
      <div class="relative overflow-hidden" style="height:220px">
        <div id="ci-${p.id}" class="carousel-inner h-full w-full">${slides}</div>
        ${imgs.length > 1 ? `
        <button type="button" data-action="card-prev" data-id="${p.id}" data-total="${imgs.length}" aria-label="Imagen anterior"
          class="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-zinc-900/80 rounded-full flex items-center justify-center shadow hover:bg-white transition z-10">
          <i class="fa-solid fa-chevron-left text-xs"></i>
        </button>
        <button type="button" data-action="card-next" data-id="${p.id}" data-total="${imgs.length}" aria-label="Imagen siguiente"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-zinc-900/80 rounded-full flex items-center justify-center shadow hover:bg-white transition z-10">
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
        <div class="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">${dots}</div>` : ''}
        <span class="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${badge.cls} text-white uppercase tracking-wide z-10">${badge.label}</span>
      </div>
      <div class="p-5">
        <div class="mb-1">
          <span class="price-uf">${p.precioUF ? p.precioUF.toLocaleString('es-CL') + ' UF' : '—'}</span>
          ${priceCLP(p) ? `<span class="text-zinc-600 dark:text-zinc-300 text-xs ml-2 font-medium">${h(priceCLP(p))}</span>` : ''}
        </div>
        <h3 class="font-bold text-base leading-snug mb-1 text-zinc-900 dark:text-zinc-100">${h(p.titulo)}</h3>
        <p class="text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1 mb-3 font-medium">
          <i class="fa-solid fa-location-dot text-verde-800 dark:text-green-300 shrink-0"></i>
          ${h(p.comuna || '')}${p.region ? ', ' + h(p.region) : ''}
        </p>
        <div class="flex flex-wrap gap-1.5 mb-3">${buildChips(p)}</div>
        <p class="text-zinc-700 dark:text-zinc-200 text-xs leading-relaxed line-clamp-2 mb-4 font-medium">${h(p.desc || '')}</p>
        <div class="flex gap-2">
          <a href="propiedad.html?id=${p.id}" target="_blank" rel="noopener" data-action="open-detail" data-id="${p.id}"
            class="btn-verde flex-1 py-2.5 text-sm text-center">
            <i class="fa-solid fa-up-right-from-square mr-1.5"></i>Ver detalles
          </a>
          <a href="${waLink(CONTACT.whatsapp, `Hola, me interesa ${p.titulo}`)}" target="_blank" rel="noopener"
            class="w-10 h-10 flex items-center justify-center bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl transition shrink-0" aria-label="Consultar por WhatsApp">
            <i class="fa-brands fa-whatsapp text-white"></i>
          </a>
        </div>
      </div>`;
    return div;
  }

  function renderGrid(list) {
    if (Array.isArray(list)) {
      filteredList = list;
      visibleCount = LIST_PAGE_SIZE;
    }

    const grid = document.getElementById('propertiesGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('resultCount');
    const loadWrap = document.getElementById('loadMoreWrap');
    const loadHint = document.getElementById('loadMoreHint');
    const loadBtn = document.getElementById('loadMoreBtn');
    grid.innerHTML = '';

    if (!filteredList.length) {
      empty.classList.remove('hidden');
      loadWrap?.classList.add('hidden');
      count.textContent = 'Sin resultados';
      return;
    }

    empty.classList.add('hidden');
    const shown = filteredList.slice(0, visibleCount);
    const total = filteredList.length;
    const remaining = total - shown.length;

    count.textContent = total === shown.length
      ? `${total} propiedad${total !== 1 ? 'es' : ''} encontrada${total !== 1 ? 's' : ''}`
      : `Mostrando ${shown.length} de ${total} propiedades`;

    shown.forEach((p, i) => grid.appendChild(buildCard(p, i)));

    if (loadWrap && loadBtn) {
      if (remaining > 0) {
        loadWrap.classList.remove('hidden');
        loadHint.textContent = `${remaining} publicación${remaining !== 1 ? 'es' : ''} más disponible${remaining !== 1 ? 's' : ''}`;
        loadBtn.innerHTML = `<i class="fa-solid fa-chevron-down mr-2"></i>Ver más (${remaining})`;
      } else {
        loadWrap.classList.add('hidden');
      }
    }
  }

  function setCI(id, i) {
    cardIdx[id] = i;
    const track = document.getElementById(`ci-${id}`);
    if (track) track.style.transform = `translateX(-${i * 100}%)`;
    document.querySelectorAll(`.cdot-${id}`).forEach((d, j) => {
      d.className = `cdot-${id} w-1.5 h-1.5 rounded-full transition-all ${j === i ? 'bg-white' : 'bg-white/50'}`;
    });
  }

  function openDetail(id) {
    trackClick(id);
    window.open(`propiedad.html?id=${id}`, '_blank', 'noopener');
  }

  function closeDetail() {
    document.getElementById('detailModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function updateMCarousel() {
    document.getElementById('modalCarouselTrack').style.transform = `translateX(-${mIdx * 100}%)`;
    document.querySelectorAll('.mdot').forEach((d, i) => {
      d.className = `mdot w-1.5 h-1.5 rounded-full transition-all ${i === mIdx ? 'bg-white' : 'bg-white/50'}`;
    });
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeIcon').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const icon = document.getElementById('menuIcon');
    const hidden = menu.classList.toggle('hidden');
    icon.className = hidden ? 'fa-solid fa-bars' : 'fa-solid fa-xmark';
    menu.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function updateUFIndicator() {
    const el = document.getElementById('ufIndicator');
    if (!el) return;
    const uf = getUF();
    const date = getUFDate();
    if (!uf) { el.textContent = 'UF: cargando…'; return; }
    el.textContent = `UF $${uf.toLocaleString('es-CL')}${date ? ` · ${date.split('T')[0]}` : ''}`;
  }

  function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
      document.getElementById('themeIcon').className = 'fa-solid fa-sun';
    }
    onUFChange(() => {
      updateUFIndicator();
      applyFilters(state);
    });
    updateUFIndicator();
  }

  function initScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    const toggle = () => btn.classList.toggle('hidden', window.scrollY < 400);
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }

  function bindEvents(st) {
    document.getElementById('propertiesGrid').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, index, total } = btn.dataset;
      if (action === 'open-detail') { trackClick(id); return; }
      if (action === 'card-prev') setCI(id, ((cardIdx[id] || 0) - 1 + +total) % +total);
      if (action === 'card-next') setCI(id, ((cardIdx[id] || 0) + 1) % +total);
      if (action === 'card-dot') setCI(id, +index);
    });

    document.getElementById('detailModal').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn?.dataset.action === 'close-detail') { closeDetail(); return; }
      if (btn?.dataset.action === 'modal-dot') { mIdx = +btn.dataset.index; updateMCarousel(); return; }
      if (btn?.dataset.action === 'modal-prev') { mIdx = (mIdx - 1 + mImgs.length) % mImgs.length; updateMCarousel(); return; }
      if (btn?.dataset.action === 'modal-next') { mIdx = (mIdx + 1) % mImgs.length; updateMCarousel(); return; }
      if (e.target.id === 'detailModal') closeDetail();
    });

    document.getElementById('heroSearchForm')?.addEventListener('submit', e => {
      e.preventDefault();
      searchAndScroll();
    });

    document.getElementById('searchQuery')?.addEventListener('input', () => debouncedApply());
    document.getElementById('searchQuery')?.addEventListener('search', () => applyFilters(st));
    ['heroTipo', 'heroRegion', 'sideRegion', 'sidePrecioMax', 'mobileSideRegion', 'mobileSidePrecioMax', 'mobileFilterTipo', 'sortBy'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const evt = (id === 'sidePrecioMax' || id === 'mobileSidePrecioMax') ? 'input' : 'change';
      el.addEventListener(evt, () => {
        syncFilterFields(id);
        applyFilters(st);
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDetail();
    });

    document.getElementById('contactForm')?.addEventListener('submit', submitContactForm);
    initHeaderScroll();
    initScrollTop();

    if (location.hash === '#contacto') {
      setTimeout(() => showContact(), 300);
    }
    window.addEventListener('hashchange', () => {
      if (location.hash === '#contacto') showContact();
    });
  }

  return {
    populateRegionSelects,
    injectContactLinks,
    showSection,
    showContact,
    searchAndScroll,
    loadMore,
    clearFilter,
    applyFilters: () => { syncAllFilterFields(); applyFilters(state); },
    setSidebarTipo,
    resetFilters: () => resetFilters(state),
    clearHeroFilters: () => clearHeroFilters(),
    renderGrid,
    openDetail,
    closeDetail,
    toggleTheme,
    toggleMobileMenu,
    initTheme,
    bindEvents,
    setActiveNav,
    updateUFIndicator,
    reloadProperties: async () => {
      state.properties = await store.getAll();
      applyFilters(state);
    },
  };
}
