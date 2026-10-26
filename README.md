# 🪝 HookTab - Visual Bookmarks & Dashboard for Chromium & Brave

> **Hook your favorite web apps, bookmarks, and boards into an ultra-fast, local-first new tab dashboard.**  
> Built for Chromium browsers (Brave, Chrome, Edge, Arc, Opera) with **100% privacy, zero servers, and $0 cost**.

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-6366f1.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Local-First](https://img.shields.io/badge/Architecture-Local--First-10b981.svg)](#architecture)
[![Zero Backend](https://img.shields.io/badge/Backend-$0%20Zero%20Servers-22c55e.svg)](#architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features at a Glance

* **🗂️ Visual Boards (Drag-and-Drop)**: Organize bookmarks into dynamic, draggable grid boards. Drag and reorder cards with smooth magnetic feedback and automatic layout persistence.
* **📑 Multiple Pages (Work, Personal, Projects)**: Create dedicated workspaces for *Work*, *Personal*, *Projects*, or custom clients. Switch between them instantly with single-click page pills.
* **⚡ 1-Stroke Quick Hook (`Alt+H`)**: Hook any webpage into your dashboard instantly without opening a dialog or triggering browser shortcut collisions. Confirmation badge flashes on the extension icon.
* **🧠 Smart Auto-Categorization**: 100% client-side topic engine that automatically classifies bookmarks into *AI & LLMs*, *Dev & Code*, *Productivity*, *Social & Chat*, *Media & Video*, *News & Reading*, *Shopping & Finance*, and *Design*.
* **🌐 Universal Netscape HTML & JSON Export**: 1-click export to standard Netscape Bookmark `.html` format compatible with Chrome, Brave, Firefox, Edge, and Safari bookmark managers, alongside raw `.json` backup.
* **🌈 Custom Accent Gradients**: Pick two colors in the Customizer Studio to generate your personalized dynamic gradient for the brand badge, active page pills, active tabs, and interactive card indicators.
* **⛅ Privacy-Friendly Mini Weather Widget**: Zero-API-key, zero-tracking weather snippet next to the clock display powered by Open-Meteo and GeoJS IP lookup. Click to toggle between °C and °F.
* **👁️ Privacy Mode (`Alt+P`)**: 1-click screen-sharing shield that blurs all bookmark titles, domains, favicons, and scratchpad notes with instant hover-to-peek.
* **📥 1-Click Native Browser Import**: Ingest existing Chrome / Brave bookmarks and folders in seconds via `chrome.bookmarks.getTree()` without third-party services.
* **🔍 Multi-Engine Search Bar**: Centered search bar supporting Google, Brave Search, DuckDuckGo, Bing, YouTube, GitHub, plus custom user-added search engines. Press `/` to focus.
* **🎨 Theme & Wallpaper Studio**: 7 curated glassmorphism themes, dual accent color gradient picker, high-definition wallpapers, custom photo uploads with live blur and darkness sliders.
* **📝 Quick Scratchpad**: Built-in notepad widget for jotting down temporary thoughts and URLs, auto-saved locally.
* **💬 Built-in Bug & Feedback Reporter**: Integrated diagnostics collector allowing users to submit issues and ideas with 1 click.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| **`Alt + H`** *(Option+H on Mac)* | **Quick Hook / Save** active webpage directly to bookmarks with instant badge |
| **`Alt + Shift + H`** | Open HookTab Quick Popup menu |
| **`Alt + P`** | **Toggle Privacy Mode** (Blur / Unblur for screen sharing) |
| **`/`** | Focus Search bar instantly from anywhere on the new tab |
| **`Esc`** | Close open modals, drawers, scratchpad, or engine popover |

> 💡 **Customizing Shortcuts:** Because different browsers reserve different keys (e.g., Brave reserves `Ctrl+B` for Reading List, Chrome reserves `Ctrl+Shift+B` for Bookmarks Bar), you can customize HookTab's shortcuts to any combination anytime by going to **`brave://extensions/shortcuts`** or **`chrome://extensions/shortcuts`**.

---

## 🚀 100% Free Public Release Guide (GitHub Releases)

You **do not need to pay the $5 Google Chrome Web Store developer fee** to make HookTab public and freely installable by anyone worldwide! 

### How Users Install from GitHub Releases:
1. Go to your repo's **Releases** page (e.g. `https://github.com/Piyush-raj24/-HookTab/releases`).
2. Download the attached **`HookTab-v1.0.0.zip`**.
3. Extract/unzip the file on your computer.
4. In Brave or Chrome, navigate to `brave://extensions` (or `chrome://extensions`).
5. Turn on **Developer mode** (top right switch).
6. Click **Load unpacked** (top left) and choose the extracted folder.
7. Open a new tab and enjoy HookTab!

### Packaging a New Release:
Run the built-in packaging script (uses native Windows PowerShell, zero extra npm modules required):
```bash
node package_release.js
```
This produces `dist/HookTab-v1.0.0.zip` ready to be attached to your GitHub Release tag!

---

## 🏗️ Architecture & Privacy
- **100% Client-Side**: Operates entirely inside the browser using `chrome.storage.local` and `chrome.bookmarks`.
- **Zero External Trackers**: No analytics, telemetry, or remote code execution.
- **Infinite Scalability**: Since zero servers are required, performance remains instantaneous (0ms network latency).

---

## 🤝 Contributing & Bug Reports
Found a bug or have a suggestion?
- Click the **"Report a Bug / Give Feedback"** button inside the extension's Settings Drawer.
- Or open an issue directly on the [GitHub Issue Tracker](https://github.com/Piyush-raj24/-HookTab/issues).

---

## 📄 License
MIT License. Free to use, fork, and distribute.
