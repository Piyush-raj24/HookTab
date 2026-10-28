/**
 * HookTab - Background Service Worker
 * Handles Keyboard Shortcuts (Alt+H Quick Hook),
 * Cross-Device Browser Sync via Native Bookmarks, and Badge Notifications
 */

'use strict';

// =========================================================================
// SERVICE WORKER LIFECYCLE MANAGEMENT
// Ensures the service worker activates instantly and claims clients
// =========================================================================
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Extension Lifecycle & Default State Initialization
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['bookmarks', 'theme', 'wallpaper'], (data) => {
      const defaults = {};
      if (!data.bookmarks) defaults.bookmarks = [];
      if (!data.theme) defaults.theme = 'midnight';
      if (!data.wallpaper) defaults.wallpaper = 'aurora';
      if (Object.keys(defaults).length > 0) {
        chrome.storage.local.set(defaults);
      }
    });
  });
}

// Runtime message listener for health checks & cross-component communication
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && (message.type === 'PING' || message.action === 'ping')) {
      sendResponse({ status: 'PONG', active: true, timestamp: Date.now() });
      return true;
    }
  });
}

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
      const category = 'General';
      const newBm = {
        id: 'quick-' + Date.now(),
        title: tab.title || domain,
        url: tab.url,
        page: data.activePage || 'Personal',
        category: category,
        tags: 'quick-save',
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
      const newBm = {
        id: 'cloud-' + id,
        nativeId: id,
        title: bookmark.title || domain,
        url: bookmark.url,
        page: data.activePage || 'Personal',
        category: 'General',
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
// TOPIC & CATEGORY CLASSIFIER (DISABLED - DEFAULTS TO GENERAL)
// =========================================================================
function detectCategory(rawUrl, rawTitle) {
  return 'General';
}
