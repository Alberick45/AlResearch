# Research Knowledge Vault — Technical Documentation

> **Version:** 0.1.0  
> **Last Updated:** June 2026  
> **Stack:** React 18 · Vite 5 · Vanilla CSS · Lucide React · Vite-PWA · Electron · Capacitor

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [How to Run the App](#4-how-to-run-the-app)
5. [File Reference — index.html](#5-file-reference--indexhtml)
6. [File Reference — src/main.jsx](#6-file-reference--srcmainjsx)
7. [File Reference — src/App.css](#7-file-reference--srcappcss)
8. [File Reference — src/App.jsx](#8-file-reference--srcappjsx)
9. [File Reference — main.cjs (Electron)](#9-file-reference--maincjs-electron)
10. [File Reference — vite.config.js](#10-file-reference--viteconfigjs)
11. [File Reference — capacitor.config.json](#11-file-reference--capacitorconfigjson)
12. [File Reference — package.json](#12-file-reference--packagejson)
13. [Data Model](#13-data-model)
14. [Storage Strategy](#14-storage-strategy)
15. [Core System Functions](#15-core-system-functions)
16. [Guide: Making Future Changes](#16-guide-making-future-changes)

---

## 1. Project Overview

Research Knowledge Vault (RKV) is an **offline-first personal research management system** that runs entirely in the browser. No server, no database, no backend required. Everything is stored locally using the browser's `localStorage` (for topic metadata and text) and `IndexedDB` (for binary files: images, videos, PDFs, audio recordings, and chat logs).

The app is built as a **single-page application (SPA)** using React and can be deployed as:

| Target | How |
|--------|-----|
| Web browser (localhost) | `npm run dev` |
| Installable PWA | `npm run build` then serve or install from browser |
| Windows/macOS Desktop | `npm run start` (Electron) |
| Android App | `npm run dist:mobile:sync` then Android Studio (Capacitor) |

---

## 2. Technology Stack

### 2.1 React 18

**What it is:** A JavaScript UI library for building component-based interfaces.

**How it's used here:**  
All UI is built inside one large React function component `App()` in `src/App.jsx`. React manages state with `useState`, side effects with `useEffect`, and DOM refs with `useRef`. No Redux, no context API — all state is local to the single `App` component.

**Key React patterns used:**

```jsx
// State declaration
const [topics, setTopics] = useState([]);

// Side-effect (save to localStorage whenever topics change)
useEffect(() => {
  localStorage.setItem(`rkv_vault_${currentUser}`, JSON.stringify(topics));
}, [topics, currentUser]);

// Ref for imperative audio recording
const mediaRecorderRef = useRef(null);
```

---

### 2.2 Vite 5

**What it is:** A next-generation frontend build tool and dev server.

**How it's used here:**  
- Dev server runs at `http://localhost:5173` with hot module replacement (HMR)
- Builds the production bundle into `dist/`
- Hosts the PWA plugin that auto-generates the service worker

**Key Vite features active:**

| Feature | Purpose |
|---------|---------|
| `@vitejs/plugin-react` | Enables JSX transformation and fast refresh |
| `vite-plugin-pwa` | Auto-generates service worker and web app manifest |
| `registerType: 'autoUpdate'` | Service worker auto-updates without user prompt |

---

### 2.3 Lucide React

**What it is:** An open-source icon library with clean, consistent SVG icons.

**How it's used here:**  
All icons in the UI are Lucide components imported directly from `lucide-react`. They render as inline SVGs and accept `size` and `style` props.

```jsx
import { Mic, Users, Search, Trash2 } from "lucide-react";

// Usage
<Mic size={16} style={{ color: "var(--accent-brass)" }} />
```

**Currently imported icons (App.jsx line 2–8):**
`Search, Plus, X, Link2, Youtube, FileText, Image, BookMarked, FlaskConical, MessageCircle, CheckCircle2, Circle, Lock, Globe2, Sparkles, ChevronRight, Star, Moon, Sun, HelpCircle, Settings, Bell, Edit3, Trash2, Shield, Eye, Database, FileUp, FileDown, Info, Unlock, UserPlus, LogOut, Key, User, BookOpen, Clock, Video, Mic, Users`

---

### 2.4 Vite PWA Plugin

**What it is:** A Vite plugin that generates a service worker using Workbox to cache app assets and make the app work offline.

**How it's used here:**  
Configured in `vite.config.js`. When you run `npm run build`, Vite generates:
- `dist/sw.js` — the service worker
- `dist/manifest.webmanifest` — the PWA manifest (name, icons, theme color)

The service worker caches all static assets (HTML, CSS, JS) so the app loads offline. Registered in `src/main.jsx` using `registerSW()` from `virtual:pwa-register`.

---

### 2.5 Electron 42

**What it is:** A framework for building cross-platform desktop apps using web technologies.

**How it's used here:**  
`main.cjs` is the Electron main process. It creates a `BrowserWindow` and loads `dist/index.html`. Running `npm run start` launches the desktop window.

**Build pipeline for desktop:**
```
npm run build        → builds dist/
electron-builder     → packages dist/ + main.cjs → dist-desktop/
```

---

### 2.6 Capacitor

**What it is:** A cross-platform runtime bridge that wraps web apps as native Android/iOS apps.

**How it's used here:**  
`capacitor.config.json` points to `dist/` as the web directory. After `npm run build` and `cap sync`, Android Studio can open the generated native project and deploy to a device.

---

### 2.7 Google Fonts

Three type families are loaded in `index.html`:

| Family | Usage |
|--------|-------|
| **Fraunces** (serif) | Headers, topic names, titles |
| **IBM Plex Sans** (sans) | All body text, labels, forms |
| **IBM Plex Mono** (mono) | Code, timestamps, storage meters, chat logs |

---

### 2.8 Browser APIs Used

| API | Purpose |
|-----|---------|
| `localStorage` | Topics, notes, discoveries, user profiles, theme, settings |
| `IndexedDB` | Binary file blobs: images, videos, PDFs, audio, chat text |
| `MediaRecorder` | Voice recording in Quick Capture |
| `navigator.storage.estimate()` | Storage quota display in Settings |
| `FileReader` | Reading local files into base64/data URLs |
| `URL.createObjectURL` | Creating download links for export |
| `navigator.mediaDevices.getUserMedia` | Microphone access for audio recording |

---

## 3. Project Structure

```
research/
├── index.html              # HTML shell, font imports, root div
├── main.cjs                # Electron main process
├── vite.config.js          # Vite + PWA configuration
├── capacitor.config.json   # Capacitor Android/iOS config
├── package.json            # Dependencies and npm scripts
├── .gitignore              # Excludes node_modules, dist, dev-dist
├── prd.md                  # Product Requirements Document
├── image.png               # App concept screenshot
│
├── public/                 # Static assets (served as-is)
│   └── icon.svg            # App icon for PWA manifest
│
└── src/
    ├── main.jsx            # React entry point, PWA registration
    ├── App.jsx             # All application logic and UI (~3900 lines)
    └── App.css             # Complete design system (~2266 lines)
```

---

## 4. How to Run the App

### 4.1 Prerequisites

- Node.js v18+ installed
- `npm` (comes with Node.js)

### 4.2 Install dependencies

```bash
cd d:\developement\research
npm install
```

### 4.3 Development mode (browser)

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload. Changes to `App.jsx` or `App.css` refresh instantly.

### 4.4 Production build (web/PWA)

```bash
npm run build
npm run preview    # preview the built app locally
```

The `dist/` folder can be served by any static web host (Netlify, Vercel, GitHub Pages).

### 4.5 Desktop app (Electron)

```bash
npm run build           # must build first
npm run start           # launches Electron window

# OR build a portable .exe
npm run dist:desktop
# Output: dist-desktop/Research Knowledge Vault.exe
```

### 4.6 Android app (Capacitor)

```bash
npm run build                   # build web first
npx cap sync                    # sync to Android project
npx cap open android            # open in Android Studio
# Then: Run on emulator or device from Android Studio
```

### 4.7 Available npm scripts summary

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run start` | Run Electron desktop app (requires `npm run build` first) |
| `npm run dist:desktop` | Build + package as .exe installer |
| `npm run dist:mobile:init` | Initialize Capacitor Android project (first time only) |
| `npm run dist:mobile:sync` | Build + sync to Capacitor Android project |

---

## 5. File Reference — `index.html`

**Role:** The HTML shell that Vite serves.

**Key parts:**

```html
<!-- Font preloading for zero-FOUT -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces...IBM+Plex+Mono..." rel="stylesheet">

<!-- React mounts here -->
<div id="root"></div>

<!-- Vite entry point (type=module for ES modules) -->
<script type="module" src="/src/main.jsx"></script>
```

**Do not add JavaScript here.** All logic goes in `src/`.

---

## 6. File Reference — `src/main.jsx`

**Role:** React DOM bootstrapper and PWA service worker registration.

```jsx
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import { registerSW } from 'virtual:pwa-register';

// Register Workbox service worker
registerSW({
  immediate: true,
  onNeedRefresh() { window.location.reload(); },
  onOfflineReady() { console.log('Offline ready!'); }
});

// Mount React app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

**`virtual:pwa-register`** is a virtual module provided by `vite-plugin-pwa` at build time — it does not exist as a real file.

---

## 7. File Reference — `src/App.css`

**Role:** The entire design system — CSS variables, layout, component styles, animations, and theme switching.

**Structure overview:**

| Lines | Section |
|-------|---------|
| 1–49 | `:root` CSS variables (dark theme) |
| 50–100 | Global reset, body, scrollbar styles |
| 101–200 | Typography utilities (`.serif`, `.mono`) |
| 200–400 | Layout grid (`.app-shell`, `.sidebar`, `.main-content`) |
| 400–600 | Topbar, search bar, capture button |
| 600–900 | Sidebar topic list, active states, secondary panel |
| 900–1100 | Resource cards, status pills |
| 1100–1400 | Notes, discoveries, timeline cards |
| 1400–1600 | Modals, drawers, overlays |
| 1600–1900 | Forms: inputs, selects, textareas, labels |
| 1900–2100 | Landing page (auth screen) |
| 2100–2266 | Search dropdown, scrollbar utilities |

### CSS Variables (Design Tokens)

```css
:root {
  --bg-app: #080B10;        /* Deepest background */
  --bg-sidebar: #0E121A;    /* Sidebar background */
  --bg-panel: #121824;      /* Panel/card background */
  --bg-card: #151C2A;       /* Elevated card */

  --accent-verdigris: #5E8577;  /* Teal-green — primary accent */
  --accent-brass: #C9974D;      /* Warm amber — highlights, CTAs */
  --accent-garnet: #A6533D;     /* Deep red-orange — danger, alerts */
  --accent-indigo: #5A6B8C;     /* Muted blue — secondary info */
  --accent-sage: #8C9B6E;       /* Warm green — tags */
  --accent-clay: #B5764A;       /* Earthy brown — neutral warm */

  --font-serif: 'Fraunces', serif;
  --font-sans: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

### Light Theme Override

```css
[data-theme="light"] {
  --bg-app: #F8F9FA;
  --bg-sidebar: #EAECEF;
  /* ... all tokens overridden for light mode */
}
```

The theme is toggled by setting `data-theme` on `<html>` via JavaScript:
```js
document.documentElement.setAttribute("data-theme", theme);
```

---

## 8. File Reference — `src/App.jsx`

This is the heart of the application — approximately **3,900 lines** containing all logic and UI in a single React component export.

### 8.1 Top-level Globals (Lines 1–425)

These run once when the module is loaded, outside any component:

| Symbol | Type | Purpose |
|--------|------|---------|
| `TABS` | `string[]` | The 6 workspace tabs for each topic |
| `ACCENTS` | `object` | Color name → hex map for topic accent picker |
| `STATUS_ORDER` | `string[]` | Cycle order for resource status pills |
| `TYPE_ICON` | `object` | Resource type → Lucide icon component |
| `fmtDate(iso)` | function | Formats ISO date string to `"Jun 15, 2026"` |
| `parseChatLog(text)` | function | Parses WhatsApp/AI chat text into message objects |
| `renderMessageText(text)` | function | Converts text with URLs into clickable `<a>` tags |
| `nextId(prefix)` | function | Generates unique IDs like `"r_1718000000000_abc123"` |
| `sanitizeAndMigrateTopics(raw)` | function | Deduplicates topic IDs on import |
| `openDB()` | function | Opens the `rkv_attachments_db` IndexedDB database |
| `attachmentDb` | object | CRUD helpers for IndexedDB: `get`, `set`, `delete`, `getAllEntries`, `setMany` |
| `cleanAttachmentIfDb(url)` | function | Deletes a blob from IndexedDB when a resource is deleted |
| `OfflineAttachmentPreview` | React component | Renders `db://` or `data:` URLs as images/videos/audio/chat timelines |

---

### 8.2 `parseChatLog(rawText)` — How it Works

Supports three chat formats using three regex patterns:

```
Pattern 1 (WhatsApp bracket):   [23:07, 6/12/2026] Alby: message
Pattern 2 (dash-separated):     23:07 - Alby: message
Pattern 3 (simple colon):       Alby: message
```

Multi-line messages are appended to `currentMsg.text`. Returns an array of `{ timestamp, sender, text }` objects.

---

### 8.3 `attachmentDb` — IndexedDB Helper

Database name: `rkv_attachments_db`  
Object store: `attachments`  
Key format: `attachment_r_1718000000000_abc123` (prefixed with `attachment_` + resource ID)

| Method | Description |
|--------|-------------|
| `get(key)` | Retrieve a base64 data URL by key |
| `set(key, val)` | Store a base64 data URL |
| `delete(key)` | Remove an attachment |
| `getAllEntries()` | Dump the entire store as `{ key: value }` for export |
| `setMany(obj)` | Bulk-restore entries on import |

---

### 8.4 `OfflineAttachmentPreview` Component (Lines 267–430)

**Props:** `{ url, title, type }`

**Rendering logic:**

```
url starts with "data:" → use directly
url starts with "db://"  → load from IndexedDB asynchronously

type === "Audio"         → render <audio> player with Mic icon header
type === "Discussion"    → decode text, run parseChatLog(), render bubble timeline
data:image/             → render <img>
data:video/             → render <video>
data:application/pdf    → render Download button
other                    → render generic Download button
```

---

### 8.5 App Component State (Lines 428–600)

The `App()` function declares all state at the top. Key state groups:

| State variable | Type | Purpose |
|----------------|------|---------|
| `currentUser` | string\|null | Active logged-in username |
| `topics` | Topic[] | All research topics for current user |
| `unsortedResources` | Resource[] | Resources not assigned to a topic |
| `activeView` | string | Current view: topic ID / "unsorted" / "all-topics" / "recently-viewed" |
| `activeTopicId` | string\|null | ID of the currently open topic |
| `activeTab` | string | Which tab is open: Overview / Resources / Notes / Discoveries / Sources / Timeline |
| `captureOpen` | boolean | Whether the Quick Capture drawer is open |
| `captureMode` | "discovery"\|"resource" | What Quick Capture is capturing |
| `captureResType` | string | Resource type selected in Quick Capture |
| `captureResTranscript` | string | Raw pasted chat text for Discussion type |
| `isRecording` | boolean | Whether voice recording is active |
| `recordDuration` | number | Seconds elapsed since recording started |
| `theme` | "dark"\|"light" | Current color theme |
| `storageInfo` | object\|null | Result of `navigator.storage.estimate()` |

---

### 8.6 Core Handler Functions

| Function | Lines | What it does |
|----------|-------|-------------|
| `saveVault()` | ~530 | Persists topics + unsorted to localStorage |
| `loadVault()` | ~540 | Loads vault from localStorage for current user |
| `exportData()` | ~812 | Async: dumps all topics + IndexedDB attachments to JSON file |
| `importData()` | ~842 | Restores topics + re-populates IndexedDB attachments from JSON |
| `addTopic()` | ~940 | Creates a new research topic object |
| `deleteTopic()` | ~960 | Removes a topic and all its resources/notes/discoveries |
| `addResourceDirect()` | ~1012 | Creates a new resource inside the active topic or unsorted |
| `cycleStatus()` | ~1068 | Advances a resource status: Unread → Reading → Finished → Valuable → Archived |
| `deleteResource()` | ~1107 | Removes a resource and cleans up its IndexedDB blob |
| `saveResourceEdit()` | ~1200 | Updates resource metadata including moving to a different topic |
| `quickCaptureSave()` | ~1448 | Universal capture: handles both discovery and resource types |
| `createNote()` | ~1346 | Adds a note to the active topic |
| `convertNoteToDiscovery()` | ~1410 | Converts a note object into a discovery |
| `createDiscovery()` | ~1373 | Adds a discovery directly to the active topic |
| `deleteDiscovery()` | ~1446 | Removes a discovery from the active topic |
| `startAudioRecording()` | ~435 | Requests mic, starts MediaRecorder, writes chunks |
| `stopAudioRecording()` | ~495 | Stops MediaRecorder, encodes audio to base64 |
| `refreshStorageInfo()` | ~1033 | Calls `navigator.storage.estimate()` + measures localStorage size |
| `handleCaptureFileChange()` | ~640 | Reads a chosen file into base64 and sets captureResUrl |
| `handleSearch()` | ~700 | Searches across all topics, resources, notes, and discoveries |

---

### 8.7 Render Layout Structure

The JSX return value renders in layers:

```
<div class="app-shell">
  ├── Landing Page (if not logged in)
  │
  ├── Sidebar (left panel)
  │   ├── User profile section
  │   ├── Topic list (scrollable)
  │   └── Unsorted inbox link
  │
  ├── Secondary Panel (middle panel)
  │   ├── "All Topics" grid view
  │   ├── Topic workspace (Overview / Resources / Notes / Discoveries / Sources / Timeline)
  │   ├── Unsorted inbox list
  │   └── Recently Viewed list
  │
  └── About Panel (right panel, collapsible)
      └── Topic description, accent picker, metadata
```

**Overlays (rendered outside the main layout):**
- Quick Capture Drawer
- Settings Modal
- Help Modal
- Edit Resource Modal
- Edit Source Modal
- Edit Note Modal
- Edit Discovery Modal
- Confirm Dialog
- Alert Dialog
- Toast notification

---

## 9. File Reference — `main.cjs` (Electron)

**Role:** The Node.js main process for Electron. This file runs outside the browser, in a Node context.

```js
const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800,
    title: "Research Knowledge Vault",
    webPreferences: {
      nodeIntegration: false,   // security: keep Node out of renderer
      contextIsolation: true,   // security: isolate browser context
    },
    autoHideMenuBar: true,
  });

  win.loadFile("dist/index.html");  // loads the built React app
}
```

> **Important:** You must run `npm run build` before `npm run start`. Electron loads `dist/index.html`, not the dev server.

---

## 10. File Reference — `vite.config.js`

```js
export default defineConfig({
  plugins: [
    react(),                     // JSX + fast refresh
    VitePWA({
      registerType: 'autoUpdate',  // auto-update service worker silently
      manifest: {
        name: 'Research Knowledge Vault',
        theme_color: '#080B10',
        display: 'standalone',     // full-screen when installed
        icons: [{ src: 'icon.svg', sizes: '192x192 512x512' }]
      },
      devOptions: { enabled: true }  // PWA active in dev server too
    })
  ]
});
```

---

## 11. File Reference — `capacitor.config.json`

```json
{
  "appId": "com.researchvault.app",
  "appName": "Research Vault",
  "webDir": "dist",              // points to Vite build output
  "bundledWebRuntime": false
}
```

---

## 12. File Reference — `package.json`

**Key scripts:**

```json
"dev": "vite"                          // dev server
"build": "vite build"                  // production build
"start": "electron ."                  // Electron (needs build first)
"dist:desktop": "npm run build && electron-builder"  // package .exe
"dist:mobile:sync": "npm run build && cap sync"     // Android sync
```

**Runtime dependencies:**
- `react` + `react-dom` — UI framework
- `lucide-react` — Icons
- `@capacitor/core` — Mobile bridge runtime

**Dev dependencies:**
- `vite` — Build tool
- `@vitejs/plugin-react` — JSX support
- `vite-plugin-pwa` — Service worker generation
- `electron` — Desktop app runtime
- `electron-builder` — Desktop packaging
- `@capacitor/cli` + `@capacitor/android` — Mobile tooling

---

## 13. Data Model

### Topic Object

```js
{
  id: "topic_1718000000000_abc123",
  name: "Webots Robotics",
  tagline: "Simulation and controller work",
  accent: "verdigris",          // one of ACCENTS keys
  visibility: "Private",        // "Private" | "Public"
  resources: Resource[],
  notes: Note[],
  discoveries: Discovery[],
  sources: Source[],
  timeline: TimelineEvent[],
}
```

### Resource Object

```js
{
  id: "r_1718000000000_abc123",
  title: "Webots Documentation",
  type: "Website",              // key of TYPE_ICON
  status: "Unread",             // one of STATUS_ORDER
  date: "2026-06-15",
  url: "https://cyberbotics.com",  // OR "db://attachment_r_..."
  sourceId: "s_1718000000001_xyz", // optional linked source
}
```

### Note Object

```js
{
  id: "n_1718000000000_abc123",
  text: "The controller must be assigned manually in Webots.",
  date: "2026-06-15",
}
```

### Discovery Object

```js
{
  id: "d_1718000000000_abc123",
  title: "Controller Assignment Required",
  statement: "Controllers must be assigned before code runs.",
  verification: "Unverified",    // "Unverified" | "Verified" | "Disproven"
  visibility: "Private",
  relatedResources: ["r_..."],
  relatedNotes: ["n_..."],
  date: "2026-06-15",
}
```

### Source Object

```js
{
  id: "s_1718000000000_abc123",
  type: "Website",       // "Website" | "Book" | "Video" | "Article"
  title: "Webots Docs",
  author: "Cyberbotics",
  url: "https://cyberbotics.com",
  date: "2026",
  // For books:
  publisher: "...",
  isbn: "...",
  pages: "123–140",
}
```

### localStorage Key Naming

| Key | Value |
|-----|-------|
| `rkv_active_user` | Currently logged-in username |
| `rkv_profiles` | JSON object mapping username → `{ password }` |
| `rkv_vault_<username>` | JSON array of all topics |
| `rkv_unsorted_<username>` | JSON array of unsorted resources |
| `rkv_recents_<username>` | JSON array of recently viewed items |
| `rkv_theme` | `"dark"` or `"light"` |
| `rkv_nc_url` | Nextcloud WebDAV URL |
| `rkv_nc_user` | Nextcloud username |
| `rkv_nc_pass` | Nextcloud password |
| `rkv_nc_path` | Nextcloud backup file path |
| `rkv_nc_last_sync` | Timestamp of last sync |

---

## 14. Storage Strategy

### Why Two Stores?

`localStorage` has a ~5MB per-origin limit. Binary files (images, videos, audio) encoded as base64 are much larger. Saving them in `localStorage` causes `QuotaExceededError` crashes.

**Solution:** Store all binary data in **IndexedDB** (which has gigabytes of capacity), and store only a reference key in the resource/source object.

### URL Conventions

| URL format | Meaning |
|------------|---------|
| `https://...` | External web link — open in browser |
| `data:image/png;base64,...` | Inline base64 (small images only, legacy) |
| `db://attachment_r_xxx` | Stored in IndexedDB under key `attachment_r_xxx` |

### Save Flow for a File Upload

```
User selects file
  → FileReader.readAsDataURL(file)
    → base64 data URL generated
      → attachmentDb.set("attachment_r_xxx", base64)
        → resource.url = "db://attachment_r_xxx"
          → topics saved to localStorage (only the key string, not the blob)
```

### Export/Import with Attachments

**Export:** `attachmentDb.getAllEntries()` dumps every stored blob into the JSON under `_attachments: { key: base64 }`.

**Import:** `attachmentDb.setMany(parsed._attachments)` restores all blobs to IndexedDB before state is updated, so previews work immediately.

---

## 15. Core System Functions

### ID Generation

```js
const nextId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

// Examples:
// "topic_1718432000000_k8x9mz1ab"
// "r_1718432001234_xyz456def"
```

Prefixes used: `topic`, `r` (resource), `n` (note), `d` (discovery), `s` (source)

### Status Cycling

```js
const STATUS_ORDER = ["Unread", "Reading", "Finished", "Valuable", "Archived"];

// In cycleStatus():
const idx = STATUS_ORDER.indexOf(r.status);
const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
```

Clicking a resource's status pill advances it one step, wrapping around.

### Topic Accent

Each topic stores an `accent` key (e.g. `"verdigris"`). The accent is resolved to a hex color:
```js
const accentHex = ACCENTS[activeTopic.accent] || ACCENTS.verdigris;
```

This color is then applied inline to buttons, borders, and timeline dots within that topic's workspace.

---

## 16. Guide: Making Future Changes

### Add a new Resource Type

1. Import the desired Lucide icon at the top of `App.jsx`.
2. Add an entry to `TYPE_ICON`:
   ```js
   const TYPE_ICON = {
     ...
     "Podcast": Headphones,   // ← new type
   };
   ```
3. The type will automatically appear in all resource type dropdowns (they use `Object.keys(TYPE_ICON)`).
4. If the type needs special rendering (like Discussion/Audio), add a branch in `OfflineAttachmentPreview`.

### Add a new Tab to the topic workspace

1. Add the tab name to `TABS` array at line 14.
2. In the JSX render section, add a new `{activeTab === "YourTab" && (...)}` block inside the workspace.
3. The tab buttons are rendered automatically from `TABS`.

### Add a new field to a Topic/Resource/Discovery

1. Update the object creation in the relevant handler function (`addTopic`, `addResourceDirect`, etc.).
2. Update the Edit modal JSX to include an input for the field.
3. Update the `saveResourceEdit`/`saveTopicEdit` handler to write the new field.
4. Update any rendering cards that should display it.

### Add a new global setting

1. Add a `useState` for the setting near the other settings states (around line 560).
2. Persist it with a `useEffect` that writes to `localStorage`.
3. Load it in the state initializer: `useState(() => localStorage.getItem("rkv_my_setting") || defaultValue)`.
4. Add a UI control in the Settings modal (around line 3300).

### Modify the color theme

All colors are CSS variables in `src/App.css`. Change values in `:root` for dark mode and `[data-theme="light"]` for light mode. No JavaScript changes needed.

### Add a sync provider (besides Nextcloud)

1. Add new state variables for the provider's credentials near the existing Nextcloud state.
2. Write `sync<Provider>Push` and `sync<Provider>Pull` async functions following the Nextcloud pattern.
3. Add UI in the Settings modal.
4. The sync functions should call `JSON.stringify({ topics, unsortedResources, recentlyViewed, _attachments })` to get a full export blob, then send it to the provider's API.
