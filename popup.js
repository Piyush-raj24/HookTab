/**
 * HookTab - Extension Toolbar Popup
 */

(function () {
  'use strict';

  let currentTab = null;
  let allBookmarks = [];

  const dom = {
    currentFavicon: document.getElementById('current-favicon'),
    currentTitle: document.getElementById('current-title'),
    currentUrl: document.getElementById('current-url'),
    quickCategory: document.getElementById('quick-category'),
    btnSaveCurrent: document.getElementById('btn-save-current'),
    btnOpenDashboard: document.getElementById('btn-open-dashboard'),
    popupSearch: document.getElementById('popup-search'),
    popupResults: document.getElementById('popup-results'),
    popupToast: document.getElementById('popup-toast')
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

  // 1. Fetch Active Tab Information
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        currentTab = tabs[0];
        dom.currentTitle.textContent = currentTab.title || 'Current Webpage';
        dom.currentUrl.textContent = currentTab.url || '';
        if (currentTab.favIconUrl) {
          dom.currentFavicon.src = currentTab.favIconUrl;
        } else {
          try {
            const host = new URL(currentTab.url).hostname;
            dom.currentFavicon.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
          } catch(e) {}
        }

        // Auto-select detected category
        const detectedCat = detectCategory(currentTab.url, currentTab.title);
        if (dom.quickCategory) {
          dom.quickCategory.value = detectedCat;
        }
      }
    });
  } else {
    dom.currentTitle.textContent = 'Active Browser Tab';
    dom.currentUrl.textContent = window.location.href;
  }

  let activePage = 'Personal';

  // 2. Load Bookmarks for search & additions
  getStorage(['bookmarks', 'activePage'], (data) => {
    allBookmarks = data.bookmarks || [];
    if (data.activePage) activePage = data.activePage;
    renderResults(allBookmarks.slice(0, 5));
  });

  // 3. Save Active Tab
  dom.btnSaveCurrent.addEventListener('click', () => {
    if (!currentTab || !currentTab.url || !isSafeUrl(currentTab.url)) {
      showToast('Cannot save invalid or internal tab');
      return;
    }

    const newBookmark = {
      id: 'tab-' + Date.now(),
      title: currentTab.title || 'Saved Page',
      url: currentTab.url,
      page: activePage || 'Personal',
      category: dom.quickCategory.value,
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

  // 4. Open Dashboard
  dom.btnOpenDashboard.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
    } else {
      window.open('newtab.html', '_blank');
    }
  });

  const shortcutKbd = document.getElementById('popup-shortcut-kbd');
  if (shortcutKbd) {
    shortcutKbd.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      }
    });
  }

  // 5. Search existing bookmarks
  dom.popupSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderResults(allBookmarks.slice(0, 5));
      return;
    }
    const matches = allBookmarks.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.url.toLowerCase().includes(q) ||
      (b.category && b.category.toLowerCase().includes(q))
    ).slice(0, 8);
    renderResults(matches);
  });

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
    dom.popupToast.textContent = msg;
    dom.popupToast.classList.remove('hidden');
    setTimeout(() => {
      dom.popupToast.classList.add('hidden');
    }, 2000);
  }

  // Intelligent Topic & Category Classifier
  function detectCategory(rawUrl, rawTitle) {
    const url = (rawUrl || '').toLowerCase();
    const title = (rawTitle || '').toLowerCase();
    let hostname = '';
    try {
      hostname = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      hostname = url;
    }

    const aiDomains = ['openai.com', 'chatgpt.com', 'anthropic.com', 'claude.ai', 'huggingface.co', 'perplexity.ai', 'deepmind.google', 'midjourney.com', 'cursor.com', 'v0.dev', 'poe.com', 'replicate.com', 'mistral.ai', 'groq.com', 'elevenlabs.io', 'runwayml.com', 'stability.ai', 'cohere.com', 'ollama.com', 'claude.com'];
    const aiKeywords = ['ai', 'llm', 'gpt', 'chatgpt', 'claude', 'gemini', 'prompt', 'neural', 'deep learning', 'machine learning', 'diffusion', 'copilot', 'agent'];
    if (aiDomains.some(d => hostname.includes(d)) || aiKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title) || url.includes('/' + k))) {
      return 'AI & LLMs';
    }

    const devDomains = ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'stackexchange.com', 'npmjs.com', 'npmjs.org', 'pypi.org', 'developer.mozilla.org', 'w3schools.com', 'docker.com', 'vercel.com', 'netlify.com', 'aws.amazon.com', 'console.cloud.google.com', 'firebase.google.com', 'react.dev', 'vuejs.org', 'angular.dev', 'nextjs.org', 'typescriptlang.org', 'python.org', 'rust-lang.org', 'golang.org', 'leetcode.com', 'codepen.io', 'jsfiddle.net', 'codesandbox.io', 'replit.com', 'geeksforgeeks.org', 'css-tricks.com', 'dev.to', 'gist.github.com'];
    const devKeywords = ['github', 'api', 'repository', 'sdk', 'documentation', 'docs', 'compiler', 'debug', 'frontend', 'backend', 'fullstack', 'database', 'sql', 'json', 'webhook', 'cli'];
    if (devDomains.some(d => hostname.includes(d)) || devKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title) || url.includes('/' + k))) {
      return 'Dev & Code';
    }

    const socialDomains = ['x.com', 'twitter.com', 'reddit.com', 'discord.com', 'telegram.org', 't.me', 'slack.com', 'linkedin.com', 'instagram.com', 'threads.net', 'facebook.com', 'whatsapp.com', 'tiktok.com', 'mastodon.social', 'bsky.app', 'pinterest.com', 'snapchat.com', 'tumblr.com'];
    const socialKeywords = ['social', 'community', 'forum', 'discussion', 'subreddit', 'tweet', 'feed'];
    if (socialDomains.some(d => hostname.includes(d)) || socialKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Social & Chat';
    }

    const prodDomains = ['notion.so', 'figma.com', 'trello.com', 'linear.app', 'jira.atlassian.com', 'atlassian.com', 'canva.com', 'docs.google.com', 'sheets.google.com', 'drive.google.com', 'slides.google.com', 'miro.com', 'airtable.com', 'zoom.us', 'cal.com', 'calendly.com', 'asana.com', 'loom.com', 'coda.io', 'clickup.com', 'monday.com', 'basecamp.com', 'evernote.com', 'todoist.com', 'dropbox.com'];
    const prodKeywords = ['workspace', 'task', 'project', 'kanban', 'spreadsheet', 'tracker', 'calendar', 'meeting', 'crm', 'workflow'];
    if (prodDomains.some(d => hostname.includes(d)) || prodKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Productivity';
    }

    const mediaDomains = ['youtube.com', 'youtu.be', 'netflix.com', 'spotify.com', 'twitch.tv', 'vimeo.com', 'primevideo.com', 'soundcloud.com', 'disneyplus.com', 'hulu.com', 'hbomax.com', 'music.apple.com', 'podcasts.google.com', 'dailymotion.com', 'crunchyroll.com', 'bandcamp.com', 'imdb.com'];
    const mediaKeywords = ['watch', 'video', 'movie', 'film', 'music', 'album', 'podcast', 'stream', 'episode', 'series', 'track'];
    if (mediaDomains.some(d => hostname.includes(d)) || mediaKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Media & Video';
    }

    const newsDomains = ['medium.com', 'substack.com', 'news.ycombinator.com', 'theverge.com', 'wired.com', 'techcrunch.com', 'bloomberg.com', 'bbc.com', 'reuters.com', 'nytimes.com', 'theguardian.com', 'arstechnica.com', 'engadget.com', 'mashable.com', 'forbes.com', 'wsj.com', 'hackernews.com', 'slashdot.org'];
    const newsKeywords = ['news', 'article', 'journal', 'headline', 'daily', 'editorial', 'newsletter', 'report', 'digest'];
    if (newsDomains.some(d => hostname.includes(d)) || newsKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'News & Reading';
    }

    const shopDomains = ['amazon.com', 'ebay.com', 'walmart.com', 'aliexpress.com', 'etsy.com', 'target.com', 'stripe.com', 'paypal.com', 'binance.com', 'coinbase.com', 'robinhood.com', 'tradingview.com', 'investing.com', 'coingecko.com', 'coinmarketcap.com', 'chase.com', 'bankofamerica.com', 'shopify.com'];
    const shopKeywords = ['shop', 'store', 'cart', 'buy', 'checkout', 'price', 'deals', 'discount', 'crypto', 'bitcoin', 'ethereum', 'stock', 'forex', 'portfolio', 'finance', 'banking'];
    if (shopDomains.some(d => hostname.includes(d)) || shopKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Shopping & Finance';
    }

    const designDomains = ['dribbble.com', 'behance.net', 'unsplash.com', 'pexels.com', 'fontawesome.com', 'icons8.com', 'coolors.co', 'svgrepo.com', 'flaticon.com', 'freepik.com', 'fonts.google.com', 'colorhunt.co', 'typewolf.com', 'mobbin.com', 'awwwards.com'];
    const designKeywords = ['design', 'ui', 'ux', 'vector', 'palette', 'typography', 'font', 'icon', 'illustration', 'mockup', 'artwork', 'graphic'];
    if (designDomains.some(d => hostname.includes(d)) || designKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
      return 'Design & Creative';
    }

    return 'General';
  }
})();
