/**
 * HookTab - Background Service Worker
 * Handles Keyboard Shortcuts (Alt+H Quick Hook),
 * Cross-Device Browser Sync via Native Bookmarks, and Badge Notifications
 */

'use strict';

// 1. Listen for global keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-save-bookmark') {
    handleQuickSave();
  }
});

async function handleQuickSave() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) return;

    const tab = tabs[0];
    if (!tab.url || !isSafeUrl(tab.url)) {
      flashBadge('ERR', '#ef4444', 1800);
      return;
    }

    // Get current bookmarks and active page
    chrome.storage.local.get(['bookmarks', 'activePage'], (data) => {
      let bookmarks = data.bookmarks || [];
      const normalizedUrl = tab.url.toLowerCase().replace(/\/$/, '');
      const existing = bookmarks.find(b => b.url.toLowerCase().replace(/\/$/, '') === normalizedUrl);

      if (existing) {
        flashBadge('SAVED', '#f59e0b', 2000);
        return;
      }

      const domain = getDomainFromUrl(tab.url);
      const category = detectCategory(tab.url, tab.title);
      const newBm = {
        id: 'quick-' + Date.now(),
        title: tab.title || domain,
        url: tab.url,
        page: data.activePage || 'Personal',
        category: category,
        tags: 'quick-save,auto-categorized',
        favorite: false,
        visits: 1
      };

      bookmarks.unshift(newBm);
      chrome.storage.local.set({ bookmarks: bookmarks }, () => {
        // Flash success badge
        flashBadge('✓', '#22c55e', 2500);

        // Also save to native browser bookmarks for automatic Brave/Chrome Cloud Sync
        syncToNativeBookmarks(newBm);
      });
    });
  } catch (err) {
    console.error('Error handling quick save shortcut:', err);
    flashBadge('ERR', '#ef4444', 1800);
  }
}

// Flash extension icon badge for visual feedback
function flashBadge(text, color, durationMs) {
  try {
    if (chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: text });
      chrome.action.setBadgeBackgroundColor({ color: color });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, durationMs);
    }
  } catch (e) {
    // ignore
  }
}

// Security: Strictly validate URL schemes
function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const lower = rawUrl.trim().toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
}

// Helper to extract readable domain
function getDomainFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return rawUrl;
  }
}

// Native Bookmarks Cloud Sync:
// Writes bookmark to native browser tree so Brave Sync / Chrome Sync automatically syncs it across all devices
function syncToNativeBookmarks(bm) {
  if (typeof chrome === 'undefined' || !chrome.bookmarks || !chrome.bookmarks.create) {
    return;
  }

  // Find or create "HookTab Bookmarks" folder in native bookmarks tree
  chrome.bookmarks.getTree((tree) => {
    let parentFolderId = '1'; // Default: Bookmarks bar / other bookmarks
    function findFolder(nodes) {
      for (const node of nodes) {
        if (!node.url && node.title && (node.title.toLowerCase().includes('hooktab') || node.title.toLowerCase().includes('nexustab'))) {
          parentFolderId = node.id;
          return true;
        }
        if (node.children && findFolder(node.children)) return true;
      }
      return false;
    }

    const found = findFolder(tree);
    if (!found) {
      // Create folder under default bookmarks bar
      chrome.bookmarks.create({
        parentId: '1',
        title: 'HookTab Bookmarks'
      }, (folder) => {
        chrome.bookmarks.create({
          parentId: folder ? folder.id : '1',
          title: bm.title,
          url: bm.url
        });
      });
    } else {
      chrome.bookmarks.create({
        parentId: parentFolderId,
        title: bm.title,
        url: bm.url
      });
    }
  });
}

