/**
 * HookTab - Core Logic Engine
 * Manages 100+ Bookmarks, Google Search, Wallpaper & Theme Studio, and Sync
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STATE MANAGEMENT & STORAGE ADAPTER
  // =========================================================================
  const state = {
    bookmarks: [],
    pages: ['Personal', 'Work', 'Projects'],
    activePage: 'Personal',
    privacyMode: false,
    activeCategory: 'All',
    searchQuery: '',
    currentLayout: 'board', // 'board' (Google Keep Boards) | 'cards' | 'compact' | 'list'
    currentSort: 'recent',
    searchEngine: 'google',
    customEngines: [],
    removedEngines: [], // Built-in engines removed by user
    searchMode: 'web', // 'web' | 'bookmarks'
    theme: 'midnight',
    accentColor: '#6366f1',
    accentColor2: '#ec4899',
    wallpaper: 'aurora',
    customWallpaperData: null,
    blur: 8,
    darkness: 50,
    quickNotes: '',
    timeFormat: '24', // '12' | '24'
    weatherUnit: 'C',
    weatherCache: null,
    quickAccessMode: 'frequent', // 'frequent' | 'recent'
    recentSites: [],
    customTopSites: [], // User custom added sites
    removedTopSites: [], // URLs removed/hidden by user from top sites
    topSitesHidden: false, // Whether top sites row is hidden
    topSitesShowMore: false, // false = 1 row (7 items), true = 2 rows
    topSitesPage: 0, // 0 = page 1, 1 = page 2
    customBoards: ['Other bookmarks', 'kk', 'kl']
  };

  // Safe wrapper for chrome.storage or fallback to window.localStorage
  const storage = {
    get: function (keys, callback) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(keys, callback);
      } else {
        const result = {};
        for (const k of keys) {
          const val = localStorage.getItem('hooktab_' + k) || localStorage.getItem('nexustab_' + k);
          if (val !== null) {
            try {
              result[k] = JSON.parse(val);
            } catch (e) {
              result[k] = val;
            }
          }
        }
        callback(result);
      }
    },
    set: function (items, callback) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(items, callback);
      } else {
        for (const [k, v] of Object.entries(items)) {
          localStorage.setItem('hooktab_' + k, JSON.stringify(v));
        }
        if (callback) callback();
      }
    }
  };

  // =========================================================================
  // 2. DOM ELEMENTS CACHE
  // =========================================================================
  const dom = {
    bgImage: document.getElementById('bg-image'),
    liveCanvas: document.getElementById('live-canvas'),
    bgOverlay: document.getElementById('bg-overlay'),
    timeWidget: document.getElementById('time-widget'),
    clock: document.getElementById('clock-display'),
    greeting: document.getElementById('greeting-display'),
    date: document.getElementById('date-display'),
    btnTime12: document.getElementById('btn-time-12'),
    btnTime24: document.getElementById('btn-time-24'),
    timeFormatPill: document.getElementById('time-format-pill'),
    bookmarksCountPill: document.getElementById('bookmarks-count-pill'),
    btnSyncBrave: document.getElementById('btn-sync-brave'),
    
    // Layout toggles
    layoutCards: document.getElementById('layout-cards'),
    layoutBoard: document.getElementById('layout-board'),
    layoutCompact: document.getElementById('layout-compact'),
    layoutList: document.getElementById('layout-list'),

    // Search & Input
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnVoiceSearch: document.getElementById('btn-voice-search'),
    btnEngineTrigger: document.getElementById('btn-engine-trigger'),
    activeEngineIcon: document.getElementById('active-engine-icon'),
    enginePopover: document.getElementById('engine-popover'),
    engineList: document.getElementById('engine-list'),
    btnAddEngine: document.getElementById('btn-add-engine'),
    btnDrawerAddEngine: document.getElementById('btn-drawer-add-engine'),
    btnRemoveAllEngines: document.getElementById('btn-remove-all-engines'),
    btnRestoreEngines: document.getElementById('btn-restore-engines'),
    drawerEngineList: document.getElementById('drawer-engine-list'),
    searchSuggestions: document.getElementById('search-suggestions'),
    modeWeb: document.getElementById('mode-web'),
    modeBookmarks: document.getElementById('mode-bookmarks'),

    // Quick Access / Brave Top Sites
    quickAccessBar: document.getElementById('quick-access-bar'),
    quickAccessGrid: document.getElementById('quick-access-grid'),
    btnTopSitesMenu: document.getElementById('btn-top-sites-menu'),
    topSitesMenuPopover: document.getElementById('top-sites-menu-popover'),
    menuAddSite: document.getElementById('menu-add-site'),
    menuToggleMore: document.getElementById('menu-toggle-more'),
    labelToggleMore: document.getElementById('label-toggle-more'),
    menuToggleFrequent: document.getElementById('menu-toggle-frequent'),
    labelToggleFrequent: document.getElementById('label-toggle-frequent'),
    menuRestoreDivider: document.getElementById('menu-restore-divider'),
    menuRestoreSites: document.getElementById('menu-restore-sites'),
    menuHideSites: document.getElementById('menu-hide-sites'),
    topSitesPagination: document.getElementById('top-sites-pagination'),
    btnToggleTopSitesVis: document.getElementById('btn-toggle-top-sites-vis'),
    labelTopSitesVis: document.getElementById('label-top-sites-vis'),
    drawerTopSitesRestoreRow: document.getElementById('drawer-top-sites-restore-row'),
    drawerTopSitesRestoreCount: document.getElementById('drawer-top-sites-restore-count'),
    btnDrawerRestoreTopSites: document.getElementById('btn-drawer-restore-top-sites'),

    // Add Top Site Modal
    topSiteModal: document.getElementById('top-site-modal'),
    topSiteForm: document.getElementById('top-site-form'),
    topSiteName: document.getElementById('top-site-name'),
    topSiteUrl: document.getElementById('top-site-url'),
    btnCloseTopSiteModal: document.getElementById('btn-close-top-site-modal'),
    btnCancelTopSiteModal: document.getElementById('btn-cancel-top-site-modal'),

    // Privacy Mode (Screen Share Blur)
    btnPrivacyToggle: document.getElementById('btn-privacy-toggle'),
    privacyBanner: document.getElementById('privacy-banner'),
    btnExitPrivacy: document.getElementById('btn-exit-privacy'),

    // Multiple Pages
    pagesBar: document.getElementById('pages-bar'),
    pagesTabs: document.getElementById('pages-tabs'),
    btnAddPage: document.getElementById('btn-add-page'),

    // Bookmarks Hub
    categoryTabs: document.getElementById('category-tabs'),
    bookmarkFilterInput: document.getElementById('bookmark-filter-input'),
    sortSelect: document.getElementById('sort-select'),
    bookmarksGrid: document.getElementById('bookmarks-grid'),
    lumilistBoard: document.getElementById('lumilist-board'),
    bookmarksSentinel: document.getElementById('bookmarks-sentinel'),
    sentinelText: document.getElementById('sentinel-text'),
    emptyState: document.getElementById('empty-state'),
    btnAddBookmark: document.getElementById('btn-add-bookmark'),
    btnEmptyAdd: document.getElementById('btn-empty-add'),
    btnEmptyImport: document.getElementById('btn-empty-import'),
    btnImportBrowser: document.getElementById('btn-import-browser'),
    btnAutoCategorize: document.getElementById('btn-auto-categorize'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnExportHtml: document.getElementById('btn-export-html'),
    btnDrawerExport: document.getElementById('btn-drawer-export'),
    btnDrawerExportHtml: document.getElementById('btn-drawer-export-html'),
    btnDrawerAutoCategorize: document.getElementById('btn-drawer-auto-categorize'),
    btnDrawerSyncCloud: document.getElementById('btn-drawer-sync-cloud'),
    btnConfigureShortcuts: document.getElementById('btn-configure-shortcuts'),
    importFileInput: document.getElementById('import-file-input'),

    // Customizer Drawer
    btnOpenCustomizer: document.getElementById('btn-open-customizer'),
    btnCloseCustomizer: document.getElementById('btn-close-customizer'),
    customizerDrawer: document.getElementById('customizer-drawer'),
    themeCards: document.querySelectorAll('.theme-card'),
    accentColorInput: document.getElementById('accent-color-input'),
    accentHexLabel: document.getElementById('accent-hex-label'),
    accentColor2Input: document.getElementById('accent-color-2-input'),
    accentHex2Label: document.getElementById('accent-hex-2-label'),
    gradientPreviewBadge: document.getElementById('gradient-preview-badge'),
    wallpaperCards: document.querySelectorAll('.wallpaper-card'),
    wallpaperUploadInput: document.getElementById('wallpaper-upload-input'),
    sliderBlur: document.getElementById('slider-blur'),
    sliderDarkness: document.getElementById('slider-darkness'),
    blurVal: document.getElementById('blur-val'),
    darknessVal: document.getElementById('darkness-val'),
    btnClearAll: document.getElementById('btn-clear-all'),

    // Mini Weather Widget
    weatherWidget: document.getElementById('weather-widget'),
    weatherIcon: document.getElementById('weather-icon'),
    weatherTemp: document.getElementById('weather-temp'),
    weatherCity: document.getElementById('weather-city'),
    weatherDesc: document.getElementById('weather-desc'),

    // Quick Notes
    btnNotesToggle: document.getElementById('btn-notes-toggle'),
    notesWidget: document.getElementById('notes-widget'),
    btnCloseNotes: document.getElementById('btn-close-notes'),
    notesTextarea: document.getElementById('notes-textarea'),
    notesStatus: document.getElementById('notes-status'),
    btnClearNotes: document.getElementById('btn-clear-notes'),

    // Bookmark Modal
    bookmarkModal: document.getElementById('bookmark-modal'),
    bookmarkForm: document.getElementById('bookmark-form'),
    modalTitle: document.getElementById('modal-title'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    bmId: document.getElementById('bm-id'),
    bmUrl: document.getElementById('bm-url'),
    bmTitle: document.getElementById('bm-title'),
    bmPage: document.getElementById('bm-page'),
    bmCategory: document.getElementById('bm-category'),
    bmTags: document.getElementById('bm-tags'),
    bmFavorite: document.getElementById('bm-favorite'),
    btnAutoFill: document.getElementById('btn-auto-fill'),

    // Custom Search Engine Modal
    engineModal: document.getElementById('engine-modal'),
    engineForm: document.getElementById('engine-form'),
    btnCloseEngineModal: document.getElementById('btn-close-engine-modal'),
    btnCancelEngineModal: document.getElementById('btn-cancel-engine-modal'),
    customEngName: document.getElementById('custom-eng-name'),
    customEngUrl: document.getElementById('custom-eng-url'),
    customEngIcon: document.getElementById('custom-eng-icon'),

    // Bug Report & Feedback Modal
    btnReportBug: document.getElementById('btn-report-bug'),
    bugModal: document.getElementById('bug-modal'),
    bugForm: document.getElementById('bug-form'),
    btnCloseBugModal: document.getElementById('btn-close-bug-modal'),
    btnCancelBugModal: document.getElementById('btn-cancel-bug-modal'),
    btnCopyDiagnostics: document.getElementById('btn-copy-diagnostics'),
    bugType: document.getElementById('bug-type'),
    bugTitle: document.getElementById('bug-title'),
    bugDescription: document.getElementById('bug-description'),
    bugDiagnostics: document.getElementById('bug-diagnostics'),

    toast: document.getElementById('toast')
  };

  // =========================================================================
  // 3. SEARCH ENGINES & CONFIGURATION
  // =========================================================================
  const SEARCH_ENGINES = {
    google: {
      name: 'Google',
      url: 'https://www.google.com/search?q=',
      svg: `<svg width="22" height="22" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`
    },
    brave: {
      name: 'Brave Search',
      url: 'https://search.brave.com/search?q=',
      svg: `<svg width="22" height="22" viewBox="0 0 32 32"><path fill="#FB542B" d="M27.7 11.2c-.4-1.2-1.7-2.6-3.8-3.6l-6.8-3.3c-.6-.3-1.6-.3-2.2 0L8.1 7.6C6 8.6 4.7 10 4.3 11.2c-.8 2.3-.3 6.1 1.2 8.4l2.1 3.2 4.4 5c2.3 2.6 5.7 2.6 8 0l4.4-5 2.1-3.2c1.5-2.3 2-6.1 1.2-8.4zm-6.2 9.5l-3 1.5c-1.6.8-3.4.8-5 0l-3-1.5c-.8-.4-1.2-1.2-1.1-2.1.2-1.3 1.1-2.4 2.4-2.8l4.2-1.3c.7-.2 1.4-.2 2.1 0l4.2 1.3c1.3.4 2.2 1.5 2.4 2.8.1.9-.3 1.7-1.1 2.1z"/><circle cx="11.5" cy="13.5" r="1.5" fill="#FFF"/><circle cx="20.5" cy="13.5" r="1.5" fill="#FFF"/></svg>`
    },
    duckduckgo: {
      name: 'DuckDuckGo',
      url: 'https://duckduckgo.com/?q=',
      svg: `<svg width="22" height="22" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#DE5833"/><ellipse cx="16" cy="15" rx="9" ry="8.5" fill="#FFF"/><ellipse cx="16" cy="16" rx="6.5" ry="5.5" fill="#DE5833"/><ellipse cx="16" cy="18.5" rx="5" ry="3.5" fill="#F8A729"/><circle cx="13" cy="12" r="1.8" fill="#333"/><circle cx="19" cy="12" r="1.8" fill="#333"/><circle cx="13.5" cy="11.5" r="0.6" fill="#FFF"/><circle cx="19.5" cy="11.5" r="0.6" fill="#FFF"/><path d="M12 24l4 2 4-2-1 3-3-1-3 1z" fill="#4B9B48"/></svg>`
    },
    bing: {
      name: 'Microsoft Bing',
      url: 'https://www.bing.com/search?q=',
      svg: `<svg width="22" height="22" viewBox="0 0 32 32"><path fill="#008373" d="M5 3l8 2.8v16.4l7.2-4.2-3.6-7.8 7.4-2.6 3 6.6v8.2L13 29.5 5 24.8z"/><path fill="#00BC9F" d="M13 5.8l7 14.8-7 4.1z"/></svg>`
    },
    youtube: {
      name: 'YouTube',
      url: 'https://www.youtube.com/results?search_query=',
      svg: `<svg width="22" height="22" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#FF0000"/><polygon points="12,9 23,16 12,23" fill="#FFFFFF"/></svg>`
    },
    github: {
      name: 'GitHub',
      url: 'https://github.com/search?q=',
      svg: `<svg width="22" height="22" viewBox="0 0 32 32"><path fill="currentColor" fill-rule="evenodd" d="M16 2C8.27 2 2 8.27 2 16c0 6.19 4.01 11.43 9.58 13.28.7.13.96-.3.96-.67v-2.37c-3.9.85-4.72-1.88-4.72-1.88-.64-1.62-1.56-2.05-1.56-2.05-1.27-.87.1-.85.1-.85 1.41.1 2.15 1.45 2.15 1.45 1.25 2.14 3.28 1.52 4.08 1.16.13-.9.49-1.52.89-1.87-3.11-.35-6.38-1.56-6.38-6.93 0-1.53.55-2.78 1.44-3.76-.14-.35-.63-1.78.14-3.71 0 0 1.18-.38 3.85 1.44a13.4 13.4 0 0 1 7.02 0c2.67-1.82 3.85-1.44 3.85-1.44.77 1.93.28 3.36.14 3.71.9.98 1.44 2.23 1.44 3.76 0 5.38-3.28 6.57-6.4 6.92.5.43.95 1.28.95 2.58v3.83c0 .38.26.81.97.67C25.99 27.43 30 22.19 30 16c0-7.73-6.27-14-14-14z"/></svg>`
    }
  };

  function getEngineConfig(engineKey) {
    if (SEARCH_ENGINES[engineKey] && (!state.removedEngines || !state.removedEngines.includes(engineKey))) {
      return SEARCH_ENGINES[engineKey];
    }
    const custom = (state.customEngines || []).find(e => e.id === engineKey);
    if (custom) {
      const faviconUrl = custom.iconUrl || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(custom.url)}`;
      return {
        name: custom.name,
        url: custom.url,
        isCustom: true,
        svg: `<img class="engine-img-icon" src="${escapeHtml(faviconUrl)}" alt="${escapeHtml(custom.name)}" data-initials="${escapeHtml(custom.name.slice(0, 2).toUpperCase())}">`
      };
    }
    return SEARCH_ENGINES.google;
  }

  function setSearchEngine(engineKey) {
    if (state.removedEngines && state.removedEngines.includes(engineKey)) {
      engineKey = 'google';
    }
    const config = getEngineConfig(engineKey);
    state.searchEngine = engineKey;
    if (dom.activeEngineIcon) {
      dom.activeEngineIcon.innerHTML = config.svg;
    }
    if (dom.btnEngineTrigger) {
      dom.btnEngineTrigger.title = `${config.name}${engineKey === 'google' ? ' (Default)' : ''} • Click to switch`;
    }
    if (dom.searchInput && state.searchMode === 'web') {
      dom.searchInput.placeholder = `Search ${config.name} or type URL... (Press / to focus)`;
    }
    if (dom.modeWeb) {
      dom.modeWeb.textContent = config.name || 'Google';
      dom.modeWeb.title = `Search ${config.name} / Web`;
    }
    if (dom.searchForm) {
      dom.searchForm.action = config.url;
    }
    if (dom.engineList) {
      const btns = dom.engineList.querySelectorAll('.engine-choice-btn');
      btns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.engine === engineKey);
      });
    }
    storage.set({ searchEngine: engineKey });
  }

  function removeEngine(engineId, isCustom) {
    if (engineId === 'google') {
      showToast('Google is the default search engine and cannot be removed.');
      return;
    }

    if (isCustom) {
      const target = (state.customEngines || []).find(e => e.id === engineId);
      const name = target ? target.name : 'Custom engine';
      state.customEngines = (state.customEngines || []).filter(e => e.id !== engineId);
      storage.set({ customEngines: state.customEngines });
      showToast(`Removed "${name}"`);
    } else {
      if (!state.removedEngines) state.removedEngines = [];
      if (!state.removedEngines.includes(engineId)) {
        state.removedEngines.push(engineId);
      }
      storage.set({ removedEngines: state.removedEngines });
      const engName = SEARCH_ENGINES[engineId] ? SEARCH_ENGINES[engineId].name : engineId;
      showToast(`Removed "${engName}"`);
    }

    // If the active engine was removed, fallback to Google default
    if (state.searchEngine === engineId) {
      setSearchEngine('google');
    }

    renderEngineChoices();
  }

  function removeAllEngines() {
    const builtInOthers = Object.keys(SEARCH_ENGINES).filter(k => k !== 'google');
    const hasCustom = state.customEngines && state.customEngines.length > 0;
    const hasRemovableBuiltIn = builtInOthers.some(k => !state.removedEngines.includes(k));

    if (!hasCustom && !hasRemovableBuiltIn) {
      showToast('Only Google (Default) is currently active.');
      return;
    }

    if (confirm('Remove all search engines except Google? You can restore default engines at any time.')) {
      state.removedEngines = builtInOthers;
      state.customEngines = [];
      storage.set({
        removedEngines: state.removedEngines,
        customEngines: state.customEngines
      });
      setSearchEngine('google');
      renderEngineChoices();
      showToast('All search engines removed! Google is default.');
    }
  }

  function restoreDefaultEngines() {
    state.removedEngines = [];
    storage.set({ removedEngines: [] });
    renderEngineChoices();
    showToast('Default search engines restored!');
  }

  function renderEngineChoices() {
    if (!dom.engineList) return;
    dom.engineList.innerHTML = '';

    // Render built-in engines (excluding removed ones)
    Object.keys(SEARCH_ENGINES).forEach(key => {
      if (state.removedEngines && state.removedEngines.includes(key)) return;
      const eng = SEARCH_ENGINES[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `engine-choice-btn ${state.searchEngine === key ? 'active' : ''}`;
      btn.dataset.engine = key;
      btn.title = key === 'google' ? 'Google (Default Search Engine)' : `${eng.name} • Right-click to remove`;
      btn.innerHTML = eng.svg;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setSearchEngine(key);
        dom.enginePopover.classList.add('hidden');
        showToast(`Switched to ${eng.name}`);
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (key === 'google') {
          showToast('Google is the default search engine.');
          return;
        }
        if (confirm(`Remove "${eng.name}" from search engines?`)) {
          removeEngine(key, false);
        }
      });
      dom.engineList.appendChild(btn);
    });

    // Render custom engines added by user
    if (state.customEngines && state.customEngines.length > 0) {
      state.customEngines.forEach(custom => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `engine-choice-btn ${state.searchEngine === custom.id ? 'active' : ''}`;
        btn.dataset.engine = custom.id;
        btn.title = `${custom.name} (Custom Engine) • Right-click to remove`;
        const faviconUrl = custom.iconUrl || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(custom.url)}`;
        btn.innerHTML = `<img class="engine-img-icon" src="${escapeHtml(faviconUrl)}" alt="${escapeHtml(custom.name)}" data-initials="${escapeHtml(custom.name.slice(0, 2).toUpperCase())}">`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          setSearchEngine(custom.id);
          dom.enginePopover.classList.add('hidden');
          showToast(`Switched to ${custom.name}`);
        });
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (confirm(`Remove custom engine "${custom.name}"?`)) {
            removeEngine(custom.id, true);
          }
        });
        dom.engineList.appendChild(btn);
      });
    }

    renderDrawerEngineList();
  }

  function renderDrawerEngineList() {
    if (!dom.drawerEngineList) return;
    dom.drawerEngineList.innerHTML = '';

    // Show or hide restore default engines button
    if (dom.btnRestoreEngines) {
      const hasRemovedBuiltIns = state.removedEngines && state.removedEngines.length > 0;
      dom.btnRestoreEngines.style.display = hasRemovedBuiltIns ? 'inline-flex' : 'none';
    }

    // 1. Google (Default engine, permanently pinned and protected)
    const googleItem = document.createElement('div');
    googleItem.className = `drawer-engine-item ${state.searchEngine === 'google' ? 'active' : ''}`;
    googleItem.innerHTML = `
      <div class="drawer-engine-info" style="cursor: pointer;" title="Google (Default Engine) • Click to activate">
        <span class="drawer-engine-icon">${SEARCH_ENGINES.google.svg}</span>
        <span class="drawer-engine-name">Google</span>
        ${state.searchEngine === 'google' ? '<span class="engine-active-indicator" title="Currently Active"></span>' : ''}
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="engine-default-badge">Default</span>
      </div>
    `;
    googleItem.querySelector('.drawer-engine-info').addEventListener('click', () => {
      setSearchEngine('google');
      renderDrawerEngineList();
      showToast('Switched to Google (Default)');
    });
    dom.drawerEngineList.appendChild(googleItem);

    // 2. Built-in engines (that haven't been removed)
    Object.keys(SEARCH_ENGINES).forEach(key => {
      if (key === 'google') return;
      if (state.removedEngines && state.removedEngines.includes(key)) return;

      const eng = SEARCH_ENGINES[key];
      const item = document.createElement('div');
      item.className = `drawer-engine-item ${state.searchEngine === key ? 'active' : ''}`;
      item.innerHTML = `
        <div class="drawer-engine-info" style="cursor: pointer;" title="Click to activate">
          <span class="drawer-engine-icon">${eng.svg}</span>
          <span class="drawer-engine-name">${escapeHtml(eng.name)}</span>
          ${state.searchEngine === key ? '<span class="engine-active-indicator" title="Currently Active"></span>' : ''}
        </div>
        <button type="button" class="ghost-btn xs danger" style="padding: 2px 7px;" title="Remove ${escapeHtml(eng.name)}">Delete</button>
      `;

      item.querySelector('.drawer-engine-info').addEventListener('click', () => {
        setSearchEngine(key);
        renderDrawerEngineList();
        showToast(`Switched to ${eng.name}`);
      });

      const delBtn = item.querySelector('button');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeEngine(key, false);
      });

      dom.drawerEngineList.appendChild(item);
    });

    // 3. Custom search engines
    if (state.customEngines && state.customEngines.length > 0) {
      state.customEngines.forEach(custom => {
        const item = document.createElement('div');
        item.className = `drawer-engine-item ${state.searchEngine === custom.id ? 'active' : ''}`;
        const faviconUrl = custom.iconUrl || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(custom.url)}`;
        item.innerHTML = `
          <div class="drawer-engine-info" style="cursor: pointer;" title="Click to activate">
            <span class="drawer-engine-icon">
              <img class="engine-img-icon" src="${escapeHtml(faviconUrl)}" alt="${escapeHtml(custom.name)}" data-initials="${escapeHtml(custom.name.slice(0, 2).toUpperCase())}">
            </span>
            <span class="drawer-engine-name">${escapeHtml(custom.name)}</span>
            <span style="font-size: 0.65rem; color: var(--text-muted);">(Custom)</span>
            ${state.searchEngine === custom.id ? '<span class="engine-active-indicator" title="Currently Active"></span>' : ''}
          </div>
          <button type="button" class="ghost-btn xs danger" style="padding: 2px 7px;" title="Delete ${escapeHtml(custom.name)}">Delete</button>
        `;

        item.querySelector('.drawer-engine-info').addEventListener('click', () => {
          setSearchEngine(custom.id);
          renderDrawerEngineList();
          showToast(`Switched to ${custom.name}`);
        });

        const delBtn = item.querySelector('button');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeEngine(custom.id, true);
        });

        dom.drawerEngineList.appendChild(item);
      });
    }

    // 4. Subtle note if all other engines were removed
    const builtInOthers = Object.keys(SEARCH_ENGINES).filter(k => k !== 'google');
    const remainingBuiltIns = builtInOthers.filter(k => !state.removedEngines.includes(k));
    const customCount = (state.customEngines || []).length;
    if (remainingBuiltIns.length === 0 && customCount === 0) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 6px 0; text-align: center;';
      note.textContent = 'Only Google (Default) is enabled. Click "Add Engine" or "Restore Default Engines" to add more.';
      dom.drawerEngineList.appendChild(note);
    }
  }

  function init() {
    loadSettings(function () {
      initClockAndGreeting();
      initWeather();
      initQuickAccess();
      applyTheme(state.theme);
      applyAccent(state.accentColor, state.accentColor2);
      applyWallpaper(state.wallpaper, state.customWallpaperData);
      applyLayout(state.currentLayout);
      applySliders(state.blur, state.darkness);
      renderEngineChoices();
      setSearchEngine(state.searchEngine || 'google');
      renderPagesBar();
      populatePageSelect();
      renderCategoryTabs();
      renderBookmarks();
      setupEventListeners();
      checkBraveBookmarksAvailable();
    });
  }

  function loadSettings(callback) {
    const keys = [
      'bookmarks',
      'pages',
      'activePage',
      'privacyMode',
      'theme',
      'accentColor',
      'accentColor2',
      'wallpaper',
      'customWallpaperData',
      'blur',
      'darkness',
      'currentLayout',
      'currentSort',
      'searchEngine',
      'customEngines',
      'removedEngines',
      'quickNotes',
      'timeFormat',
      'weatherUnit',
      'weatherCache',
      'quickAccessMode',
      'recentSites',
      'customBoards',
      'customTopSites',
      'removedTopSites',
      'topSitesHidden',
      'topSitesShowMore'
    ];

    storage.get(keys, function (data) {
      if (data.bookmarks && Array.isArray(data.bookmarks)) {
        state.bookmarks = data.bookmarks;
      } else {
        state.bookmarks = [];
        storage.set({ bookmarks: state.bookmarks });
      }

      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        state.pages = data.pages;
      } else {
        state.pages = ['Personal', 'Work', 'Projects'];
      }

      if (data.activePage && state.pages.includes(data.activePage)) {
        state.activePage = data.activePage;
      } else {
        state.activePage = state.pages[0] || 'Personal';
      }

      if (typeof data.privacyMode === 'boolean') {
        state.privacyMode = data.privacyMode;
        if (state.privacyMode) {
          document.body.classList.add('privacy-mode');
          if (dom.btnPrivacyToggle) dom.btnPrivacyToggle.classList.add('active');
          if (dom.privacyBanner) dom.privacyBanner.classList.remove('hidden');
        }
      }

      if (data.customEngines && Array.isArray(data.customEngines)) {
        state.customEngines = data.customEngines;
      } else {
        state.customEngines = [];
      }

      if (data.removedEngines && Array.isArray(data.removedEngines)) {
        state.removedEngines = data.removedEngines;
      } else {
        state.removedEngines = [];
      }

      if (data.theme) state.theme = data.theme;
      if (data.accentColor) state.accentColor = data.accentColor;
      if (data.accentColor2) state.accentColor2 = data.accentColor2;
      if (data.timeFormat === '12' || data.timeFormat === '24') state.timeFormat = data.timeFormat;
      if (data.weatherUnit) state.weatherUnit = data.weatherUnit;
      if (data.weatherCache) state.weatherCache = data.weatherCache;
      if (data.wallpaper) state.wallpaper = data.wallpaper;
      if (data.customWallpaperData) state.customWallpaperData = data.customWallpaperData;
      if (typeof data.blur === 'number') state.blur = data.blur;
      if (typeof data.darkness === 'number') state.darkness = data.darkness;
      if (data.currentLayout) state.currentLayout = data.currentLayout;
      if (data.currentSort) state.currentSort = data.currentSort;
      if (data.searchEngine) state.searchEngine = data.searchEngine;

      // If loaded engine was removed, fallback to Google default
      if (state.removedEngines.includes(state.searchEngine)) {
        state.searchEngine = 'google';
        storage.set({ searchEngine: 'google' });
      }
      if (data.quickNotes) {
        state.quickNotes = data.quickNotes;
        if (dom.notesTextarea) dom.notesTextarea.value = data.quickNotes;
      }
      if (data.quickAccessMode) {
        state.quickAccessMode = data.quickAccessMode;
      }
      if (data.recentSites && Array.isArray(data.recentSites)) {
        state.recentSites = data.recentSites;
      } else {
        state.recentSites = [];
      }
      if (data.customBoards && Array.isArray(data.customBoards) && data.customBoards.length > 0) {
        state.customBoards = data.customBoards;
      } else {
        state.customBoards = ['Other bookmarks', 'kk', 'kl'];
      }
      if (Array.isArray(data.customTopSites)) {
        state.customTopSites = data.customTopSites;
      } else {
        state.customTopSites = [];
      }
      if (Array.isArray(data.removedTopSites)) {
        state.removedTopSites = data.removedTopSites;
      } else {
        state.removedTopSites = [];
      }
      if (typeof data.topSitesHidden === 'boolean') {
        state.topSitesHidden = data.topSitesHidden;
      }
      if (typeof data.topSitesShowMore === 'boolean') {
        state.topSitesShowMore = data.topSitesShowMore;
      }

      callback();
    });
  }

  // =========================================================================
  // 4. CLOCK, GREETING & DATE DISPLAY
  // =========================================================================
  function updateClockDisplay() {
    const now = new Date();
    const rawHours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');

    if (state.timeFormat === '12') {
      const ampm = rawHours >= 12 ? 'PM' : 'AM';
      let hours12 = rawHours % 12;
      if (hours12 === 0) hours12 = 12;
      if (dom.clock) {
        dom.clock.innerHTML = `${hours12}:${minutes} <span class="clock-ampm">${ampm}</span>`;
      }
    } else {
      const hours24 = String(rawHours).padStart(2, '0');
      if (dom.clock) {
        dom.clock.textContent = `${hours24}:${minutes}`;
      }
    }

    // Date: e.g., Monday, October 26
    const dateOpts = { weekday: 'long', month: 'short', day: 'numeric' };
    if (dom.date) dom.date.textContent = now.toLocaleDateString(undefined, dateOpts);

    // Greeting based on hour
    const hr = now.getHours();
    let greeting = 'Good evening';
    if (hr >= 5 && hr < 12) greeting = 'Good morning';
    else if (hr >= 12 && hr < 17) greeting = 'Good afternoon';
    else if (hr >= 17 && hr < 22) greeting = 'Good evening';
    else greeting = 'Night owl mode';

    if (dom.greeting) dom.greeting.textContent = greeting;
  }

  function setTimeFormat(format) {
    if (format !== '12' && format !== '24') return;
    state.timeFormat = format;
    storage.set({ timeFormat: state.timeFormat });
    updateTimeFormatUI();
    updateClockDisplay();
    showToast(`Time format: ${format === '12' ? '12-hour (AM/PM)' : '24-hour'}`);
  }

  function toggleTimeFormat() {
    setTimeFormat(state.timeFormat === '12' ? '24' : '12');
  }

  function updateTimeFormatUI() {
    if (dom.btnTime12) dom.btnTime12.classList.toggle('active', state.timeFormat === '12');
    if (dom.btnTime24) dom.btnTime24.classList.toggle('active', state.timeFormat === '24');
    if (dom.timeWidget) {
      dom.timeWidget.title = `Clock (${state.timeFormat}-hour format) • Click to toggle 12h / 24h`;
    }
  }

  function initClockAndGreeting() {
    updateClockDisplay();
    updateTimeFormatUI();
    setInterval(updateClockDisplay, 1000);
  }

  // =========================================================================
  // 5. THEMES & WALLPAPER STUDIO
  // =========================================================================
  function applyTheme(themeName) {
    state.theme = themeName;
    document.body.setAttribute('data-theme', themeName);
    dom.themeCards.forEach(card => {
      card.classList.toggle('active', card.dataset.setTheme === themeName);
    });
    storage.set({ theme: themeName });
  }

  function applyAccent(colorHex1, colorHex2) {
    if (!colorHex1) colorHex1 = '#6366f1';
    if (!colorHex2) colorHex2 = '#ec4899';
    state.accentColor = colorHex1;
    state.accentColor2 = colorHex2;

    const gradient = `linear-gradient(135deg, ${colorHex1}, ${colorHex2})`;
    document.documentElement.style.setProperty('--accent-color', colorHex1);
    document.documentElement.style.setProperty('--accent-color-2', colorHex2);
    document.documentElement.style.setProperty('--accent-gradient', gradient);
    // Darker hover tint and glow
    document.documentElement.style.setProperty('--accent-hover', colorHex1 + 'cc');
    document.documentElement.style.setProperty('--accent-glow', colorHex1 + '4d');

    if (dom.accentColorInput) dom.accentColorInput.value = colorHex1;
    if (dom.accentHexLabel) dom.accentHexLabel.textContent = colorHex1.toUpperCase();
    if (dom.accentColor2Input) dom.accentColor2Input.value = colorHex2;
    if (dom.accentHex2Label) dom.accentHex2Label.textContent = colorHex2.toUpperCase();
    if (dom.gradientPreviewBadge) dom.gradientPreviewBadge.style.background = gradient;

    storage.set({ accentColor: colorHex1, accentColor2: colorHex2 });
  }

  // =========================================================================
  // MINI PRIVACY-FRIENDLY WEATHER ENGINE
  // $0 Cost • No API Key • Powered by Open-Meteo & GeoJS
  // =========================================================================
  const WEATHER_CODES = {
    0: { text: 'Clear Sky', day: '☀️', night: '🌙' },
    1: { text: 'Mainly Clear', day: '🌤️', night: '🌤️' },
    2: { text: 'Partly Cloudy', day: '⛅', night: '☁️' },
    3: { text: 'Overcast', day: '☁️', night: '☁️' },
    45: { text: 'Foggy', day: '🌫️', night: '🌫️' },
    48: { text: 'Rime Fog', day: '🌫️', night: '🌫️' },
    51: { text: 'Light Drizzle', day: '🌦️', night: '🌦️' },
    53: { text: 'Moderate Drizzle', day: '🌧️', night: '🌧️' },
    55: { text: 'Dense Drizzle', day: '🌧️', night: '🌧️' },
    61: { text: 'Slight Rain', day: '🌦️', night: '🌧️' },
    63: { text: 'Moderate Rain', day: '🌧️', night: '🌧️' },
    65: { text: 'Heavy Rain', day: '🌧️', night: '🌧️' },
    71: { text: 'Slight Snow', day: '🌨️', night: '🌨️' },
    73: { text: 'Moderate Snow', day: '❄️', night: '❄️' },
    75: { text: 'Heavy Snow', day: '❄️', night: '❄️' },
    77: { text: 'Snow Grains', day: '❄️', night: '❄️' },
    80: { text: 'Slight Showers', day: '🌦️', night: '🌧️' },
    81: { text: 'Showers', day: '🌧️', night: '🌧️' },
    82: { text: 'Violent Showers', day: '⛈️', night: '⛈️' },
    85: { text: 'Snow Showers', day: '🌨️', night: '🌨️' },
    86: { text: 'Heavy Snow Showers', day: '❄️', night: '❄️' },
    95: { text: 'Thunderstorm', day: '⛈️', night: '⛈️' },
    96: { text: 'Thunderstorm & Hail', day: '⛈️', night: '⛈️' },
    99: { text: 'Heavy Thunderstorm', day: '⛈️', night: '⛈️' }
  };

  function updateWeatherDisplay(tempC, code, isDay, city) {
    if (!dom.weatherWidget) return;
    const info = WEATHER_CODES[code] || { text: 'Fair', day: '⛅', night: '🌙' };
    const icon = isDay === 0 ? info.night : info.day;
    const tempDisplay = state.weatherUnit === 'F' 
      ? `${Math.round((tempC * 9) / 5 + 32)}°F` 
      : `${Math.round(tempC)}°C`;

    if (dom.weatherIcon) dom.weatherIcon.textContent = icon;
    if (dom.weatherTemp) dom.weatherTemp.textContent = tempDisplay;
    if (dom.weatherCity) dom.weatherCity.textContent = city ? `• ${city}` : '';
    if (dom.weatherDesc) dom.weatherDesc.textContent = info.text;
  }

  function initWeather() {
    if (!dom.weatherWidget) return;

    // Check cached weather (valid for 45 minutes)
    const now = Date.now();
    const CACHE_TTL = 45 * 60 * 1000;
    if (state.weatherCache && (now - state.weatherCache.timestamp < CACHE_TTL)) {
      updateWeatherDisplay(
        state.weatherCache.tempC,
        state.weatherCache.code,
        state.weatherCache.isDay,
        state.weatherCache.city
      );
      return;
    }

    // IP Geolocation fallback via GeoJS ($0, no tracking, no registration)
    fetch('https://get.geojs.io/v1/ip/geo.json')
      .then(res => res.json())
      .then(geo => {
        const lat = parseFloat(geo.latitude) || 40.7128;
        const lon = parseFloat(geo.longitude) || -74.0060;
        const city = geo.city || '';
        fetchWeatherForCoords(lat, lon, city);
      })
      .catch(() => {
        // Fallback default coordinates if offline
        fetchWeatherForCoords(40.7128, -74.0060, 'Local');
      });
  }

  function fetchWeatherForCoords(lat, lon, city) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data.current) {
          const tempC = data.current.temperature_2m;
          const code = data.current.weather_code;
          const isDay = data.current.is_day;
          state.weatherCache = {
            tempC,
            code,
            isDay,
            city,
            timestamp: Date.now()
          };
          storage.set({ weatherCache: state.weatherCache });
          updateWeatherDisplay(tempC, code, isDay, city);
        }
      })
      .catch(err => {
        console.warn('Weather fetch warning (offline mode):', err);
      });
  }

  function toggleWeatherUnit() {
    state.weatherUnit = state.weatherUnit === 'F' ? 'C' : 'F';
    storage.set({ weatherUnit: state.weatherUnit });
    if (state.weatherCache) {
      updateWeatherDisplay(
        state.weatherCache.tempC,
        state.weatherCache.code,
        state.weatherCache.isDay,
        state.weatherCache.city
      );
      showToast(`Weather display: °${state.weatherUnit}`);
    } else {
      initWeather();
    }
  }

  const GRADIENT_WALLPAPERS = {
    'gradient-cosmic': 'radial-gradient(circle at 20% 20%, #4338ca 0%, #1e1b4b 40%, #030712 100%)',
    'gradient-sunset': 'radial-gradient(circle at 80% 20%, #ea580c 0%, #7c2d12 40%, #0c0a09 100%)',
    'gradient-minimal': 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 50%, #020617 100%)',
    'gradient-obsidian': 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 50%, #020617 100%)'
  };

  function applyWallpaper(wpKey, customData) {
    state.wallpaper = wpKey;
    dom.bgImage.className = 'bg-image'; // reset classes

    if (wpKey && wpKey.startsWith('live-')) {
      // Live Animated Wallpaper Mode
      dom.bgImage.style.backgroundImage = 'none';
      if (dom.liveCanvas) {
        dom.liveCanvas.classList.remove('hidden');
        startLiveWallpaper(wpKey);
      }
    } else {
      // Static or Gradient Wallpaper Mode
      stopLiveWallpaper();
      if (dom.liveCanvas) {
        dom.liveCanvas.classList.add('hidden');
      }
      if (wpKey === 'custom' && customData) {
        dom.bgImage.style.backgroundImage = `url(${customData})`;
      } else if (wpKey && wpKey.startsWith('gradient-')) {
        const gradient = GRADIENT_WALLPAPERS[wpKey] || GRADIENT_WALLPAPERS['gradient-cosmic'];
        dom.bgImage.style.backgroundImage = gradient;
        dom.bgImage.classList.add(wpKey);
      } else {
        // Local preset image: aurora, sunset, cyberpunk
        const imgMap = {
          aurora: 'assets/wallpapers/aurora.jpg',
          sunset: 'assets/wallpapers/sunset.jpg',
          cyberpunk: 'assets/wallpapers/cyberpunk.jpg'
        };
        const path = imgMap[wpKey] || imgMap.aurora;
        dom.bgImage.style.backgroundImage = `url(${path})`;
      }
    }

    dom.wallpaperCards.forEach(card => {
      card.classList.toggle('active', card.dataset.wp === wpKey);
    });

    storage.set({ wallpaper: wpKey, customWallpaperData: customData });
  }

  // =========================================================================
  // 5.1 LIVE ANIMATED WALLPAPERS ENGINE (60 FPS, GPU-ACCELERATED)
  // =========================================================================
  let liveAnimId = null;
  let activeLiveMode = null;
  let liveCanvasCtx = null;
  let liveCanvasWidth = 0;
  let liveCanvasHeight = 0;
  let mousePos = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let liveParticles = [];
  let liveDrops = [];
  let liveTime = 0;

  function resizeLiveCanvas() {
    if (!dom.liveCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    liveCanvasWidth = window.innerWidth;
    liveCanvasHeight = window.innerHeight;
    dom.liveCanvas.width = liveCanvasWidth * dpr;
    dom.liveCanvas.height = liveCanvasHeight * dpr;
    liveCanvasCtx = dom.liveCanvas.getContext('2d');
    if (liveCanvasCtx) {
      liveCanvasCtx.scale(dpr, dpr);
    }
  }

  function startLiveWallpaper(wpKey) {
    if (activeLiveMode === wpKey && liveAnimId) return;
    stopLiveWallpaper();
    activeLiveMode = wpKey;
    resizeLiveCanvas();
    if (!liveCanvasCtx) return;

    liveTime = 0;
    mousePos.x = liveCanvasWidth / 2;
    mousePos.y = liveCanvasHeight / 2;
    mousePos.targetX = liveCanvasWidth / 2;
    mousePos.targetY = liveCanvasHeight / 2;

    if (wpKey === 'live-starfield') {
      const starCount = 360;
      liveParticles = [];
      for (let i = 0; i < starCount; i++) {
        liveParticles.push({
          x: (Math.random() - 0.5) * liveCanvasWidth * 2,
          y: (Math.random() - 0.5) * liveCanvasHeight * 2,
          z: Math.random() * liveCanvasWidth,
          prevZ: 0,
          color: Math.random() > 0.8 ? '#38bdf8' : (Math.random() > 0.6 ? '#fcd34d' : '#ffffff'),
          size: Math.random() * 1.5 + 0.6
        });
      }
    } else if (wpKey === 'live-matrix') {
      const fontSize = 16;
      const columns = Math.ceil(liveCanvasWidth / fontSize);
      liveDrops = [];
      const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';
      for (let i = 0; i < columns; i++) {
        liveDrops.push({
          y: Math.random() * -100,
          speed: Math.random() * 2 + 1.2,
          chars: chars,
          lastChar: chars[Math.floor(Math.random() * chars.length)]
        });
      }
    } else if (wpKey === 'live-fireflies') {
      const orbCount = 38;
      liveParticles = [];
      const colors = [
        'rgba(236, 72, 153, ', // Pink / magenta
        'rgba(99, 102, 241, ',  // Indigo
        'rgba(6, 182, 212, ',   // Cyan
        'rgba(168, 85, 247, ',  // Purple
        'rgba(245, 158, 11, '   // Amber
      ];
      for (let i = 0; i < orbCount; i++) {
        liveParticles.push({
          x: Math.random() * liveCanvasWidth,
          y: Math.random() * liveCanvasHeight,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          r: Math.random() * 45 + 20,
          color: colors[i % colors.length],
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03
        });
      }
    }

    runLiveWallpaperLoop();
  }

  function stopLiveWallpaper() {
    if (liveAnimId) {
      cancelAnimationFrame(liveAnimId);
      liveAnimId = null;
    }
    activeLiveMode = null;
    if (liveCanvasCtx && dom.liveCanvas) {
      liveCanvasCtx.clearRect(0, 0, liveCanvasWidth, liveCanvasHeight);
    }
  }

  function runLiveWallpaperLoop() {
    if (!activeLiveMode || !dom.liveCanvas || dom.liveCanvas.classList.contains('hidden')) {
      return;
    }
    if (document.hidden) {
      return;
    }

    liveTime += 0.016;
    mousePos.x += (mousePos.targetX - mousePos.x) * 0.05;
    mousePos.y += (mousePos.targetY - mousePos.y) * 0.05;

    const ctx = liveCanvasCtx;
    const w = liveCanvasWidth;
    const h = liveCanvasHeight;

    if (activeLiveMode === 'live-aurora') {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      const ribbons = [
        { color1: 'rgba(16, 185, 129, 0.45)', color2: 'rgba(6, 182, 212, 0.1)', amp: 90, freq: 0.002, speed: 0.8, yBase: h * 0.45 },
        { color1: 'rgba(6, 182, 212, 0.4)', color2: 'rgba(99, 102, 241, 0.08)', amp: 120, freq: 0.0015, speed: 0.6, yBase: h * 0.55 },
        { color1: 'rgba(168, 85, 247, 0.35)', color2: 'rgba(236, 72, 153, 0.05)', amp: 75, freq: 0.0025, speed: 1.1, yBase: h * 0.65 },
        { color1: 'rgba(34, 197, 94, 0.3)', color2: 'rgba(14, 165, 233, 0.06)', amp: 110, freq: 0.0018, speed: 0.9, yBase: h * 0.35 }
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ribbons.forEach((rib) => {
        const grad = ctx.createLinearGradient(0, rib.yBase - rib.amp * 1.5, 0, rib.yBase + rib.amp * 1.5);
        grad.addColorStop(0, rib.color1);
        grad.addColorStop(1, rib.color2);

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 14) {
          const t = liveTime * rib.speed;
          const y = rib.yBase 
            + Math.sin(x * rib.freq + t) * rib.amp 
            + Math.cos(x * rib.freq * 0.5 - t * 0.7) * (rib.amp * 0.4)
            + Math.sin((x + t * 50) * 0.003) * 20;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      });
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 25; i++) {
        const px = ((i * 137.5) % w);
        const py = ((i * 89.3 + liveTime * 15) % h);
        const sz = Math.sin(liveTime * 2 + i) * 1 + 1.2;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.4, sz), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (activeLiveMode === 'live-starfield') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2 + (mousePos.x - w / 2) * 0.25;
      const cy = h / 2 + (mousePos.y - h / 2) * 0.25;
      const speed = 12;

      ctx.lineWidth = 1.6;
      for (let i = 0; i < liveParticles.length; i++) {
        const p = liveParticles[i];
        p.prevZ = p.z;
        p.z -= speed;

        if (p.z <= 0) {
          p.z = w;
          p.prevZ = w;
          p.x = (Math.random() - 0.5) * w * 2;
          p.y = (Math.random() - 0.5) * h * 2;
        }

        const k = 280 / p.z;
        const px = p.x * k + cx;
        const py = p.y * k + cy;

        const pk = 280 / p.prevZ;
        const prevPx = p.x * pk + cx;
        const prevPy = p.y * pk + cy;

        if (px >= 0 && px <= w && py >= 0 && py <= h) {
          const alpha = Math.min(1, (1 - p.z / w) * 1.5);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, p.size * (1 - p.z / w) * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

    } else if (activeLiveMode === 'live-matrix') {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.14)';
      ctx.fillRect(0, 0, w, h);

      const fontSize = 16;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < liveDrops.length; i++) {
        const drop = liveDrops[i];
        const x = i * fontSize;
        const y = drop.y * fontSize;

        if (Math.random() > 0.85) {
          drop.lastChar = drop.chars[Math.floor(Math.random() * drop.chars.length)];
        }

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fillText(drop.lastChar, x, y);

        ctx.fillStyle = '#22c55e';
        ctx.shadowBlur = 4;
        ctx.fillText(drop.lastChar, x, y - fontSize);

        ctx.shadowBlur = 0;

        drop.y += drop.speed * 0.4;
        if (y > h && Math.random() > 0.975) {
          drop.y = 0;
          drop.speed = Math.random() * 2 + 1.2;
        }
      }

    } else if (activeLiveMode === 'live-fireflies') {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < liveParticles.length; i++) {
        const p = liveParticles[i];
        p.x += p.vx + Math.sin(liveTime + p.phase) * 0.4;
        p.y += p.vy + Math.cos(liveTime + p.phase) * 0.4;
        p.phase += p.pulseSpeed;

        if (p.x < -p.r) p.x = w + p.r;
        if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r;
        if (p.y > h + p.r) p.y = -p.r;

        const pulseRadius = p.r * (0.8 + 0.3 * Math.sin(p.phase));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseRadius);
        grad.addColorStop(0, p.color + '0.85)');
        grad.addColorStop(0.4, p.color + '0.35)');
        grad.addColorStop(1, p.color + '0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    liveAnimId = requestAnimationFrame(runLiveWallpaperLoop);
  }

  function applySliders(blurPx, darknessPct) {
    state.blur = blurPx;
    state.darkness = darknessPct;
    document.documentElement.style.setProperty('--custom-blur', `${blurPx}px`);
    document.documentElement.style.setProperty('--custom-darkness', `${darknessPct / 100}`);
    if (dom.sliderBlur) dom.sliderBlur.value = blurPx;
    if (dom.blurVal) dom.blurVal.textContent = `${blurPx}px`;
    if (dom.sliderDarkness) dom.sliderDarkness.value = darknessPct;
    if (dom.darknessVal) dom.darknessVal.textContent = `${darknessPct}%`;
    storage.set({ blur: blurPx, darkness: darknessPct });
  }

  function applyLayout(layout) {
    state.currentLayout = layout;
    document.body.setAttribute('data-layout', layout);
    if (dom.layoutCards) dom.layoutCards.classList.toggle('active', layout === 'cards');
    if (dom.layoutBoard) dom.layoutBoard.classList.toggle('active', layout === 'board');
    if (dom.layoutCompact) dom.layoutCompact.classList.toggle('active', layout === 'compact');
    if (dom.layoutList) dom.layoutList.classList.toggle('active', layout === 'list');
    storage.set({ currentLayout: layout });
    renderBookmarks();
  }

  // =========================================================================
  // 6. MULTI-ENGINE SEARCH BAR & SUGGESTIONS
  // =========================================================================
  function handleSearchSubmit(e) {
    e.preventDefault();
    const query = dom.searchInput.value.trim();
    if (!query) return;

    if (state.searchMode === 'bookmarks') {
      // Focus bookmark filter
      if (dom.bookmarkFilterInput) dom.bookmarkFilterInput.value = query;
      filterBookmarks(query);
      if (dom.lumilistBoard && state.currentLayout === 'board') {
        dom.lumilistBoard.scrollIntoView({ behavior: 'smooth' });
      } else if (dom.bookmarksGrid) {
        dom.bookmarksGrid.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Direct URL navigation detection
    const isUrl = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(query);
    if (isUrl && !query.includes(' ')) {
      const targetUrl = query.startsWith('http://') || query.startsWith('https://') ? query : 'https://' + query;
      window.location.href = targetUrl;
      return;
    }

    // Search using active engine
    const config = getEngineConfig(state.searchEngine);
    window.location.href = config.url + encodeURIComponent(query);
  }

  // Live Auto-complete / Search Suggestions
  let debounceTimer = null;
  function handleSearchInput(e) {
    const query = e.target.value.trim();
    dom.btnClearSearch.classList.toggle('hidden', query.length === 0);

    if (state.searchMode === 'bookmarks') {
      filterBookmarks(query);
      return;
    }

    clearTimeout(debounceTimer);
    if (!query) {
      dom.searchSuggestions.classList.add('hidden');
      dom.searchSuggestions.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(() => {
      generateSuggestions(query);
    }, 180);
  }

  function generateSuggestions(query) {
    const qLower = query.toLowerCase();
    
    // 1. Search matching local bookmarks first
    const matchedBookmarks = state.bookmarks.filter(b => 
      b.title.toLowerCase().includes(qLower) || 
      b.url.toLowerCase().includes(qLower) ||
      (b.tags && b.tags.toLowerCase().includes(qLower))
    ).slice(0, 4);

    // 2. Add smart search queries
    const searchQueries = [
      query,
      query + ' tutorial',
      query + ' docs',
      query + ' definition'
    ].slice(0, 4 - matchedBookmarks.length + 1);

    dom.searchSuggestions.innerHTML = '';

    matchedBookmarks.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <div class="sugg-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          <span>${escapeHtml(bm.title)}</span>
        </div>
        <span class="sugg-type-tag">Bookmark</span>
      `;
      item.addEventListener('click', () => {
        openBookmark(bm);
      });
      dom.searchSuggestions.appendChild(item);
    });

    searchQueries.forEach(sq => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <div class="sugg-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>${escapeHtml(sq)}</span>
        </div>
        <span class="sugg-type-tag">Search</span>
      `;
      item.addEventListener('click', () => {
        dom.searchInput.value = sq;
        handleSearchSubmit(new Event('submit'));
      });
      dom.searchSuggestions.appendChild(item);
    });

    dom.searchSuggestions.classList.remove('hidden');
  }

  // Voice Search (Web Speech API)
  function initVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      dom.btnVoiceSearch.title = 'Voice search not supported in this browser';
      dom.btnVoiceSearch.style.opacity = '0.4';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    dom.btnVoiceSearch.addEventListener('click', () => {
      try {
        recognition.start();
        dom.btnVoiceSearch.classList.add('listening');
        showToast('Listening... Speak now');
      } catch (err) {
        recognition.stop();
        dom.btnVoiceSearch.classList.remove('listening');
      }
    });

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      dom.searchInput.value = speechResult;
      dom.btnVoiceSearch.classList.remove('listening');
      handleSearchSubmit(new Event('submit'));
    };

    recognition.onerror = () => {
      dom.btnVoiceSearch.classList.remove('listening');
      showToast('Voice search timed out or was cancelled');
    };

    recognition.onend = () => {
      dom.btnVoiceSearch.classList.remove('listening');
    };
  }

  // =========================================================================
  // 7. PRIVACY MODE (SCREEN-SHARING SHIELD)
  // =========================================================================
  function togglePrivacyMode(force) {
    state.privacyMode = typeof force === 'boolean' ? force : !state.privacyMode;
    if (state.privacyMode) {
      document.body.classList.add('privacy-mode');
      if (dom.btnPrivacyToggle) dom.btnPrivacyToggle.classList.add('active');
      if (dom.privacyBanner) dom.privacyBanner.classList.remove('hidden');
      showToast('Privacy Mode Enabled: Bookmarks blurred for screen sharing');
    } else {
      document.body.classList.remove('privacy-mode');
      if (dom.btnPrivacyToggle) dom.btnPrivacyToggle.classList.remove('active');
      if (dom.privacyBanner) dom.privacyBanner.classList.add('hidden');
      showToast('Privacy Mode Disabled');
    }
    storage.set({ privacyMode: state.privacyMode });
  }

  // =========================================================================
  // 8. MULTIPLE WORKSPACE PAGES
  // =========================================================================
  function renderPagesBar() {
    if (!dom.pagesTabs) return;
    dom.pagesTabs.innerHTML = '';

    if (!state.pages || state.pages.length === 0) {
      state.pages = ['Personal', 'Work', 'Projects'];
    }

    state.pages.forEach(page => {
      const pill = document.createElement('div');
      const isActive = (state.activePage || 'Personal') === page;
      pill.className = `page-pill ${isActive ? 'active' : ''}`;

      const count = state.bookmarks.filter(b => (b.page || 'Personal') === page).length;

      let deleteBtnHtml = '';
      if (state.pages.length > 1 && page !== 'Personal') {
        deleteBtnHtml = `<button type="button" class="page-delete-btn" title="Delete page ${escapeHtml(page)}">&times;</button>`;
      }

      pill.innerHTML = `
        <span class="page-pill-name">${escapeHtml(page)}</span>
        <span class="page-pill-badge">${count}</span>
        ${deleteBtnHtml}
      `;

      pill.addEventListener('click', (e) => {
        if (e.target.closest('.page-delete-btn')) return;
        setActivePage(page);
      });

      if (deleteBtnHtml) {
        pill.querySelector('.page-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          deletePage(page);
        });
      }

      dom.pagesTabs.appendChild(pill);
    });

    populatePageSelect();
  }

  function setActivePage(page) {
    state.activePage = page;
    state.activeCategory = 'All';
    storage.set({ activePage: page });
    renderPagesBar();
    renderCategoryTabs();
    renderBookmarks();
    showToast(`Switched to page "${page}"`);
  }

  function addNewPage() {
    const rawName = prompt('Enter a name for the new page (e.g. Work, Clients, Personal, Projects):');
    if (!rawName) return;
    const name = rawName.trim();
    if (!name) return;

    if (state.pages.some(p => p.toLowerCase() === name.toLowerCase())) {
      showToast(`Page "${name}" already exists!`);
      return;
    }

    state.pages.push(name);
    storage.set({ pages: state.pages });
    populatePageSelect();
    setActivePage(name);
  }

  function deletePage(page) {
    if (confirm(`Delete page "${page}"? Bookmarks on this page will be moved to "Personal".`)) {
      state.bookmarks.forEach(b => {
        if ((b.page || 'Personal') === page) {
          b.page = 'Personal';
        }
      });
      state.pages = state.pages.filter(p => p !== page);
      if (state.activePage === page) {
        state.activePage = 'Personal';
      }
      storage.set({ pages: state.pages, bookmarks: state.bookmarks, activePage: state.activePage });
      renderPagesBar();
      renderCategoryTabs();
      renderBookmarks();
      showToast(`Deleted page "${page}"`);
    }
  }

  function populatePageSelect() {
    if (!dom.bmPage) return;
    const currentVal = dom.bmPage.value;
    dom.bmPage.innerHTML = '';
    (state.pages || ['Personal', 'Work', 'Projects']).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      dom.bmPage.appendChild(opt);
    });
    if (currentVal && state.pages.includes(currentVal)) {
      dom.bmPage.value = currentVal;
    } else {
      dom.bmPage.value = state.activePage || 'Personal';
    }
  }

  // =========================================================================
  // 9. BOOKMARKS HUB (FILTERING & CATEGORIES)
  // =========================================================================
  function getCategories() {
    const set = new Set();
    const pageBookmarks = state.bookmarks.filter(b => (b.page || 'Personal') === (state.activePage || 'Personal'));
    pageBookmarks.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set).sort();
  }

  function renderCategoryTabs() {
    if (dom.bookmarksCountPill) {
      dom.bookmarksCountPill.textContent = state.bookmarks.length;
    }
    if (!dom.categoryTabs) return;

    const categories = getCategories();
    dom.categoryTabs.innerHTML = '';
    const pageBookmarks = state.bookmarks.filter(b => (b.page || 'Personal') === (state.activePage || 'Personal'));

    // "All" Tab
    const allTab = document.createElement('button');
    allTab.className = `cat-tab ${state.activeCategory === 'All' ? 'active' : ''}`;
    allTab.innerHTML = `<span>All</span><span class="cat-count">${pageBookmarks.length}</span>`;
    allTab.addEventListener('click', () => setCategory('All'));
    dom.categoryTabs.appendChild(allTab);

    // "⭐ Favorites" Tab
    const favCount = pageBookmarks.filter(b => b.favorite).length;
    const favTab = document.createElement('button');
    favTab.className = `cat-tab ${state.activeCategory === 'Favorites' ? 'active' : ''}`;
    favTab.innerHTML = `<span>⭐ Favorites</span><span class="cat-count">${favCount}</span>`;
    favTab.addEventListener('click', () => setCategory('Favorites'));
    dom.categoryTabs.appendChild(favTab);

    // Category Tabs
    categories.forEach(cat => {
      const count = pageBookmarks.filter(b => b.category === cat).length;
      const tab = document.createElement('button');
      tab.className = `cat-tab ${state.activeCategory === cat ? 'active' : ''}`;
      tab.innerHTML = `<span>${escapeHtml(cat)}</span><span class="cat-count">${count}</span>`;
      tab.addEventListener('click', () => setCategory(cat));
      dom.categoryTabs.appendChild(tab);
    });

    if (dom.bookmarksCountPill) {
      dom.bookmarksCountPill.textContent = state.bookmarks.length;
    }
  }

  function setCategory(cat) {
    state.activeCategory = cat;
    renderCategoryTabs();
    renderBookmarks();
  }

  function getDomain(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }

  function getFaviconUrl(url) {
    try {
      const parsed = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    } catch (e) {
      return '';
    }
  }

  // =========================================================================
  // 9.5 QUICK ACCESS: MOST USED & RECENT WEBSITES
  // =========================================================================
  const DEFAULT_TOP_SITES = [
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'YouTube', url: 'https://youtube.com' },
    { title: 'Reddit', url: 'https://reddit.com' },
    { title: 'X / Twitter', url: 'https://x.com' },
    { title: 'Wikipedia', url: 'https://wikipedia.org' },
    { title: 'ChatGPT', url: 'https://chatgpt.com' },
    { title: 'Brave Search', url: 'https://search.brave.com' },
    { title: 'Gmail', url: 'https://mail.google.com' }
  ];

  function trackRecentSite(url, title) {
    if (!url || !isSafeUrl(url)) return;
    if (!Array.isArray(state.recentSites)) state.recentSites = [];

    // Deduplicate
    state.recentSites = state.recentSites.filter(s => s.url !== url);
    state.recentSites.unshift({
      url: url,
      title: title || getDomain(url) || 'Site',
      timestamp: Date.now()
    });

    if (state.recentSites.length > 30) {
      state.recentSites = state.recentSites.slice(0, 30);
    }

    storage.set({ recentSites: state.recentSites });
    if (state.quickAccessMode === 'recent') {
      renderQuickAccess();
    }
  }

  function normalizeSiteUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      const u = new URL(url.trim());
      let pathname = u.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      return `${u.protocol}//${u.host.toLowerCase()}${pathname}${u.search ? u.search.toLowerCase() : ''}`;
    } catch (e) {
      return String(url).trim().replace(/\/+$/, '').toLowerCase();
    }
  }

  function isTopSiteRemoved(url) {
    if (!url || !Array.isArray(state.removedTopSites) || state.removedTopSites.length === 0) return false;
    const targetNorm = normalizeSiteUrl(url);
    return state.removedTopSites.some(r => r === url || normalizeSiteUrl(r) === targetNorm);
  }

  function updateTopSitesRestoreUI() {
    const count = Array.isArray(state.removedTopSites) ? state.removedTopSites.length : 0;
    const hasRemoved = count > 0;
    if (dom.menuRestoreSites) {
      dom.menuRestoreSites.style.display = hasRemoved ? 'flex' : 'none';
    }
    if (dom.menuRestoreDivider) {
      dom.menuRestoreDivider.style.display = hasRemoved ? 'block' : 'none';
    }
    if (dom.drawerTopSitesRestoreRow) {
      dom.drawerTopSitesRestoreRow.style.display = hasRemoved ? 'flex' : 'none';
    }
    if (dom.drawerTopSitesRestoreCount) {
      dom.drawerTopSitesRestoreCount.textContent = `${count} hidden app${count === 1 ? '' : 's'}`;
    }
  }

  function closeTopSitesMenu() {
    if (dom.topSitesMenuPopover) dom.topSitesMenuPopover.classList.add('hidden');
    const btn = document.getElementById('btn-top-sites-menu');
    if (btn) btn.classList.remove('active');
  }

  function positionTopSitesPopover(btn) {
    if (!btn || !dom.topSitesMenuPopover) return;
    const rect = btn.getBoundingClientRect();
    const popoverWidth = 230;

    let top = rect.bottom + 6;
    let left = rect.right - popoverWidth + 6;

    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }
    if (top + 280 > window.innerHeight) {
      top = rect.top - 280;
    }

    dom.topSitesMenuPopover.style.position = 'fixed';
    dom.topSitesMenuPopover.style.top = `${top}px`;
    dom.topSitesMenuPopover.style.left = `${left}px`;
    dom.topSitesMenuPopover.style.right = 'auto';
  }

  function initQuickAccess() {
    if (!dom.quickAccessBar) return;

    // 1. Toggle 3-Dots Menu Popover & Delegated Click Handling (Image 1 vs Image 2)
    document.addEventListener('click', (e) => {
      const menuBtn = e.target.closest('#btn-top-sites-menu');
      if (menuBtn && dom.topSitesMenuPopover) {
        e.stopPropagation();
        const isOpen = !dom.topSitesMenuPopover.classList.contains('hidden');
        if (isOpen) {
          closeTopSitesMenu();
        } else {
          positionTopSitesPopover(menuBtn);
          dom.topSitesMenuPopover.classList.remove('hidden');
          menuBtn.classList.add('active');
        }
        return;
      }

      // Close 3-Dots Menu Popover when clicking outside
      if (dom.topSitesMenuPopover && !dom.topSitesMenuPopover.classList.contains('hidden')) {
        if (!e.target.closest('#top-sites-menu-popover') && !e.target.closest('#btn-top-sites-menu')) {
          closeTopSitesMenu();
        }
      }
    });

    window.addEventListener('resize', () => {
      if (dom.topSitesMenuPopover && !dom.topSitesMenuPopover.classList.contains('hidden')) {
        const btn = document.getElementById('btn-top-sites-menu');
        if (btn) positionTopSitesPopover(btn);
      }
    });

    // 2. Menu Item: Add site
    if (dom.menuAddSite) {
      dom.menuAddSite.addEventListener('click', () => {
        closeTopSitesMenu();
        openTopSiteModal();
      });
    }

    // Modal Handlers: Add Top Site
    if (dom.topSiteForm) {
      dom.topSiteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = dom.topSiteName ? dom.topSiteName.value.trim() : '';
        let url = dom.topSiteUrl ? dom.topSiteUrl.value.trim() : '';
        if (!name || !url) return;

        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }

        if (!Array.isArray(state.customTopSites)) state.customTopSites = [];
        state.customTopSites.unshift({
          id: 'custom_' + Date.now(),
          title: name,
          url: url
        });

        // If previously removed, un-remove it so it can display
        if (Array.isArray(state.removedTopSites)) {
          const norm = normalizeSiteUrl(url);
          state.removedTopSites = state.removedTopSites.filter(u => u !== url && normalizeSiteUrl(u) !== norm);
        }

        storage.set({
          customTopSites: state.customTopSites,
          removedTopSites: state.removedTopSites
        });
        closeTopSiteModal();
        renderQuickAccess();
        updateTopSitesRestoreUI();
        showToast(`Added "${name}" to Top Sites`);
      });
    }

    if (dom.btnCloseTopSiteModal) {
      dom.btnCloseTopSiteModal.addEventListener('click', closeTopSiteModal);
    }
    if (dom.btnCancelTopSiteModal) {
      dom.btnCancelTopSiteModal.addEventListener('click', closeTopSiteModal);
    }

    // 3. Menu Item: Show more items / Show fewer items (1 row vs 2 rows)
    if (dom.menuToggleMore) {
      dom.menuToggleMore.addEventListener('click', () => {
        state.topSitesShowMore = !state.topSitesShowMore;
        storage.set({ topSitesShowMore: state.topSitesShowMore });
        closeTopSitesMenu();
        renderQuickAccess();
      });
    }

    // 4. Menu Item: Show frequently visited / Show recently visited
    if (dom.menuToggleFrequent) {
      dom.menuToggleFrequent.addEventListener('click', () => {
        state.quickAccessMode = state.quickAccessMode === 'frequent' ? 'recent' : 'frequent';
        storage.set({ quickAccessMode: state.quickAccessMode });
        closeTopSitesMenu();
        renderQuickAccess();
        showToast(state.quickAccessMode === 'frequent' ? 'Showing frequently visited sites' : 'Showing recently visited sites');
      });
    }

    // 4.5 Restore removed sites (menu and drawer)
    if (dom.menuRestoreSites) {
      dom.menuRestoreSites.addEventListener('click', () => {
        closeTopSitesMenu();
        restoreAllTopSites();
      });
    }

    if (dom.btnDrawerRestoreTopSites) {
      dom.btnDrawerRestoreTopSites.addEventListener('click', () => {
        restoreAllTopSites();
      });
    }

    // 5. Menu Item: Hide top sites
    if (dom.menuHideSites) {
      dom.menuHideSites.addEventListener('click', () => {
        state.topSitesHidden = true;
        storage.set({ topSitesHidden: true });
        closeTopSitesMenu();
        renderQuickAccess();
        showToast('Top sites hidden. Open Settings ➔ Display to turn back on.', 5000, {
          text: 'Undo',
          onClick: () => {
            state.topSitesHidden = false;
            storage.set({ topSitesHidden: false });
            renderQuickAccess();
          }
        });
      });
    }

    // 6. Settings Drawer: Toggle Top Sites visibility
    if (dom.btnToggleTopSitesVis) {
      dom.btnToggleTopSitesVis.addEventListener('click', () => {
        state.topSitesHidden = !state.topSitesHidden;
        storage.set({ topSitesHidden: state.topSitesHidden });
        renderQuickAccess();
        showToast(state.topSitesHidden ? 'Top sites hidden' : 'Top sites visible');
      });
    }

    // 7. Pagination Dots Handlers
    if (dom.topSitesPagination) {
      dom.topSitesPagination.addEventListener('click', (e) => {
        const dot = e.target.closest('.top-sites-dot');
        if (!dot) return;
        const page = parseInt(dot.dataset.page, 10);
        if (!isNaN(page)) {
          state.topSitesPage = page;
          renderQuickAccess();
        }
      });
    }

    // 8. Grid Click Handlers (Opening, Removing sites, and Add site button)
    if (dom.quickAccessGrid) {
      dom.quickAccessGrid.addEventListener('click', (e) => {
        // If clicking 3-dots button, delegated document listener will handle it
        if (e.target.closest('#btn-top-sites-menu')) {
          return;
        }

        // Add Site Button (squircle or text)
        const addTile = e.target.closest('#btn-add-top-site-tile, .qa-add-site-item');
        if (addTile) {
          e.preventDefault();
          e.stopPropagation();
          openTopSiteModal();
          return;
        }

        const removeBtn = e.target.closest('.qa-remove-btn');
        if (removeBtn) {
          e.preventDefault();
          e.stopPropagation();
          const targetUrl = removeBtn.getAttribute('data-url') || removeBtn.dataset.url || removeBtn.closest('.qa-item')?.getAttribute('data-url');
          const siteTitle = removeBtn.getAttribute('title')?.replace(/^Remove\s*/i, '') || removeBtn.closest('.qa-item')?.querySelector('.qa-name')?.textContent || '';
          
          if (targetUrl) {
            const item = removeBtn.closest('.qa-item');
            if (item) {
              item.style.transition = 'transform 0.18s cubic-bezier(0.2, 0, 0, 1), opacity 0.18s ease';
              item.style.transform = 'scale(0.35)';
              item.style.opacity = '0';
              setTimeout(() => {
                removeTopSite(targetUrl, siteTitle);
              }, 160);
            } else {
              removeTopSite(targetUrl, siteTitle);
            }
          }
          return;
        }

        const item = e.target.closest('.qa-item');
        if (!item || item.classList.contains('qa-add-site-item')) return;
        const url = item.dataset.url;
        if (!url || !isSafeUrl(url)) return;

        const title = item.getAttribute('title') || url;
        trackRecentSite(url, title);
      });
    }

    renderQuickAccess();
    updateTopSitesRestoreUI();
  }

  function openTopSiteModal() {
    if (!dom.topSiteModal) return;
    if (dom.topSiteName) dom.topSiteName.value = '';
    if (dom.topSiteUrl) dom.topSiteUrl.value = '';
    dom.topSiteModal.classList.remove('hidden');
    if (dom.topSiteName) dom.topSiteName.focus();
  }

  function closeTopSiteModal() {
    if (dom.topSiteModal) dom.topSiteModal.classList.add('hidden');
  }

  function removeTopSite(url, title) {
    if (!url) return;
    const targetNorm = normalizeSiteUrl(url);

    if (!Array.isArray(state.removedTopSites)) state.removedTopSites = [];
    if (!state.removedTopSites.some(u => u === url || normalizeSiteUrl(u) === targetNorm)) {
      state.removedTopSites.push(url);
    }

    if (Array.isArray(state.customTopSites)) {
      state.customTopSites = state.customTopSites.filter(s => s.url !== url && normalizeSiteUrl(s.url) !== targetNorm);
    }
    if (Array.isArray(state.recentSites)) {
      state.recentSites = state.recentSites.filter(s => s.url !== url && normalizeSiteUrl(s.url) !== targetNorm);
    }

    storage.set({
      removedTopSites: state.removedTopSites,
      customTopSites: state.customTopSites,
      recentSites: state.recentSites
    });

    renderQuickAccess();
    updateTopSitesRestoreUI();

    const name = title || getDomain(url) || 'site';
    showToast(`Removed "${name}" from top sites`, 5000, {
      text: 'Undo',
      onClick: () => {
        restoreTopSite(url, name);
      }
    });
  }

  function restoreTopSite(url, title) {
    if (!url || !Array.isArray(state.removedTopSites)) return;
    const targetNorm = normalizeSiteUrl(url);
    state.removedTopSites = state.removedTopSites.filter(u => u !== url && normalizeSiteUrl(u) !== targetNorm);
    storage.set({ removedTopSites: state.removedTopSites });
    renderQuickAccess();
    updateTopSitesRestoreUI();
    const name = title || getDomain(url) || 'site';
    showToast(`Restored "${name}" to top sites`);
  }

  function restoreAllTopSites() {
    state.removedTopSites = [];
    storage.set({ removedTopSites: [] });
    renderQuickAccess();
    updateTopSitesRestoreUI();
    showToast('All removed top sites restored');
  }

  function renderQuickAccess() {
    if (!dom.quickAccessBar || !dom.quickAccessGrid) return;

    // Apply visibility
    if (state.topSitesHidden) {
      dom.quickAccessBar.classList.add('hidden');
      if (dom.labelTopSitesVis) dom.labelTopSitesVis.textContent = 'Show';
      if (dom.btnToggleTopSitesVis) {
        dom.btnToggleTopSitesVis.classList.remove('ghost-btn');
        dom.btnToggleTopSitesVis.classList.add('primary-btn');
      }
      return;
    } else {
      dom.quickAccessBar.classList.remove('hidden');
      if (dom.labelTopSitesVis) dom.labelTopSitesVis.textContent = 'Hide';
      if (dom.btnToggleTopSitesVis) {
        dom.btnToggleTopSitesVis.classList.remove('primary-btn');
        dom.btnToggleTopSitesVis.classList.add('ghost-btn');
      }
    }

    // Update Popover Menu Labels
    if (dom.labelToggleMore) {
      dom.labelToggleMore.textContent = state.topSitesShowMore ? 'Show fewer items' : 'Show more items';
    }
    if (dom.labelToggleFrequent) {
      dom.labelToggleFrequent.textContent = state.quickAccessMode === 'frequent' 
        ? 'Show recently visited' 
        : 'Show frequently visited';
    }

    // Toggle 2-row expanded class on grid
    dom.quickAccessGrid.classList.toggle('expanded', !!state.topSitesShowMore);

    // Fetch site data based on mode
    if (state.quickAccessMode === 'recent') {
      let recents = Array.isArray(state.recentSites) ? state.recentSites.slice() : [];
      if (recents.length === 0 && state.bookmarks.length > 0) {
        recents = state.bookmarks.slice().reverse().slice(0, 28).map(b => ({
          url: b.url,
          title: b.title
        }));
      }
      buildAndRenderTopSites(recents);
    } else {
      // Frequent / Most Visited
      if (typeof chrome !== 'undefined' && chrome.topSites && chrome.topSites.get) {
        chrome.topSites.get((topSites) => {
          let sites = Array.isArray(topSites) ? topSites : [];
          if (sites.length === 0) {
            sites = getFallbackFrequentSites();
          }
          buildAndRenderTopSites(sites);
        });
      } else {
        const sites = getFallbackFrequentSites();
        buildAndRenderTopSites(sites);
      }
    }
  }

  function buildAndRenderTopSites(autoSites) {
    // Merge customTopSites first, then autoSites (deduplicating URLs & excluding removed ones)
    const combined = [];
    const seenUrls = new Set();

    (state.customTopSites || []).forEach(site => {
      if (site.url && !isTopSiteRemoved(site.url)) {
        const norm = normalizeSiteUrl(site.url);
        if (!seenUrls.has(norm)) {
          seenUrls.add(norm);
          combined.push({ ...site, isCustom: true });
        }
      }
    });

    (autoSites || []).forEach(site => {
      if (site.url && !isTopSiteRemoved(site.url)) {
        const norm = normalizeSiteUrl(site.url);
        if (!seenUrls.has(norm)) {
          seenUrls.add(norm);
          combined.push({ ...site, isCustom: false });
        }
      }
    });

    if (combined.length === 0) {
      dom.quickAccessGrid.innerHTML = renderAddSiteTile();
      if (dom.topSitesPagination) dom.topSitesPagination.classList.add('hidden');
      updateTopSitesRestoreUI();
      return;
    }

    const PAGE_SIZE = 6;
    let displayList = [];

    if (state.topSitesShowMore) {
      // 2-row expanded view (up to 13 items + 1 Add Site button = 14 items)
      displayList = combined.slice(0, 13);
      if (dom.topSitesPagination) dom.topSitesPagination.classList.add('hidden');
    } else {
      // 1-row view with pagination
      if (combined.length > PAGE_SIZE) {
        if (dom.topSitesPagination) {
          dom.topSitesPagination.classList.remove('hidden');
        }
        const maxPage = Math.ceil(combined.length / PAGE_SIZE) - 1;
        if (state.topSitesPage > maxPage) {
          state.topSitesPage = Math.max(0, maxPage);
        }
        const start = (state.topSitesPage || 0) * PAGE_SIZE;
        displayList = combined.slice(start, start + PAGE_SIZE);
        if (dom.topSitesPagination) {
          const dots = dom.topSitesPagination.querySelectorAll('.top-sites-dot');
          dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === state.topSitesPage);
          });
        }
      } else {
        state.topSitesPage = 0;
        if (dom.topSitesPagination) dom.topSitesPagination.classList.add('hidden');
        displayList = combined.slice(0, PAGE_SIZE);
      }
    }

    dom.quickAccessGrid.innerHTML = displayList.map(site => renderQuickAccessTile(site)).join('') + renderAddSiteTile();
    updateTopSitesRestoreUI();
  }

  function getFallbackFrequentSites() {
    const visitedBookmarks = state.bookmarks
      .filter(b => (b.visits || 0) > 0)
      .sort((a, b) => (b.visits || 0) - (a.visits || 0))
      .slice(0, 28);

    if (visitedBookmarks.length > 0) {
      return visitedBookmarks.map(b => ({
        url: b.url,
        title: b.title,
        visits: b.visits
      }));
    }
    return DEFAULT_TOP_SITES;
  }

  function renderQuickAccessTile(item) {
    const url = item.url || '#';
    const rawTitle = item.title || getDomain(url) || 'Site';
    const initial = (rawTitle.charAt(0) || 'W').toUpperCase();
    const faviconUrl = getFaviconUrl(url);

    return `
      <div class="qa-item" data-url="${escapeHtml(url)}" title="${escapeHtml(item.title || url)}">
        <button type="button" class="qa-remove-btn" data-url="${escapeHtml(url)}" title="Remove ${escapeHtml(rawTitle)}" aria-label="Remove ${escapeHtml(rawTitle)}">&times;</button>
        <a href="${escapeHtml(url)}" class="qa-squircle" target="_blank" rel="noopener noreferrer">
          <img class="qa-icon" src="${escapeHtml(faviconUrl)}" alt="${escapeHtml(initial)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <span class="qa-fallback-initial" style="display:none;">${escapeHtml(initial)}</span>
        </a>
        <span class="qa-name">${escapeHtml(rawTitle)}</span>
      </div>
    `;
  }

  function renderAddSiteTile() {
    return `
      <div class="qa-item qa-add-site-item" id="qa-add-site-item" title="Add site">
        <div class="qa-squircle-wrap">
          <button type="button" class="qa-squircle qa-add-squircle" id="btn-add-top-site-tile" title="Add site" aria-label="Add site">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button type="button" id="btn-top-sites-menu" class="top-sites-menu-btn" title="Top sites settings" aria-label="Top sites settings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="4" r="2.2"/>
              <circle cx="12" cy="12" r="2.2"/>
              <circle cx="12" cy="20" r="2.2"/>
            </svg>
          </button>
        </div>
        <span class="qa-name">Add site</span>
      </div>
    `;
  }

  // =========================================================================
  // 10. VISUAL DRAGGABLE BOARDS & CARDS
  // =========================================================================
  const BATCH_SIZE = 60;
  let currentFilteredList = [];
  let currentlyRenderedCount = 0;
  let sentinelObserver = null;

  function renderBookmarks() {
    let list = state.bookmarks;
    if (state.currentLayout !== 'board') {
      list = list.filter(b => (b.page || 'Personal') === (state.activePage || 'Personal'));

      // Filter by Category
      if (state.activeCategory === 'Favorites') {
        list = list.filter(b => b.favorite);
      } else if (state.activeCategory !== 'All') {
        list = list.filter(b => b.category === state.activeCategory);
      }
    }

    // Filter by Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.url.toLowerCase().includes(q) ||
        (b.tags && b.tags.toLowerCase().includes(q))
      );
    }

    // Sort Bookmarks
    if (state.currentSort === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.currentSort === 'visits') {
      list.sort((a, b) => (b.visits || 0) - (a.visits || 0));
    } else {
      // Recent / Original order (Favorites on top if in All)
      if (state.activeCategory === 'All') {
        list.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
      }
    }

    dom.bookmarksGrid.innerHTML = '';
    currentFilteredList = list;
    currentlyRenderedCount = 0;

    // 1. GOOGLE KEEP & LUMILIST BOARD VIEW (Masonry Cards & Add Board)
    if (state.currentLayout === 'board') {
      if (dom.emptyState) dom.emptyState.classList.add('hidden');
      if (dom.bookmarksGrid) dom.bookmarksGrid.classList.add('hidden');
      if (dom.lumilistBoard) dom.lumilistBoard.classList.remove('hidden');
      if (dom.bookmarksSentinel) dom.bookmarksSentinel.classList.add('hidden');
      renderLumilistBoard(list);
      return;
    }

    if (list.length === 0) {
      dom.emptyState.classList.remove('hidden');
      if (dom.bookmarksSentinel) dom.bookmarksSentinel.classList.add('hidden');
      if (dom.bookmarksGrid) dom.bookmarksGrid.innerHTML = '';
      if (dom.lumilistBoard) dom.lumilistBoard.innerHTML = '';
      return;
    }
    dom.emptyState.classList.add('hidden');

    if (dom.lumilistBoard) dom.lumilistBoard.classList.add('hidden');
    if (dom.bookmarksGrid) dom.bookmarksGrid.classList.remove('hidden');
    dom.bookmarksGrid.innerHTML = '';

    // 2. GOOGLE KEEP CARDS VIEW (PINNED & OTHERS SECTIONS)
    if (state.currentLayout === 'cards' && state.activeCategory === 'All' && !state.searchQuery) {
      const pinned = list.filter(b => b.favorite);
      const others = list.filter(b => !b.favorite);

      if (pinned.length > 0 && others.length > 0) {
        // Pinned Section
        const pinHeader = document.createElement('div');
        pinHeader.className = 'keep-section-header';
        pinHeader.innerHTML = `<span>PINNED</span><span class="keep-badge">${pinned.length}</span>`;
        dom.bookmarksGrid.appendChild(pinHeader);

        const pinGrid = document.createElement('div');
        pinGrid.className = 'keep-subgrid';
        pinned.forEach(bm => pinGrid.appendChild(createBookmarkCard(bm)));
        dom.bookmarksGrid.appendChild(pinGrid);

        // Others Section
        const othHeader = document.createElement('div');
        othHeader.className = 'keep-section-header';
        othHeader.innerHTML = `<span>OTHERS</span><span class="keep-badge">${others.length}</span>`;
        dom.bookmarksGrid.appendChild(othHeader);

        const othGrid = document.createElement('div');
        othGrid.className = 'keep-subgrid';
        others.forEach(bm => othGrid.appendChild(createBookmarkCard(bm)));
        dom.bookmarksGrid.appendChild(othGrid);

        if (dom.bookmarksSentinel) dom.bookmarksSentinel.classList.add('hidden');
        return;
      }
    }

    // 3. STANDARD BATCH RENDERING (Infinite Sentinel)
    currentFilteredList = list;
    currentlyRenderedCount = 0;
    renderNextBookmarkBatch();
    setupSentinelObserver();
  }

  function createBookmarkCard(bm, isBoard = false) {
    const domain = getDomain(bm.url);
    const faviconUrl = getFaviconUrl(bm.url);
    const initial = (bm.title || domain || 'B').charAt(0).toUpperCase();

    const card = document.createElement('div');
    card.className = `bookmark-card ${isBoard ? 'lumilist-card' : 'keep-card'}`;
    card.setAttribute('data-id', bm.id);
    card.setAttribute('draggable', 'true');

    const tagsArray = (bm.tags || '')
      .split(',')
      .map(t => t.trim())
      .filter(t => t && t !== 'browser-sync' && t !== 'imported' && t !== 'board');
    
    const tagsHtml = tagsArray.slice(0, 2).map(tag => 
      `<span class="bm-chip">#${escapeHtml(tag)}</span>`
    ).join('');

    if (state.currentLayout === 'compact') {
      card.innerHTML = `
        <div class="bm-favicon-wrap">
          <img class="bm-favicon" src="${faviconUrl}" alt="${escapeHtml(bm.title)}" loading="lazy">
          <div class="bm-fallback-initial" style="display:none;">${initial}</div>
        </div>
        <div class="bm-info">
          <div class="bm-title" title="${escapeHtml(bm.title)}">${escapeHtml(bm.title)}</div>
        </div>
      `;
    } else if (state.currentLayout === 'list') {
      card.innerHTML = `
        <div class="bm-favicon-wrap">
          <img class="bm-favicon" src="${faviconUrl}" alt="${escapeHtml(bm.title)}" loading="lazy">
          <div class="bm-fallback-initial" style="display:none;">${initial}</div>
        </div>
        <div class="bm-info">
          <div class="bm-title" title="${escapeHtml(bm.title)}">${escapeHtml(bm.title)}</div>
          <div class="bm-domain" title="${escapeHtml(bm.url)}">${escapeHtml(domain)}</div>
        </div>
        <div class="bm-card-actions" style="opacity: 1;">
          <button class="bm-action-btn btn-star ${bm.favorite ? 'star-active' : ''}" title="${bm.favorite ? 'Unpin' : 'Pin to Top'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${bm.favorite ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="bm-action-btn btn-edit" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="bm-action-btn btn-delete" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
    } else {
      // Google Keep & Lumilist Card Structure
      card.innerHTML = `
        <div class="bm-card-top">
          <div class="bm-card-source">
            <div class="bm-favicon-wrap">
              <img class="bm-favicon" src="${faviconUrl}" alt="${escapeHtml(bm.title)}" loading="lazy">
              <div class="bm-fallback-initial" style="display:none;">${initial}</div>
            </div>
            <span class="bm-domain" title="${escapeHtml(bm.url)}">${escapeHtml(domain)}</span>
          </div>
          <button class="bm-pin-btn ${bm.favorite ? 'pinned' : ''}" title="${bm.favorite ? 'Unpin' : 'Pin to Top'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${bm.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 17v5M9 2h6l-1 5 4 4v2H6v-2l4-4-1-5z"/>
            </svg>
          </button>
        </div>
        <div class="bm-card-body">
          <div class="bm-title" title="${escapeHtml(bm.title)}">${escapeHtml(bm.title)}</div>
          <div class="bm-chips-row">
            <span class="bm-chip cat-chip" title="Board / Category">${escapeHtml(bm.category || 'General')}</span>
            ${tagsHtml}
          </div>
        </div>
        <div class="bm-card-actions">
          <button class="bm-action-btn btn-star ${bm.favorite ? 'star-active' : ''}" title="${bm.favorite ? 'Unpin' : 'Pin to Top'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${bm.favorite ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="bm-action-btn btn-copy" title="Copy URL">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="bm-action-btn btn-edit" title="Edit Bookmark">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="bm-action-btn btn-delete" title="Delete Bookmark">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button class="bm-action-btn btn-open" title="Open in New Tab">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>
      `;
    }

    // Google Keep & Lumilist Drag Movability
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', bm.id);
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      const targetId = bm.id;

      if (draggedId && draggedId !== targetId) {
        const fromIndex = state.bookmarks.findIndex(b => b.id === draggedId);
        const toIndex = state.bookmarks.findIndex(b => b.id === targetId);

        if (fromIndex !== -1 && toIndex !== -1) {
          const [moved] = state.bookmarks.splice(fromIndex, 1);
          moved.page = state.activePage || 'Personal';
          // In board view, adopt the target column's category
          if (isBoard) {
            moved.category = bm.category || 'General';
          } else if (state.currentLayout === 'cards') {
            // Adopt the target card's pinned status (moving between PINNED and OTHERS)
            moved.favorite = bm.favorite;
          }
          state.bookmarks.splice(toIndex, 0, moved);
          storage.set({ bookmarks: state.bookmarks });
          renderPagesBar();
          renderCategoryTabs();
          renderBookmarks();
          showToast('Card moved');
        }
      }
    });

    // Click card to open website
    card.addEventListener('click', (e) => {
      if (e.target.closest('.bm-action-btn') || e.target.closest('.bm-pin-btn')) return;
      openBookmark(bm);
    });

    // Keep Pin button
    const pinBtn = card.querySelector('.bm-pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(bm.id);
      });
    }

    // Star button
    const starBtn = card.querySelector('.btn-star');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(bm.id);
      });
    }

    // Copy URL button
    const copyBtn = card.querySelector('.btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(bm.url).then(() => {
          showToast('Copied URL to clipboard');
        });
      });
    }

    // Edit button
    const editBtn = card.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(bm);
      });
    }

    // Delete button
    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBookmark(bm.id);
      });
    }

    // Open button
    const openBtn = card.querySelector('.btn-open');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openBookmark(bm);
      });
    }

    return card;
  }

  function renderNextBookmarkBatch() {
    if (!currentFilteredList || currentlyRenderedCount >= currentFilteredList.length) {
      if (dom.bookmarksSentinel) dom.bookmarksSentinel.classList.add('hidden');
      return;
    }

    const batch = currentFilteredList.slice(currentlyRenderedCount, currentlyRenderedCount + BATCH_SIZE);
    const fragment = document.createDocumentFragment();

    batch.forEach(bm => {
      fragment.appendChild(createBookmarkCard(bm, false));
    });

    dom.bookmarksGrid.appendChild(fragment);
    currentlyRenderedCount += batch.length;

    // Update sentinel indicator
    if (dom.bookmarksSentinel) {
      if (currentlyRenderedCount < currentFilteredList.length) {
        dom.bookmarksSentinel.classList.remove('hidden');
        if (dom.sentinelText) {
          dom.sentinelText.textContent = `Showing ${currentlyRenderedCount} of ${currentFilteredList.length} bookmarks • Scroll down for more`;
        }
      } else {
        dom.bookmarksSentinel.classList.add('hidden');
      }
    }
  }

  // =========================================================================
  // LUMILIST & GOOGLE KEEP BOARD RENDERER (Masonry Cards & Add Board)
  // =========================================================================
  let currentDraggedBoardName = null;
  let currentDraggedBookmarkId = null;

  function renderLumilistBoard(list) {
    if (!dom.lumilistBoard) return;
    dom.lumilistBoard.innerHTML = '';

    // Collect all boards: customBoards plus any categories from bookmarks
    const boardSet = new Set(state.customBoards || ['Other bookmarks', 'Work', 'Personal']);
    list.forEach(bm => {
      const cat = bm.category || 'Other bookmarks';
      boardSet.add(cat);
    });
    const allBoards = Array.from(boardSet);

    allBoards.forEach(boardName => {
      const colBookmarks = list.filter(b => (b.category || 'Other bookmarks') === boardName);
      const card = document.createElement('div');
      card.className = 'keep-board-card';
      card.setAttribute('data-board', boardName);
      card.setAttribute('draggable', 'true');

      card.innerHTML = `
        <div class="keep-board-header">
          <span class="keep-board-title" title="Click edit or double-click to rename">${escapeHtml(boardName)}</span>
          <div class="keep-board-actions">
            <button type="button" class="keep-board-action-btn btn-board-edit" title="Rename Board">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="keep-board-action-btn btn-board-add" title="Add Bookmark to ${escapeHtml(boardName)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button type="button" class="keep-board-action-btn btn-board-del" title="Delete Board">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="keep-board-divider"></div>
        <div class="keep-board-body" data-drop-board="${escapeHtml(boardName)}"></div>
      `;

      const titleSpan = card.querySelector('.keep-board-title');
      const body = card.querySelector('.keep-board-body');

      // Inline Title Rename
      function startRenaming() {
        const currentTitle = boardName;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'keep-board-rename-input';
        input.value = currentTitle;
        input.maxLength = 30;

        titleSpan.replaceWith(input);
        input.focus();
        input.select();

        let finished = false;
        function finishRename() {
          if (finished) return;
          finished = true;
          const newName = input.value.trim();
          if (newName && newName !== currentTitle) {
            if (!Array.isArray(state.customBoards)) state.customBoards = [];
            const idx = state.customBoards.indexOf(currentTitle);
            if (idx !== -1) {
              state.customBoards[idx] = newName;
            } else {
              state.customBoards.push(newName);
            }
            state.bookmarks.forEach(b => {
              if (b.category === currentTitle) {
                b.category = newName;
              }
            });
            storage.set({
              customBoards: state.customBoards,
              bookmarks: state.bookmarks
            });
            renderCategoryTabs();
            renderBookmarks();
            showToast(`Board renamed to "${newName}"`);
          } else {
            input.replaceWith(titleSpan);
          }
        }

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            finishRename();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            finished = true;
            input.replaceWith(titleSpan);
          }
        });
      }

      titleSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRenaming();
      });

      card.querySelector('.btn-board-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        startRenaming();
      });

      // Populate bookmark items inside this board
      colBookmarks.forEach(bm => {
        const row = document.createElement('div');
        row.className = 'keep-item-row';
        row.setAttribute('data-id', bm.id);
        row.setAttribute('draggable', 'true');

        const initial = ((bm.title || getDomain(bm.url)).charAt(0) || 'W').toUpperCase();
        const faviconUrl = getFaviconUrl(bm.url);

        row.innerHTML = `
          <a href="${escapeHtml(bm.url)}" class="keep-item-link" title="${escapeHtml(bm.title || bm.url)}" target="_blank" rel="noopener noreferrer">
            <img class="keep-item-favicon" src="${escapeHtml(faviconUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <span class="keep-fallback-initial" style="display:none;">${escapeHtml(initial)}</span>
            <span class="keep-item-title">${escapeHtml(bm.title || getDomain(bm.url))}</span>
          </a>
          <div class="keep-item-actions">
            <button type="button" class="keep-item-btn btn-pin ${bm.favorite ? 'pinned' : ''}" title="${bm.favorite ? 'Unpin' : 'Pin'}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="${bm.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 17v5M9 2h6l-1 5 4 4v2H6v-2l4-4-1-5z"/></svg>
            </button>
            <button type="button" class="keep-item-btn btn-del" title="Delete Bookmark">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `;

        // Item click navigation
        const link = row.querySelector('.keep-item-link');
        link.addEventListener('click', (e) => {
          e.preventDefault();
          openBookmark(bm);
        });

        // Pin toggle
        row.querySelector('.btn-pin').addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(bm.id);
        });

        // Delete bookmark
        row.querySelector('.btn-del').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteBookmark(bm.id);
        });

        // Drag & drop item row
        row.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          row.classList.add('dragging');
          currentDraggedBookmarkId = bm.id;
          currentDraggedBoardName = null;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', bm.id);
          e.dataTransfer.setData('source-type', 'bookmark');
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          currentDraggedBookmarkId = null;
        });

        body.appendChild(row);
      });

      // Board Drag & Drop: Dropping bookmark into board body
      body.addEventListener('dragover', (e) => {
        if (currentDraggedBookmarkId) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          body.classList.add('drag-over-board');
        }
      });

      body.addEventListener('dragleave', (e) => {
        if (!body.contains(e.relatedTarget)) {
          body.classList.remove('drag-over-board');
        }
      });

      body.addEventListener('drop', (e) => {
        body.classList.remove('drag-over-board');
        const draggedId = currentDraggedBookmarkId || e.dataTransfer.getData('text/plain');

        if (draggedId) {
          e.preventDefault();
          e.stopPropagation();
          const item = state.bookmarks.find(b => b.id === draggedId);
          if (item && item.category !== boardName) {
            item.category = boardName;
            storage.set({ bookmarks: state.bookmarks });
            renderCategoryTabs();
            renderBookmarks();
            showToast(`Moved to ${boardName}`);
          }
          currentDraggedBookmarkId = null;
        }
      });

      // Board Header Actions
      card.querySelector('.btn-board-add').addEventListener('click', (e) => {
        e.stopPropagation();
        openAddModalWithCategory(boardName);
      });

      card.querySelector('.btn-board-del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete board "${boardName}"? Any bookmarks in this board will be moved to Other bookmarks.`)) {
          state.customBoards = (state.customBoards || []).filter(b => b !== boardName);
          state.bookmarks.forEach(b => {
            if (b.category === boardName) b.category = 'Other bookmarks';
          });
          storage.set({
            customBoards: state.customBoards,
            bookmarks: state.bookmarks
          });
          renderCategoryTabs();
          renderBookmarks();
          showToast(`Deleted board "${boardName}"`);
        }
      });

      // Board Reordering Drag & Drop
      card.addEventListener('dragstart', (e) => {
        if (e.target.closest('.keep-item-row') || e.target.closest('input')) return;
        card.classList.add('board-dragging');
        currentDraggedBoardName = boardName;
        currentDraggedBookmarkId = null;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('board-name', boardName);
        e.dataTransfer.setData('source-type', 'board');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('board-dragging');
        document.querySelectorAll('.keep-board-card').forEach(c => c.classList.remove('board-drag-over'));
        currentDraggedBoardName = null;
      });

      card.addEventListener('dragover', (e) => {
        if (currentDraggedBoardName && currentDraggedBoardName !== boardName) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('board-drag-over');
        }
      });

      card.addEventListener('dragleave', (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove('board-drag-over');
        }
      });

      card.addEventListener('drop', (e) => {
        card.classList.remove('board-drag-over');
        const sourceBoard = currentDraggedBoardName || e.dataTransfer.getData('board-name');
        if (sourceBoard && sourceBoard !== boardName) {
          e.preventDefault();
          e.stopPropagation();
          let boards = [...(state.customBoards || [])];
          if (!boards.includes(sourceBoard)) boards.push(sourceBoard);
          if (!boards.includes(boardName)) boards.push(boardName);

          const fromIdx = boards.indexOf(sourceBoard);
          const toIdx = boards.indexOf(boardName);
          if (fromIdx !== -1 && toIdx !== -1) {
            boards.splice(fromIdx, 1);
            boards.splice(toIdx, 0, sourceBoard);
            state.customBoards = boards;
            storage.set({ customBoards: state.customBoards });
            renderBookmarks();
            showToast(`Moved "${sourceBoard}"`);
          }
          currentDraggedBoardName = null;
        }
      });

      dom.lumilistBoard.appendChild(card);
    });

    // Dedicated "+ ADD BOARD" Dashed Card
    const addBoardCard = document.createElement('div');
    addBoardCard.className = 'keep-add-board-card';
    addBoardCard.id = 'btn-add-new-board';
    addBoardCard.title = 'Create a new board';

    addBoardCard.innerHTML = `
      <div class="add-board-normal-state">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span>ADD BOARD</span>
      </div>
      <div class="add-board-input-state hidden">
        <input type="text" class="add-board-text-input" placeholder="Board name..." maxlength="30">
        <div class="add-board-btn-group">
          <button type="button" class="add-board-btn-confirm">Add</button>
          <button type="button" class="add-board-btn-cancel">✕</button>
        </div>
      </div>
    `;

    const normalState = addBoardCard.querySelector('.add-board-normal-state');
    const inputState = addBoardCard.querySelector('.add-board-input-state');
    const textInput = addBoardCard.querySelector('.add-board-text-input');
    const btnConfirm = addBoardCard.querySelector('.add-board-btn-confirm');
    const btnCancel = addBoardCard.querySelector('.add-board-btn-cancel');

    function openAddBoardInput() {
      normalState.classList.add('hidden');
      inputState.classList.remove('hidden');
      textInput.value = '';
      textInput.focus();
    }

    function closeAddBoardInput() {
      inputState.classList.add('hidden');
      normalState.classList.remove('hidden');
      textInput.value = '';
    }

    function submitNewBoard() {
      const name = textInput.value.trim();
      if (!name) {
        closeAddBoardInput();
        return;
      }
      if (!Array.isArray(state.customBoards)) state.customBoards = [];
      if (!state.customBoards.includes(name)) {
        state.customBoards.push(name);
      }
      storage.set({ customBoards: state.customBoards });
      renderCategoryTabs();
      renderBookmarks();
      showToast(`Board "${name}" created!`);
    }

    normalState.addEventListener('click', openAddBoardInput);
    btnConfirm.addEventListener('click', submitNewBoard);
    btnCancel.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAddBoardInput();
    });

    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitNewBoard();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAddBoardInput();
      }
    });

    dom.lumilistBoard.appendChild(addBoardCard);
  }

  function openAddModalWithCategory(cat) {
    if (dom.bmId) dom.bmId.value = '';
    if (dom.bmUrl) dom.bmUrl.value = '';
    if (dom.bmTitle) dom.bmTitle.value = '';
    if (dom.bmCategory) dom.bmCategory.value = cat;
    if (dom.bmTags) dom.bmTags.value = '';
    if (dom.bmFavorite) dom.bmFavorite.checked = false;
    if (dom.modalTitle) dom.modalTitle.textContent = `Add Bookmark to ${cat}`;
    if (dom.bookmarkModal) dom.bookmarkModal.classList.remove('hidden');
    if (dom.bmUrl) dom.bmUrl.focus();
  }

  function handleAddNewBoard() {
    const name = window.prompt('Enter new Board / List name (e.g. Reading List, Inspiration, Dev):');
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    openAddModalWithCategory(cleanName);
    showToast(`New board "${cleanName}" ready!`);
  }

  function setupSentinelObserver() {
    if (!dom.bookmarksSentinel) return;
    if (sentinelObserver) {
      sentinelObserver.disconnect();
    }

    if (typeof IntersectionObserver !== 'undefined') {
      sentinelObserver = new IntersectionObserver((entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          renderNextBookmarkBatch();
        }
      }, { rootMargin: '300px' });

      sentinelObserver.observe(dom.bookmarksSentinel);
    }
  }

  function openBookmark(bm) {
    if (!bm || !bm.url || !isSafeUrl(bm.url)) {
      showToast('Blocked unsafe or invalid URL');
      return;
    }
    // Increment visit count for smart sorting
    bm.visits = (bm.visits || 0) + 1;
    trackRecentSite(bm.url, bm.title);
    storage.set({ bookmarks: state.bookmarks });
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: bm.url });
    } else {
      const win = window.open(bm.url, '_blank', 'noopener,noreferrer');
      if (win) win.opener = null;
    }
  }

  function toggleFavorite(id) {
    const item = state.bookmarks.find(b => b.id === id);
    if (!item) return;
    item.favorite = !item.favorite;
    storage.set({ bookmarks: state.bookmarks });
    renderCategoryTabs();
    renderBookmarks();
    showToast(item.favorite ? 'Pinned to Favorites' : 'Removed from Favorites');
  }

  function deleteBookmark(id) {
    const item = state.bookmarks.find(b => b.id === id);
    if (!item) return;
    state.bookmarks = state.bookmarks.filter(b => b.id !== id);
    storage.set({ bookmarks: state.bookmarks });
    renderCategoryTabs();
    renderBookmarks();
    showToast(`Deleted "${item.title}"`);
  }

  function filterBookmarks(query) {
    state.searchQuery = query;
    renderBookmarks();
  }

  // =========================================================================
  // 11. ADD / EDIT BOOKMARK MODAL
  // =========================================================================
  function openAddModal() {
    populatePageSelect();
    dom.modalTitle.textContent = 'Add New Bookmark';
    dom.bmId.value = '';
    dom.bmUrl.value = '';
    dom.bmTitle.value = '';
    if (dom.bmPage) dom.bmPage.value = state.activePage || 'Personal';
    dom.bmCategory.value = state.activeCategory !== 'All' && state.activeCategory !== 'Favorites' ? state.activeCategory : 'AI & LLMs';
    dom.bmTags.value = '';
    dom.bmFavorite.checked = false;
    dom.bookmarkModal.classList.remove('hidden');
    dom.bmUrl.focus();
  }

  function openEditModal(bm) {
    populatePageSelect();
    dom.modalTitle.textContent = 'Edit Bookmark';
    dom.bmId.value = bm.id;
    dom.bmUrl.value = bm.url;
    dom.bmTitle.value = bm.title;
    if (dom.bmPage) dom.bmPage.value = bm.page || 'Personal';
    dom.bmCategory.value = bm.category || 'General';
    dom.bmTags.value = bm.tags || '';
    dom.bmFavorite.checked = !!bm.favorite;
    dom.bookmarkModal.classList.remove('hidden');
    dom.bmTitle.focus();
  }

  function closeModal() {
    dom.bookmarkModal.classList.add('hidden');
  }

  function handleBookmarkFormSubmit(e) {
    e.preventDefault();
    let url = dom.bmUrl.value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (!isSafeUrl(url)) {
      showToast('Please enter a valid http:// or https:// URL');
      return;
    }

    const title = dom.bmTitle.value.trim() || getDomain(url);
    const page = dom.bmPage ? dom.bmPage.value : (state.activePage || 'Personal');
    const category = dom.bmCategory.value;
    const tags = dom.bmTags.value.trim();
    const favorite = dom.bmFavorite.checked;
    const id = dom.bmId.value;

    if (id) {
      // Edit existing
      const existing = state.bookmarks.find(b => b.id === id);
      if (existing) {
        existing.url = url;
        existing.title = title;
        existing.page = page;
        existing.category = category;
        existing.tags = tags;
        existing.favorite = favorite;
      }
      showToast('Bookmark updated successfully');
    } else {
      // Create new
      const newBookmark = {
        id: 'bm-' + Date.now(),
        url,
        title,
        page,
        category,
        tags,
        favorite,
        visits: 0
      };
      state.bookmarks.unshift(newBookmark);
      showToast(`Added "${title}" to ${page} • ${category}`);
    }

    storage.set({ bookmarks: state.bookmarks });
    closeModal();
    renderPagesBar();
    renderCategoryTabs();
    renderBookmarks();
  }

  function autoFillTitle() {
    const rawUrl = dom.bmUrl.value.trim();
    if (!rawUrl) return;
    try {
      const url = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl;
      const domain = getDomain(url);
      const name = domain.split('.')[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      if (!dom.bmTitle.value) {
        dom.bmTitle.value = capitalized;
      }
      // Auto-categorize based on domain and title
      const detectedCat = detectCategory(url, dom.bmTitle.value || capitalized);
      if (dom.bmCategory) {
        dom.bmCategory.value = detectedCat;
      }
    } catch (e) {
      // ignore
    }
  }

  // =========================================================================
  // 12. BROWSER SYNC & IMPORT/EXPORT
  // =========================================================================
  function checkBraveBookmarksAvailable() {
    if (dom.btnSyncBrave) dom.btnSyncBrave.style.display = 'inline-flex';
  }

  function syncCloudBookmarks() {
    if (typeof chrome === 'undefined' || !chrome.bookmarks || !chrome.bookmarks.getTree) {
      showToast('Browser native sync is available when loaded in Chrome/Brave/Edge');
      return;
    }

    if (dom.btnSyncBrave) dom.btnSyncBrave.classList.add('syncing');
    showToast('Starting Two-Way Browser Sync with native bookmarks...');
    chrome.bookmarks.getTree((tree) => {
      const nativeBookmarks = [];
      let hookTabFolderId = null;

      function traverse(node, folderName) {
        if (node.title && (node.title.toLowerCase().includes('hooktab') || node.title.toLowerCase().includes('nexustab'))) {
          hookTabFolderId = node.id;
        }
        if (node.url) {
          const isGeneric = !folderName || 
            folderName === 'Bookmarks bar' || 
            folderName === 'Other bookmarks' || 
            folderName === 'Cloud Bookmarks' || 
            folderName === 'HookTab Bookmarks' || 
            folderName === 'NexusTab Bookmarks' || 
            folderName === 'General' ||
            folderName.toLowerCase().includes('bookmark');

          const category = isGeneric ? detectCategory(node.url, node.title) : folderName;

          nativeBookmarks.push({
            id: 'cloud-' + (node.id || Math.random().toString(36).substring(2)),
            title: node.title || getDomain(node.url),
            url: node.url,
            page: state.activePage || 'Personal',
            category: category,
            tags: 'cloud-sync',
            favorite: false,
            visits: 1
          });
        }
        if (node.children) {
          const currentFolder = node.title && node.title !== 'Bookmarks bar' && node.title !== 'Other bookmarks' 
            ? node.title 
            : folderName;
          node.children.forEach(child => traverse(child, currentFolder));
        }
      }
      tree.forEach(root => traverse(root, 'Cloud Bookmarks'));

      // 1. Pull new bookmarks from browser native cloud sync
      const existingUrls = new Set(state.bookmarks.map(b => b.url.toLowerCase().replace(/\/$/, '')));
      let pulledCount = 0;
      nativeBookmarks.forEach(b => {
        const norm = b.url.toLowerCase().replace(/\/$/, '');
        if (!existingUrls.has(norm)) {
          state.bookmarks.push(b);
          existingUrls.add(norm);
          pulledCount++;
        }
      });

      // 2. Push local bookmarks to browser native tree so Brave/Chrome Sync shares them across all devices
      const nativeUrls = new Set(nativeBookmarks.map(b => b.url.toLowerCase().replace(/\/$/, '')));
      const toPush = state.bookmarks.filter(b => !nativeUrls.has(b.url.toLowerCase().replace(/\/$/, '')));

      function finishSync(pushedCount) {
        if (dom.btnSyncBrave) dom.btnSyncBrave.classList.remove('syncing');
        storage.set({ bookmarks: state.bookmarks });
        renderPagesBar();
        renderCategoryTabs();
        renderBookmarks();
        showToast(`Browser Sync Complete! (+${pulledCount} imported, +${pushedCount} synced to browser)`);
      }

      if (toPush.length > 0) {
        function exportBatch(folderId) {
          let count = 0;
          toPush.forEach(bm => {
            chrome.bookmarks.create({
              parentId: folderId,
              title: bm.title,
              url: bm.url
            });
            count++;
          });
          finishSync(count);
        }

        if (hookTabFolderId) {
          exportBatch(hookTabFolderId);
        } else {
          chrome.bookmarks.create({ parentId: '1', title: 'HookTab Bookmarks' }, (folder) => {
            exportBatch(folder ? folder.id : '1');
          });
        }
      } else {
        finishSync(0);
      }
    });
  }

  function exportBookmarksJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.bookmarks, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `hooktab_bookmarks_${Date.now()}.json`);
    dlAnchor.click();
    showToast('Exported bookmarks as JSON');
  }

  function exportBookmarksHtml() {
    if (!state.bookmarks || state.bookmarks.length === 0) {
      showToast('No bookmarks to export');
      return;
    }

    // Group bookmarks by category to export as organized browser folders
    const byCategory = {};
    state.bookmarks.forEach(bm => {
      const cat = bm.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(bm);
    });

    const nowSec = Math.floor(Date.now() / 1000);
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n` +
      `<!-- This is an automatically generated file.\n` +
      `     It will be read and overwritten.\n` +
      `     DO NOT EDIT! -->\n` +
      `<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n` +
      `<TITLE>HookTab Bookmarks</TITLE>\n` +
      `<H1>Bookmarks</H1>\n` +
      `<DL><p>\n` +
      `    <DT><H3 ADD_DATE="${nowSec}" LAST_MODIFIED="${nowSec}">HookTab Bookmarks</H3>\n` +
      `    <DL><p>\n`;

    for (const [category, items] of Object.entries(byCategory)) {
      html += `        <DT><H3 ADD_DATE="${nowSec}" LAST_MODIFIED="${nowSec}">${escapeHtml(category)}</H3>\n`;
      html += `        <DL><p>\n`;
      items.forEach(item => {
        const title = escapeHtml(item.title || item.url);
        const url = escapeHtml(item.url);
        html += `            <DT><A HREF="${url}" ADD_DATE="${nowSec}">${title}</A>\n`;
      });
      html += `        </DL><p>\n`;
    }

    html += `    </DL><p>\n</DL><p>\n`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', downloadUrl);
    dlAnchor.setAttribute('download', `hooktab_bookmarks_${Date.now()}.html`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    document.body.removeChild(dlAnchor);
    URL.revokeObjectURL(downloadUrl);
    showToast('Exported Universal Netscape HTML Bookmark File');
  }

  function importBookmarks(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let imported = [];
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(content);
        } else if (file.name.endsWith('.html')) {
          // Parse Netscape Bookmark File
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          const links = doc.querySelectorAll('a');
          links.forEach(a => {
            if (a.href) {
              const detectedCat = detectCategory(a.href, a.textContent);
              imported.push({
                id: 'imp-' + Math.random().toString(36).substring(2),
                title: a.textContent.trim() || getDomain(a.href),
                url: a.href,
                page: state.activePage || 'Personal',
                category: detectedCat || 'General',
                tags: 'imported',
                favorite: false,
                visits: 0
              });
            }
          });
        }

        if (Array.isArray(imported) && imported.length > 0) {
          const existingUrls = new Set(state.bookmarks.map(b => b.url.toLowerCase()));
          let count = 0;
          imported.forEach(item => {
            if (item && item.url && isSafeUrl(item.url) && !existingUrls.has(item.url.toLowerCase())) {
              const cat = (item.category && item.category !== 'Imported' && item.category !== 'General') 
                ? String(item.category).slice(0, 100) 
                : detectCategory(item.url, item.title);
              state.bookmarks.push({
                id: (item.id && typeof item.id === 'string') ? item.id : ('imp-' + Date.now() + Math.random().toString(36).substring(2)),
                title: String(item.title || getDomain(item.url)).slice(0, 300),
                url: String(item.url).trim(),
                page: String(item.page || state.activePage || 'Personal').slice(0, 100),
                category: cat,
                tags: String(item.tags || '').slice(0, 200),
                favorite: !!item.favorite,
                visits: typeof item.visits === 'number' ? Math.max(0, item.visits) : 0
              });
              existingUrls.add(item.url.toLowerCase());
              count++;
            }
          });

          storage.set({ bookmarks: state.bookmarks });
          renderPagesBar();
          renderCategoryTabs();
          renderBookmarks();
          showToast(`Imported & organized ${count} new bookmarks!`);
        }
      } catch (err) {
        showToast('Error reading import file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  }

  function autoCategorizeAll() {
    if (!state.bookmarks || state.bookmarks.length === 0) {
      showToast('No bookmarks to categorize! Add or import some first.');
      return;
    }

    let modifiedCount = 0;
    const catCounts = {};

    state.bookmarks.forEach(bm => {
      const detected = detectCategory(bm.url, bm.title);
      if (detected && detected !== bm.category) {
        bm.category = detected;
        modifiedCount++;
      }
      catCounts[bm.category] = (catCounts[bm.category] || 0) + 1;
    });

    storage.set({ bookmarks: state.bookmarks });
    renderPagesBar();
    renderCategoryTabs();
    renderBookmarks();

    const uniqueCats = Object.keys(catCounts).length;
    showToast(`Organized ${state.bookmarks.length} bookmarks into ${uniqueCats} categories! (${modifiedCount} updated)`);
  }

  // =========================================================================
  // 13. INTELLIGENT AUTO-CATEGORIZATION ENGINE
  // =========================================================================
  function detectCategory(rawUrl, rawTitle) {
    const url = (rawUrl || '').toLowerCase();
    const title = (rawTitle || '').toLowerCase();
    let hostname = '';
    try {
      hostname = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      hostname = url;
    }

    // 1. AI & LLMs
    const aiDomains = ['openai.com', 'chatgpt.com', 'anthropic.com', 'claude.ai', 'huggingface.co', 'perplexity.ai', 'deepmind.google', 'midjourney.com', 'cursor.com', 'v0.dev', 'poe.com', 'replicate.com', 'mistral.ai', 'groq.com', 'elevenlabs.io', 'runwayml.com', 'stability.ai', 'cohere.com', 'ollama.com', 'claude.com'];
    const aiKeywords = ['ai', 'llm', 'gpt', 'chatgpt', 'claude', 'gemini', 'prompt', 'neural', 'deep learning', 'machine learning', 'diffusion', 'copilot', 'agent'];
    if (aiDomains.some(d => hostname.includes(d)) || aiKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title) || url.includes('/' + k))) {
      return 'AI & LLMs';
    }

    // 2. Dev & Code
    const devDomains = ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'stackexchange.com', 'npmjs.com', 'npmjs.org', 'pypi.org', 'developer.mozilla.org', 'w3schools.com', 'docker.com', 'vercel.com', 'netlify.com', 'aws.amazon.com', 'console.cloud.google.com', 'firebase.google.com', 'react.dev', 'vuejs.org', 'angular.dev', 'nextjs.org', 'typescriptlang.org', 'python.org', 'rust-lang.org', 'golang.org', 'leetcode.com', 'codepen.io', 'jsfiddle.net', 'codesandbox.io', 'replit.com', 'geeksforgeeks.org', 'css-tricks.com', 'dev.to', 'gist.github.com'];
    const devKeywords = ['github', 'api', 'repository', 'sdk', 'documentation', 'docs', 'compiler', 'debug', 'frontend', 'backend', 'fullstack', 'database', 'sql', 'json', 'webhook', 'cli'];
    if (devDomains.some(d => hostname.includes(d)) || devKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title) || url.includes('/' + k))) {
      return 'Dev & Code';
    }

    // 3. Social & Chat
    const socialDomains = ['x.com', 'twitter.com', 'reddit.com', 'discord.com', 'telegram.org', 't.me', 'slack.com', 'linkedin.com', 'instagram.com', 'threads.net', 'facebook.com', 'whatsapp.com', 'tiktok.com', 'mastodon.social', 'bsky.app', 'pinterest.com', 'snapchat.com', 'tumblr.com'];
    const socialKeywords = ['social', 'community', 'forum', 'discussion', 'subreddit', 'tweet', 'feed'];
    if (socialDomains.some(d => hostname.includes(d)) || socialKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Social & Chat';
    }

    // 4. Productivity & Work
    const prodDomains = ['notion.so', 'figma.com', 'trello.com', 'linear.app', 'jira.atlassian.com', 'atlassian.com', 'canva.com', 'docs.google.com', 'sheets.google.com', 'drive.google.com', 'slides.google.com', 'miro.com', 'airtable.com', 'zoom.us', 'cal.com', 'calendly.com', 'asana.com', 'loom.com', 'coda.io', 'clickup.com', 'monday.com', 'basecamp.com', 'evernote.com', 'todoist.com', 'dropbox.com'];
    const prodKeywords = ['workspace', 'task', 'project', 'kanban', 'spreadsheet', 'tracker', 'calendar', 'meeting', 'crm', 'workflow'];
    if (prodDomains.some(d => hostname.includes(d)) || prodKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Productivity';
    }

    // 5. Media & Video
    const mediaDomains = ['youtube.com', 'youtu.be', 'netflix.com', 'spotify.com', 'twitch.tv', 'vimeo.com', 'primevideo.com', 'soundcloud.com', 'disneyplus.com', 'hulu.com', 'hbomax.com', 'music.apple.com', 'podcasts.google.com', 'dailymotion.com', 'crunchyroll.com', 'bandcamp.com', 'imdb.com'];
    const mediaKeywords = ['watch', 'video', 'movie', 'film', 'music', 'album', 'podcast', 'stream', 'episode', 'series', 'track'];
    if (mediaDomains.some(d => hostname.includes(d)) || mediaKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Media & Video';
    }

    // 6. News & Reading
    const newsDomains = ['medium.com', 'substack.com', 'news.ycombinator.com', 'theverge.com', 'wired.com', 'techcrunch.com', 'bloomberg.com', 'bbc.com', 'reuters.com', 'nytimes.com', 'theguardian.com', 'arstechnica.com', 'engadget.com', 'mashable.com', 'forbes.com', 'wsj.com', 'hackernews.com', 'slashdot.org'];
    const newsKeywords = ['news', 'article', 'journal', 'headline', 'daily', 'editorial', 'newsletter', 'report', 'digest'];
    if (newsDomains.some(d => hostname.includes(d)) || newsKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'News & Reading';
    }

    // 7. Shopping & Finance
    const shopDomains = ['amazon.com', 'ebay.com', 'walmart.com', 'aliexpress.com', 'etsy.com', 'target.com', 'stripe.com', 'paypal.com', 'binance.com', 'coinbase.com', 'robinhood.com', 'tradingview.com', 'investing.com', 'coingecko.com', 'coinmarketcap.com', 'chase.com', 'bankofamerica.com', 'shopify.com'];
    const shopKeywords = ['shop', 'store', 'cart', 'buy', 'checkout', 'price', 'deals', 'discount', 'crypto', 'bitcoin', 'ethereum', 'stock', 'forex', 'portfolio', 'finance', 'banking'];
    if (shopDomains.some(d => hostname.includes(d)) || shopKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Shopping & Finance';
    }

    // 8. Design & Creative
    const designDomains = ['dribbble.com', 'behance.net', 'unsplash.com', 'pexels.com', 'fontawesome.com', 'icons8.com', 'coolors.co', 'svgrepo.com', 'flaticon.com', 'freepik.com', 'fonts.google.com', 'colorhunt.co', 'typewolf.com', 'mobbin.com', 'awwwards.com'];
    const designKeywords = ['design', 'ui', 'ux', 'vector', 'palette', 'typography', 'font', 'icon', 'illustration', 'mockup', 'artwork', 'graphic'];
    if (designDomains.some(d => hostname.includes(d)) || designKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Design & Creative';
    }

    return 'General';
  }

  function clearAllBookmarks() {
    if (confirm('Clear all bookmarks? This will give you a clean slate to add only your own bookmarks.')) {
      state.bookmarks = [];
      storage.set({ bookmarks: [] });
      renderCategoryTabs();
      renderBookmarks();
      showToast('All bookmarks cleared! Clean slate.');
    }
  }

  // =========================================================================
  // 14. QUICK NOTES SCRATCHPAD
  // =========================================================================
  let notesSaveTimer = null;
  function handleNotesInput() {
    dom.notesStatus.textContent = 'Saving...';
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(() => {
      const val = dom.notesTextarea.value;
      storage.set({ quickNotes: val });
      dom.notesStatus.textContent = 'Saved';
    }, 400);
  }

  // =========================================================================
  // 15. TOAST NOTIFICATIONS & UTILITIES
  // =========================================================================
  let toastTimer = null;
  function showToast(message, duration = 2500, action = null) {
    if (!dom.toast) return;
    dom.toast.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = message;
    dom.toast.appendChild(span);

    if (action && action.text && typeof action.onClick === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action-btn';
      btn.textContent = action.text;
      btn.addEventListener('click', () => {
        action.onClick();
        dom.toast.classList.add('hidden');
      });
      dom.toast.appendChild(btn);
    }

    dom.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.add('hidden');
    }, duration);
  }

  // Utility: HTML Escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Security: Protocol whitelist to prevent XSS and script injection
  function isSafeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    const trimmed = rawUrl.trim();
    if (trimmed.length > 4096) return false;
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('data:text/html') ||
      lower.startsWith('data:application/')
    ) {
      return false;
    }
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);
      return ['http:', 'https:', 'brave:', 'chrome:', 'edge:'].includes(parsed.protocol);
    } catch (e) {
      return false;
    }
  }

  // =========================================================================
  // 16. CUSTOM SEARCH ENGINE MODAL
  // =========================================================================
  function openAddEngineModal() {
    if (dom.enginePopover) dom.enginePopover.classList.add('hidden');
    if (dom.customizerDrawer) dom.customizerDrawer.classList.add('hidden');
    if (dom.customEngName) dom.customEngName.value = '';
    if (dom.customEngUrl) dom.customEngUrl.value = '';
    if (dom.customEngIcon) dom.customEngIcon.value = '';
    if (dom.engineModal) dom.engineModal.classList.remove('hidden');
    setTimeout(() => {
      if (dom.customEngName) dom.customEngName.focus();
    }, 60);
  }

  function closeAddEngineModal() {
    if (dom.engineModal) dom.engineModal.classList.add('hidden');
  }

  function handleAddEngineSubmit(e) {
    e.preventDefault();
    const name = dom.customEngName.value.trim();
    let url = dom.customEngUrl.value.trim();
    const iconUrl = dom.customEngIcon.value.trim();

    if (!name || !url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    if (!isSafeUrl(url)) {
      showToast('Please enter a valid http:// or https:// search URL');
      return;
    }
    if (iconUrl && !isSafeUrl(iconUrl) && !iconUrl.startsWith('data:image/')) {
      showToast('Invalid icon URL');
      return;
    }

    // Ensure search URL has query parameter format
    if (!url.includes('=') && !url.includes('?')) {
      url += (url.includes('?') ? '&q=' : '?q=');
    }

    const newEngine = {
      id: 'custom_' + Date.now(),
      name: name,
      url: url,
      iconUrl: iconUrl
    };

    if (!state.customEngines) state.customEngines = [];
    state.customEngines.push(newEngine);
    storage.set({ customEngines: state.customEngines });

    renderEngineChoices();
    setSearchEngine(newEngine.id);
    closeAddEngineModal();
    showToast(`Added "${name}" search engine!`);
  }

  // =========================================================================
  // 17. BUG REPORT & FEEDBACK SYSTEM
  // =========================================================================
  function getDiagnosticsInfo() {
    const userAgent = navigator.userAgent;
    const isBrave = (navigator.brave && typeof navigator.brave.isBrave === 'function') || userAgent.includes('Brave');
    const browser = isBrave ? 'Brave' : (userAgent.includes('Edg') ? 'Edge' : 'Chrome');
    return {
      product: 'HookTab v1.0.0',
      browser: browser,
      platform: navigator.platform || 'Unknown',
      theme: state.theme,
      layout: state.currentLayout,
      bookmarksCount: state.bookmarks.length,
      pagesCount: state.pages ? state.pages.length : 1,
      privacyMode: !!state.privacyMode,
      activeEngine: state.searchEngine,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  function openBugModal() {
    if (dom.customizerDrawer) dom.customizerDrawer.classList.add('hidden');
    if (dom.bugTitle) dom.bugTitle.value = '';
    if (dom.bugDescription) dom.bugDescription.value = '';
    if (dom.bugType) dom.bugType.selectedIndex = 0;

    const diag = getDiagnosticsInfo();
    if (dom.bugDiagnostics) {
      dom.bugDiagnostics.textContent = `Extension: ${diag.product} | Browser: ${diag.browser} | Platform: ${diag.platform} | Bookmarks: ${diag.bookmarksCount} | Theme: ${diag.theme} | Layout: ${diag.layout}`;
    }

    if (dom.bugModal) dom.bugModal.classList.remove('hidden');
    setTimeout(() => {
      if (dom.bugTitle) dom.bugTitle.focus();
    }, 60);
  }

  function closeBugModal() {
    if (dom.bugModal) dom.bugModal.classList.add('hidden');
  }

  function copyDiagnosticsToClipboard() {
    const diag = getDiagnosticsInfo();
    const formatted = JSON.stringify(diag, null, 2);
    navigator.clipboard.writeText(formatted).then(() => {
      showToast('Diagnostics copied to clipboard!');
    }).catch(() => {
      showToast('Could not copy to clipboard.');
    });
  }

  function handleBugReportSubmit(e) {
    e.preventDefault();
    const type = dom.bugType ? dom.bugType.value : 'Bug Report';
    const title = dom.bugTitle ? dom.bugTitle.value.trim() : '';
    const desc = dom.bugDescription ? dom.bugDescription.value.trim() : '';
    const diag = getDiagnosticsInfo();

    if (!title || !desc) return;

    const issueBody = `### Feedback Type\n${type}\n\n### Description\n${desc}\n\n### Environment Diagnostics\n\`\`\`json\n${JSON.stringify(diag, null, 2)}\n\`\`\``;

    try {
      navigator.clipboard.writeText(`[${type}] ${title}\n\n${issueBody}`);
    } catch(err) {}

    const encodedTitle = encodeURIComponent(`[${type}] ${title}`);
    const encodedBody = encodeURIComponent(issueBody);
    const githubUrl = `https://github.com/issues/new?title=${encodedTitle}&body=${encodedBody}`;

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: githubUrl });
    } else {
      const win = window.open(githubUrl, '_blank', 'noopener,noreferrer');
      if (win) win.opener = null;
    }
    closeBugModal();
    showToast('Report prepared & copied to clipboard! Thank you.');
  }

  // =========================================================================
  // 18. EVENT LISTENERS & LIFECYCLE
  // =========================================================================
  function setupEventListeners() {
    // Search Events
    dom.searchForm.addEventListener('submit', handleSearchSubmit);
    dom.searchInput.addEventListener('input', handleSearchInput);
    dom.btnClearSearch.addEventListener('click', () => {
      dom.searchInput.value = '';
      dom.btnClearSearch.classList.add('hidden');
      dom.searchSuggestions.classList.add('hidden');
      if (state.searchMode === 'bookmarks') {
        filterBookmarks('');
      }
      dom.searchInput.focus();
    });

    // Engine Picker (Trigger Button)
    if (dom.btnEngineTrigger) {
      dom.btnEngineTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.enginePopover.classList.toggle('hidden');
      });
    }

    // Add Engine Buttons & Modal
    if (dom.btnAddEngine) {
      dom.btnAddEngine.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddEngineModal();
      });
    }

    if (dom.btnDrawerAddEngine) {
      dom.btnDrawerAddEngine.addEventListener('click', () => {
        openAddEngineModal();
      });
    }

    if (dom.btnRemoveAllEngines) {
      dom.btnRemoveAllEngines.addEventListener('click', removeAllEngines);
    }

    if (dom.btnRestoreEngines) {
      dom.btnRestoreEngines.addEventListener('click', restoreDefaultEngines);
    }

    if (dom.btnCloseEngineModal) {
      dom.btnCloseEngineModal.addEventListener('click', closeAddEngineModal);
    }

    if (dom.btnCancelEngineModal) {
      dom.btnCancelEngineModal.addEventListener('click', closeAddEngineModal);
    }

    if (dom.engineForm) {
      dom.engineForm.addEventListener('submit', handleAddEngineSubmit);
    }

    // Search Mode Switcher (Web vs Bookmarks)
    if (dom.modeWeb) {
      dom.modeWeb.addEventListener('click', () => {
        state.searchMode = 'web';
        dom.modeWeb.classList.add('active');
        if (dom.modeBookmarks) dom.modeBookmarks.classList.remove('active');
        const eng = getEngineConfig(state.searchEngine);
        dom.searchInput.placeholder = `Search ${eng.name} or type URL... (Press / to focus)`;
        if (state.searchQuery) {
          filterBookmarks('');
        }
        if (dom.searchInput.value.trim()) {
          generateSuggestions(dom.searchInput.value.trim());
        }
        dom.searchInput.focus();
      });
    }

    if (dom.modeBookmarks) {
      dom.modeBookmarks.addEventListener('click', () => {
        state.searchMode = 'bookmarks';
        dom.modeBookmarks.classList.add('active');
        if (dom.modeWeb) dom.modeWeb.classList.remove('active');
        dom.searchInput.placeholder = 'Search within your Bookmarks...';
        dom.searchSuggestions.classList.add('hidden');
        if (dom.searchInput.value.trim()) {
          filterBookmarks(dom.searchInput.value.trim());
        }
        dom.searchInput.focus();
      });
    }

    // Voice Search
    initVoiceSearch();

    // Delegated CSP-compliant image error handling (Zero inline onerror handlers)
    document.addEventListener('error', (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        if (e.target.classList.contains('bm-favicon')) {
          e.target.style.display = 'none';
          const fallback = e.target.nextElementSibling;
          if (fallback && fallback.classList.contains('bm-fallback-initial')) {
            fallback.style.display = 'flex';
          }
        } else if (e.target.classList.contains('engine-img-icon')) {
          const initials = e.target.dataset.initials || 'SE';
          const parent = e.target.parentElement;
          if (parent) parent.textContent = initials;
        }
      }
    }, true);

    // Close suggestions and popovers when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#engine-picker-wrap')) {
        if (dom.enginePopover) dom.enginePopover.classList.add('hidden');
      }
      if (!e.target.closest('.search-section')) {
        if (dom.searchSuggestions) dom.searchSuggestions.classList.add('hidden');
      }
    });

    // Layout Switchers
    if (dom.layoutCards) dom.layoutCards.addEventListener('click', () => applyLayout('cards'));
    if (dom.layoutBoard) dom.layoutBoard.addEventListener('click', () => applyLayout('board'));
    if (dom.layoutCompact) dom.layoutCompact.addEventListener('click', () => applyLayout('compact'));
    if (dom.layoutList) dom.layoutList.addEventListener('click', () => applyLayout('list'));

    // Filter Bookmarks
    if (dom.bookmarkFilterInput) {
      dom.bookmarkFilterInput.addEventListener('input', (e) => {
        filterBookmarks(e.target.value.trim());
      });
    }

    // Sort Dropdown
    if (dom.sortSelect) {
      dom.sortSelect.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        storage.set({ currentSort: state.currentSort });
        renderBookmarks();
      });
    }

    // Add Bookmark
    dom.btnAddBookmark.addEventListener('click', openAddModal);
    dom.btnEmptyAdd.addEventListener('click', openAddModal);
    dom.btnCloseModal.addEventListener('click', closeModal);
    dom.btnCancelModal.addEventListener('click', closeModal);
    dom.bookmarkForm.addEventListener('submit', handleBookmarkFormSubmit);
    dom.btnAutoFill.addEventListener('click', autoFillTitle);
    if (dom.bmUrl) {
      dom.bmUrl.addEventListener('change', autoFillTitle);
      dom.bmUrl.addEventListener('blur', autoFillTitle);
    }

    // Auto-Categorize Actions
    if (dom.btnAutoCategorize) {
      dom.btnAutoCategorize.addEventListener('click', autoCategorizeAll);
    }
    if (dom.btnDrawerAutoCategorize) {
      dom.btnDrawerAutoCategorize.addEventListener('click', autoCategorizeAll);
    }

    // Privacy Mode Toggle & Banner
    if (dom.btnPrivacyToggle) {
      dom.btnPrivacyToggle.addEventListener('click', () => togglePrivacyMode());
    }
    if (dom.btnExitPrivacy) {
      dom.btnExitPrivacy.addEventListener('click', () => togglePrivacyMode(false));
    }

    // Multiple Pages (Add Page)
    if (dom.btnAddPage) {
      dom.btnAddPage.addEventListener('click', addNewPage);
    }

    // Cloud Sync & 1-Click Import Actions
    if (dom.btnImportBrowser) {
      dom.btnImportBrowser.addEventListener('click', syncCloudBookmarks);
    }
    if (dom.btnEmptyImport) {
      dom.btnEmptyImport.addEventListener('click', syncCloudBookmarks);
    }
    if (dom.btnSyncBrave) {
      dom.btnSyncBrave.addEventListener('click', syncCloudBookmarks);
    }
    if (dom.btnDrawerSyncCloud) {
      dom.btnDrawerSyncCloud.addEventListener('click', syncCloudBookmarks);
    }
    if (dom.btnConfigureShortcuts) {
      dom.btnConfigureShortcuts.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        } else {
          showToast('In Brave, open brave://extensions/shortcuts in a new tab');
        }
      });
    }
    if (dom.btnExportJson) {
      dom.btnExportJson.addEventListener('click', exportBookmarksJson);
    }
    if (dom.btnExportHtml) {
      dom.btnExportHtml.addEventListener('click', exportBookmarksHtml);
    }
    if (dom.btnDrawerExport) {
      dom.btnDrawerExport.addEventListener('click', exportBookmarksJson);
    }
    if (dom.btnDrawerExportHtml) {
      dom.btnDrawerExportHtml.addEventListener('click', exportBookmarksHtml);
    }
    if (dom.importFileInput) {
      dom.importFileInput.addEventListener('change', importBookmarks);
    }
    if (dom.btnClearAll) {
      dom.btnClearAll.addEventListener('click', clearAllBookmarks);
    }

    // Real-time synchronization when bookmarks or settings change across tabs or background shortcut
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.bookmarks) {
            state.bookmarks = changes.bookmarks.newValue || [];
            renderPagesBar();
            renderCategoryTabs();
            renderBookmarks();
          }
          if (changes.pages) {
            state.pages = changes.pages.newValue || ['Personal', 'Work', 'Projects'];
            renderPagesBar();
          }
          if (changes.activePage && changes.activePage.newValue !== state.activePage) {
            state.activePage = changes.activePage.newValue;
            renderPagesBar();
            renderCategoryTabs();
            renderBookmarks();
          }
          if (changes.privacyMode && typeof changes.privacyMode.newValue === 'boolean') {
            togglePrivacyMode(changes.privacyMode.newValue);
          }
        }
      });
    }

    // Direct Browser Bookmark Listeners (Star icon in address bar, Ctrl+D, or mobile sync)
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      if (chrome.bookmarks.onCreated) {
        chrome.bookmarks.onCreated.addListener((id, bm) => {
          if (!bm.url || 
              bm.url.startsWith('chrome://') || 
              bm.url.startsWith('brave://') || 
              bm.url.startsWith('edge://') || 
              bm.url.startsWith('chrome-extension://')) {
            return;
          }
          const norm = bm.url.toLowerCase().replace(/\/$/, '');
          if (state.bookmarks.some(b => b.url.toLowerCase().replace(/\/$/, '') === norm)) {
            return; // Already present
          }
          const newBookmark = {
            id: 'cloud-' + id,
            nativeId: id,
            title: bm.title || getDomain(bm.url),
            url: bm.url,
            page: state.activePage || 'Personal',
            category: detectCategory(bm.url, bm.title),
            tags: 'browser-sync',
            favorite: false,
            visits: 0
          };
          state.bookmarks.unshift(newBookmark);
          storage.set({ bookmarks: state.bookmarks });
          renderPagesBar();
          renderCategoryTabs();
          renderBookmarks();
        });
      }

      if (chrome.bookmarks.onRemoved) {
        chrome.bookmarks.onRemoved.addListener((id) => {
          const prevLen = state.bookmarks.length;
          state.bookmarks = state.bookmarks.filter(b => b.nativeId !== id && b.id !== ('cloud-' + id));
          if (state.bookmarks.length !== prevLen) {
            storage.set({ bookmarks: state.bookmarks });
            renderPagesBar();
            renderCategoryTabs();
            renderBookmarks();
          }
        });
      }
    }

    // Auto-refresh when user switches back to this tab
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        storage.get(['bookmarks', 'pages', 'activePage'], (data) => {
          let updated = false;
          if (data.bookmarks && JSON.stringify(data.bookmarks) !== JSON.stringify(state.bookmarks)) {
            state.bookmarks = data.bookmarks;
            updated = true;
          }
          if (data.pages && JSON.stringify(data.pages) !== JSON.stringify(state.pages)) {
            state.pages = data.pages;
            updated = true;
          }
          if (data.activePage && data.activePage !== state.activePage) {
            state.activePage = data.activePage;
            updated = true;
          }
          if (updated) {
            renderPagesBar();
            renderCategoryTabs();
            renderBookmarks();
          }
        });
      }
    });

    // Customizer Drawer
    dom.btnOpenCustomizer.addEventListener('click', () => {
      dom.customizerDrawer.classList.remove('hidden');
    });
    dom.btnCloseCustomizer.addEventListener('click', () => {
      dom.customizerDrawer.classList.add('hidden');
    });

    // Theme selector cards
    dom.themeCards.forEach(card => {
      card.addEventListener('click', () => {
        applyTheme(card.dataset.setTheme);
      });
    });

    // Accent Color picker (Dual gradient colors)
    if (dom.accentColorInput) {
      dom.accentColorInput.addEventListener('input', (e) => {
        applyAccent(e.target.value, state.accentColor2);
      });
    }
    if (dom.accentColor2Input) {
      dom.accentColor2Input.addEventListener('input', (e) => {
        applyAccent(state.accentColor, e.target.value);
      });
    }

    // Clock widget toggle format on click or keypress
    if (dom.timeWidget) {
      dom.timeWidget.addEventListener('click', toggleTimeFormat);
      dom.timeWidget.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTimeFormat();
        }
      });
    }

    // Settings drawer 12h / 24h buttons
    if (dom.btnTime12) {
      dom.btnTime12.addEventListener('click', () => setTimeFormat('12'));
    }
    if (dom.btnTime24) {
      dom.btnTime24.addEventListener('click', () => setTimeFormat('24'));
    }

    // Weather widget toggle unit on click or keypress
    if (dom.weatherWidget) {
      dom.weatherWidget.addEventListener('click', toggleWeatherUnit);
      dom.weatherWidget.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleWeatherUnit();
        }
      });
    }

    // Wallpaper Preset cards
    dom.wallpaperCards.forEach(card => {
      card.addEventListener('click', () => {
        applyWallpaper(card.dataset.wp, null);
      });
    });

    // Custom Wallpaper Upload
    dom.wallpaperUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        applyWallpaper('custom', base64);
        showToast('Custom wallpaper applied!');
      };
      reader.readAsDataURL(file);
    });

    // Sliders
    dom.sliderBlur.addEventListener('input', (e) => {
      applySliders(parseInt(e.target.value, 10), state.darkness);
    });
    dom.sliderDarkness.addEventListener('input', (e) => {
      applySliders(state.blur, parseInt(e.target.value, 10));
    });

    // Quick Notes
    dom.btnNotesToggle.addEventListener('click', () => {
      dom.notesWidget.classList.toggle('hidden');
      if (!dom.notesWidget.classList.contains('hidden')) {
        dom.notesTextarea.focus();
      }
    });
    dom.btnCloseNotes.addEventListener('click', () => {
      dom.notesWidget.classList.add('hidden');
    });
    dom.notesTextarea.addEventListener('input', handleNotesInput);
    dom.btnClearNotes.addEventListener('click', () => {
      dom.notesTextarea.value = '';
      storage.set({ quickNotes: '' });
      dom.notesStatus.textContent = 'Cleared';
    });

    // Bug Report & Feedback Modal
    if (dom.btnReportBug) {
      dom.btnReportBug.addEventListener('click', openBugModal);
    }
    if (dom.btnCloseBugModal) {
      dom.btnCloseBugModal.addEventListener('click', closeBugModal);
    }
    if (dom.btnCancelBugModal) {
      dom.btnCancelBugModal.addEventListener('click', closeBugModal);
    }
    if (dom.btnCopyDiagnostics) {
      dom.btnCopyDiagnostics.addEventListener('click', copyDiagnosticsToClipboard);
    }
    if (dom.bugForm) {
      dom.bugForm.addEventListener('submit', handleBugReportSubmit);
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt+P toggles Privacy Mode (Blur for screen-sharing)
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        togglePrivacyMode();
      }

      // Esc closes modals and drawer
      if (e.key === 'Escape') {
        closeModal();
        closeAddEngineModal();
        closeBugModal();
        dom.customizerDrawer.classList.add('hidden');
        dom.notesWidget.classList.add('hidden');
        dom.searchSuggestions.classList.add('hidden');
        if (dom.enginePopover) dom.enginePopover.classList.add('hidden');
      }

      // '/' focuses search bar if not already in input
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        dom.searchInput.focus();
        dom.searchInput.select();
      }
    });

    // Live Wallpaper: Performance Lifecycle & Mouse Parallax
    window.addEventListener('resize', () => {
      if (state.wallpaper && state.wallpaper.startsWith('live-')) {
        resizeLiveCanvas();
      }
    });

    window.addEventListener('mousemove', (e) => {
      mousePos.targetX = e.clientX;
      mousePos.targetY = e.clientY;
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (liveAnimId) {
          cancelAnimationFrame(liveAnimId);
          liveAnimId = null;
        }
      } else {
        if (state.wallpaper && state.wallpaper.startsWith('live-') && !liveAnimId) {
          runLiveWallpaperLoop();
        }
      }
    });
  }

  // Launch!
  init();
})();
