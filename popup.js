/**
 * HookTab - Extension Toolbar Popup
 */

(function () {
  'use strict';

  let currentTab = null;
  let allBookmarks = [];
  let activePage = 'Personal';

  const dom = {
    currentFavicon: null,
    currentTitle: null,
    currentUrl: null,
    quickCategory: null,
    btnSaveCurrent: null,
    btnOpenDashboard: null,
    popupSearch: null,
    popupResults: null,
    popupToast: null
  };

  // Safe storage helper
  function getStorage(keys, callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, callback);
    } else {
      const res = {};
      keys.forEach(k => {
        const val = localStorage.getItem('hooktab_' + k) || localStorage.getItem('nexustab_' + k);
        if (val) {
          try { res[k] = JSON.parse(val); } catch(e) { res[k] = val; }
        }
      });
      callback(res);
    }
  }

  function setStorage(items, callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(items, callback);
    } else {
      for (const [k, v] of Object.entries(items)) {
        localStorage.setItem('hooktab_' + k, JSON.stringify(v));
      }
      if (callback) callback();
    }
  }

  function initPopup() {
    // Populate DOM elements safely
    dom.currentFavicon = document.getElementById('current-favicon');
    dom.currentTitle = document.getElementById('current-title');
    dom.currentUrl = document.getElementById('current-url');
    dom.quickCategory = document.getElementById('quick-category');
    dom.btnSaveCurrent = document.getElementById('btn-save-current');
    dom.btnOpenDashboard = document.getElementById('btn-open-dashboard');
    dom.popupSearch = document.getElementById('popup-search');
    dom.popupResults = document.getElementById('popup-results');
    dom.popupToast = document.getElementById('popup-toast');

    // 1. Fetch Active Tab Information
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          currentTab = tabs[0];
          if (dom.currentTitle) {
            dom.currentTitle.textContent = currentTab.title || 'Current Webpage';
          }
          if (dom.currentUrl) {
            dom.currentUrl.textContent = currentTab.url || '';
          }
          if (dom.currentFavicon) {
            if (currentTab.favIconUrl) {
              dom.currentFavicon.src = currentTab.favIconUrl;
            } else {
              try {
                const host = new URL(currentTab.url).hostname;
                dom.currentFavicon.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
              } catch(e) {}
            }
          }

          // Default category to General
          if (dom.quickCategory) {
            dom.quickCategory.value = 'General';
          }
        }
      });
    } else {
      if (dom.currentTitle) dom.currentTitle.textContent = 'Active Browser Tab';
      if (dom.currentUrl) dom.currentUrl.textContent = window.location.href;
    }

    // 2. Load Bookmarks for search & additions
    getStorage(['bookmarks', 'activePage'], (data) => {
      allBookmarks = data.bookmarks || [];
      if (data.activePage) activePage = data.activePage;
      renderResults(allBookmarks.slice(0, 5));
    });

    // 3. Save Active Tab
    if (dom.btnSaveCurrent) {
      dom.btnSaveCurrent.addEventListener('click', () => {
        if (!currentTab || !currentTab.url || !isSafeUrl(currentTab.url)) {
          showToast('Cannot save invalid or internal tab');
          return;
        }

        const cat = (dom.quickCategory && dom.quickCategory.value) || 'General';
        const newBookmark = {
          id: 'tab-' + Date.now(),
          title: currentTab.title || 'Saved Page',
          url: currentTab.url,
          page: activePage || 'Personal',
          category: cat,
          tags: 'quick-save',
          favorite: false,
          visits: 1
        };

        allBookmarks.unshift(newBookmark);
        setStorage({ bookmarks: allBookmarks }, () => {
          // Sync to native bookmarks for cross-device Brave / Chrome sync
          if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.create) {
            chrome.bookmarks.create({
              title: newBookmark.title,
              url: newBookmark.url
            }, () => {});
          }
          showToast('Saved to ' + newBookmark.category + '!');
          renderResults(allBookmarks.slice(0, 5));
        });
      });
    }

    // 4. Open Dashboard
    if (dom.btnOpenDashboard) {
      dom.btnOpenDashboard.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
        } else {
          window.open('newtab.html', '_blank');
        }
      });
    }

    const shortcutKbd = document.getElementById('popup-shortcut-kbd');
    if (shortcutKbd) {
      shortcutKbd.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
        }
      });
    }

    // 5. Search existing bookmarks
    if (dom.popupSearch) {
      dom.popupSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
          renderResults(allBookmarks.slice(0, 5));
          return;
        }
        const matches = allBookmarks.filter(b => 
          (b.title && b.title.toLowerCase().includes(q)) || 
          (b.url && b.url.toLowerCase().includes(q)) ||
          (b.category && b.category.toLowerCase().includes(q))
        ).slice(0, 8);
        renderResults(matches);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isSafeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    const lower = rawUrl.trim().toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
      return false;
    }
    try {
      const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
      return ['http:', 'https:', 'brave:', 'chrome:', 'edge:'].includes(parsed.protocol);
    } catch (e) {
      return false;
    }
  }

  function renderResults(list) {
    if (!dom.popupResults) return;
    dom.popupResults.innerHTML = '';
    list.forEach(b => {
      if (!b || !b.url || !isSafeUrl(b.url)) return;
      const row = document.createElement('a');
      row.className = 'result-row';
      row.href = b.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      row.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(b.title || b.url)}</span>
      `;
      row.addEventListener('click', (e) => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          e.preventDefault();
          chrome.tabs.create({ url: b.url });
        }
      });
      dom.popupResults.appendChild(row);
    });
  }

  function showToast(msg) {
    if (!dom.popupToast) return;
    dom.popupToast.textContent = msg;
    dom.popupToast.classList.remove('hidden');
    setTimeout(() => {
      if (dom.popupToast) dom.popupToast.classList.add('hidden');
    }, 2000);
  }

  // Category helper (defaults to General)
  function detectCategory(rawUrl, rawTitle) {
    return 'General';
  }

  // Safe launch after DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }
})();