// =========================================================================
// REAL-TIME NATIVE BROWSER BOOKMARKS OBSERVER
// Automatically synchronizes when user bookmarks a tab using the browser's
// star button, Ctrl+D, bookmark menu, or cross-device cloud sync
// =========================================================================
if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.onCreated) {
  chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    if (!bookmark.url || !isSafeUrl(bookmark.url)) {
      return;
    }

    chrome.storage.local.get(['bookmarks', 'activePage'], (data) => {
      let bookmarks = data.bookmarks || [];
      const normUrl = bookmark.url.toLowerCase().replace(/\/$/, '');
      if (bookmarks.some(b => b.url.toLowerCase().replace(/\/$/, '') === normUrl)) {
        return; // Already present
      }

      const domain = getDomainFromUrl(bookmark.url);
      const detectedCat = detectCategory(bookmark.url, bookmark.title);
      const newBm = {
        id: 'cloud-' + id,
        nativeId: id,
        title: bookmark.title || domain,
        url: bookmark.url,
        page: data.activePage || 'Personal',
        category: detectedCat,
        tags: 'browser-sync',
        favorite: false,
        visits: 0
      };

      bookmarks.unshift(newBm);
      chrome.storage.local.set({ bookmarks: bookmarks });
    });
  });

  chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    chrome.storage.local.get(['bookmarks'], (data) => {
      let bookmarks = data.bookmarks || [];
      const initialLength = bookmarks.length;
      bookmarks = bookmarks.filter(b => b.nativeId !== id && b.id !== ('cloud-' + id));
      if (bookmarks.length !== initialLength) {
        chrome.storage.local.set({ bookmarks: bookmarks });
      }
    });
  });

  chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
    chrome.storage.local.get(['bookmarks'], (data) => {
      let bookmarks = data.bookmarks || [];
      let modified = false;
      bookmarks.forEach(b => {
        if (b.nativeId === id || b.id === ('cloud-' + id) || (changeInfo.url && b.url === changeInfo.url)) {
          if (changeInfo.title) b.title = changeInfo.title;
          if (changeInfo.url) b.url = changeInfo.url;
          modified = true;
        }
      });
      if (modified) {
        chrome.storage.local.set({ bookmarks: bookmarks });
      }
    });
  });
}

// =========================================================================
// INTELLIGENT TOPIC & CATEGORY CLASSIFIER (100% Client-Side & $0 Cost)
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
  const aiDomains = [
    'openai.com', 'chatgpt.com', 'anthropic.com', 'claude.ai', 'huggingface.co', 
    'perplexity.ai', 'deepmind.google', 'midjourney.com', 'cursor.com', 'v0.dev',
    'poe.com', 'replicate.com', 'mistral.ai', 'groq.com', 'elevenlabs.io', 'runwayml.com',
    'stability.ai', 'cohere.com', 'ollama.com', 'claude.com'
  ];
  const aiKeywords = ['ai', 'llm', 'gpt', 'chatgpt', 'claude', 'gemini', 'prompt', 'neural', 'deep learning', 'machine learning', 'diffusion', 'copilot', 'agent'];
  if (aiDomains.some(d => hostname.includes(d)) || 
      aiKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title) || url.includes('/' + k))) {
    return 'AI & LLMs';
  }

  // 2. Dev & Code
  const devDomains = [
    'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'stackexchange.com',
    'npmjs.com', 'npmjs.org', 'pypi.org', 'developer.mozilla.org', 'w3schools.com', 
    'docker.com', 'vercel.com', 'netlify.com', 'aws.amazon.com', 'console.cloud.google.com',
    'firebase.google.com', 'react.dev', 'vuejs.org', 'angular.dev', 'nextjs.org', 
    'typescriptlang.org', 'python.org', 'rust-lang.org', 'golang.org', 'leetcode.com',
    'codepen.io', 'jsfiddle.net', 'codesandbox.io', 'replit.com', 'geeksforgeeks.org',
    'css-tricks.com', 'dev.to', 'gist.github.com'
  ];
  const devKeywords = ['github', 'api', 'repository', 'sdk', 'documentation', 'docs', 'compiler', 'debug', 'frontend', 'backend', 'fullstack', 'database', 'sql', 'json', 'webhook', 'cli'];
  if (devDomains.some(d => hostname.includes(d)) || 
      devKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title) || url.includes('/' + k))) {
    return 'Dev & Code';
  }

  // 3. Social & Chat
  const socialDomains = [
    'x.com', 'twitter.com', 'reddit.com', 'discord.com', 'telegram.org', 't.me',
    'slack.com', 'linkedin.com', 'instagram.com', 'threads.net', 'facebook.com',
    'whatsapp.com', 'tiktok.com', 'mastodon.social', 'bsky.app', 'pinterest.com',
    'snapchat.com', 'tumblr.com'
  ];
  const socialKeywords = ['social', 'community', 'forum', 'discussion', 'subreddit', 'tweet', 'feed'];
  if (socialDomains.some(d => hostname.includes(d)) || 
      socialKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
    return 'Social & Chat';
  }

  // 4. Productivity & Work
  const prodDomains = [
    'notion.so', 'figma.com', 'trello.com', 'linear.app', 'jira.atlassian.com',
    'atlassian.com', 'canva.com', 'docs.google.com', 'sheets.google.com', 'drive.google.com',
    'slides.google.com', 'miro.com', 'airtable.com', 'zoom.us', 'cal.com', 'calendly.com',
    'asana.com', 'loom.com', 'coda.io', 'clickup.com', 'monday.com', 'basecamp.com',
    'evernote.com', 'todoist.com', 'dropbox.com'
  ];
  const prodKeywords = ['workspace', 'task', 'project', 'kanban', 'spreadsheet', 'tracker', 'calendar', 'meeting', 'crm', 'workflow'];
  if (prodDomains.some(d => hostname.includes(d)) || 
      prodKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
    return 'Productivity';
  }

  // 5. Media & Video
  const mediaDomains = [
    'youtube.com', 'youtu.be', 'netflix.com', 'spotify.com', 'twitch.tv', 'vimeo.com',
    'primevideo.com', 'soundcloud.com', 'disneyplus.com', 'hulu.com', 'hbomax.com',
    'music.apple.com', 'podcasts.google.com', 'dailymotion.com', 'crunchyroll.com',
    'bandcamp.com', 'imdb.com'
  ];
  const mediaKeywords = ['watch', 'video', 'movie', 'film', 'music', 'album', 'podcast', 'stream', 'episode', 'series', 'track'];
  if (mediaDomains.some(d => hostname.includes(d)) || 
      mediaKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
    return 'Media & Video';
  }

  // 6. News & Reading
  const newsDomains = [
    'medium.com', 'substack.com', 'news.ycombinator.com', 'theverge.com', 'wired.com',
    'techcrunch.com', 'bloomberg.com', 'bbc.com', 'reuters.com', 'nytimes.com',
    'theguardian.com', 'arstechnica.com', 'engadget.com', 'mashable.com', 'forbes.com',
    'wsj.com', 'hackernews.com', 'slashdot.org'
  ];
  const newsKeywords = ['news', 'article', 'journal', 'headline', 'daily', 'editorial', 'newsletter', 'report', 'digest'];
  if (newsDomains.some(d => hostname.includes(d)) || 
      newsKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
    return 'News & Reading';
  }

  // 7. Shopping & Finance
  const shopDomains = [
    'amazon.com', 'ebay.com', 'walmart.com', 'aliexpress.com', 'etsy.com', 'target.com',
    'stripe.com', 'paypal.com', 'binance.com', 'coinbase.com', 'robinhood.com',
    'tradingview.com', 'investing.com', 'coingecko.com', 'coinmarketcap.com',
    'chase.com', 'bankofamerica.com', 'shopify.com'
  ];
  const shopKeywords = ['shop', 'store', 'cart', 'buy', 'checkout', 'price', 'deals', 'discount', 'crypto', 'bitcoin', 'ethereum', 'stock', 'forex', 'portfolio', 'finance', 'banking'];
  if (shopDomains.some(d => hostname.includes(d)) || 
      shopKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
    return 'Shopping & Finance';
  }

  // 8. Design & Creative
  const designDomains = [
    'dribbble.com', 'behance.net', 'unsplash.com', 'pexels.com', 'fontawesome.com',
    'icons8.com', 'coolors.co', 'svgrepo.com', 'flaticon.com', 'freepik.com',
    'fonts.google.com', 'colorhunt.co', 'typewolf.com', 'mobbin.com', 'awwwards.com'
  ];
  const designKeywords = ['design', 'ui', 'ux', 'vector', 'palette', 'typography', 'font', 'icon', 'illustration', 'mockup', 'artwork', 'graphic'];
  if (designDomains.some(d => hostname.includes(d)) || 
      designKeywords.some(k => new RegExp('\\b' + k + '\\b', 'i').test(title))) {
    return 'Design & Creative';
  }

  return 'General';
}
