# Research Knowledge Vault — Future Improvements Roadmap

> A living document for planned enhancements, categorized by priority and complexity.  
> Last updated: June 2026

---

## Table of Contents

1. [Critical Fixes](#1-critical-fixes)
2. [Short-Term Improvements (1–2 months)](#2-short-term-improvements-12-months)
3. [Medium-Term Features (3–6 months)](#3-medium-term-features-36-months)
4. [Long-Term Vision (6+ months)](#4-long-term-vision-6-months)
5. [Performance & Architecture](#5-performance--architecture)
6. [Platform Expansion](#6-platform-expansion)

---

## 1. Critical Fixes

These are issues that affect daily usage and should be addressed as soon as possible.

---

### 1.1 File Export Size Limit

**Problem:** The JSON export now includes IndexedDB binary blobs inline as base64. For large vaults (many videos/audios), the export file can become several hundred MB, making it slow to generate and difficult to email or transfer.

**Fix ideas:**
- Add a "Metadata only" export option (no blobs) for sharing topic structure
- Add a "Full export with files" option with a progress bar
- Split exports: one JSON for metadata, one `.zip` for binary files
- Compress the export with a streaming ZIP (using `fflate` or `JSZip`)

---

### 1.2 localStorage Quota Warnings

**Problem:** Large vaults can still cause `QuotaExceededError` on localStorage writes when many topics and large metadata accumulate.

**Fix ideas:**
- Move **all** vault metadata to IndexedDB (not just binary blobs) — use one IndexedDB store for topics and another for attachments
- Keep localStorage only for user preferences (theme, profile name, PIN)
- Add a pre-write size check and warn before writing

---

### 1.3 Topic Navigation Bug (Resolved but fragile)

**Problem:** Previously, clicking a sidebar topic would not update the workspace — the first-ever selected topic would stay visible. The fix worked but the state management around `activeTopicId` is complex.

**Better long-term fix:**
- Derive `activeTopic` directly as `topics.find(t => t.id === activeTopicId)` on every render — currently this is done but ensure no stale closures reference old topic objects
- Add React DevTools profiling to verify re-renders happen correctly on `activeTopicId` change

---

### 1.4 Voice Recording: No Error Handling for Mic Permission Denied

**Problem:** If the user denies microphone permission, `startAudioRecording()` silently fails.

**Fix:**
```js
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // ...
} catch (err) {
  if (err.name === "NotAllowedError") {
    setAlertDialog({ message: "Microphone access was denied. Please allow mic access in your browser settings." });
  }
}
```

---

### 1.5 Discussion Rendering: Duplicate Sender Detection

**Problem:** In `parseChatLog`, a sender's display side (left vs right bubble) is determined by whether they are the "first sender seen." If the same person appears as first sender in two different chats pasted together, the layout can be inconsistent.

**Fix:** Assign sides based on a consistent map: maintain a `senderColors` map per chat, and alternate sides for each unique sender.

---

## 2. Short-Term Improvements (1–2 months)

### 2.1 App-Level Code Splitting

**Problem:** `App.jsx` is ~3,900 lines — all UI and logic in one file. This makes it hard to navigate, hard to test, and increases cognitive load.

**Plan:**
- Extract `OfflineAttachmentPreview` → `src/components/OfflineAttachmentPreview.jsx`
- Extract `QuickCaptureDrawer` → `src/components/QuickCaptureDrawer.jsx`
- Extract all modal components → `src/modals/`
- Extract `attachmentDb` and `openDB` → `src/lib/attachmentDb.js`
- Extract `parseChatLog`, `renderMessageText`, `fmtDate`, `nextId` → `src/lib/utils.js`
- Keep `App.jsx` as the orchestrator (~800 lines) — only state and event wiring

---

### 2.2 In-App Topic Reordering

**Problem:** Topics in the sidebar can't be reordered — they appear in creation order.

**Plan:**
- Add drag-and-drop reordering using the HTML Drag and Drop API (no extra library needed)
- Store order as an explicit `order` field on each topic
- OR implement simple up/down arrow buttons in an edit mode

---

### 2.3 Resource Bulk Actions

**Problem:** You can only delete or edit one resource at a time.

**Plan:**
- Add a checkbox to each resource card in a "select mode" (toggle with a "Select" button)
- Bulk actions: Delete selected · Move selected to another topic · Mark all as Finished

---

### 2.4 Note Formatting Support

**Problem:** Notes are plain text — no markdown, no code blocks, no bullet formatting.

**Plan:**
- Detect markdown-like syntax on display:
  - `**text**` → bold
  - `` `code` `` → monospace highlighted span
  - `- item` → bullet list
  - `> quote` → blockquote
- Keep editing as raw text; only parse on display

---

### 2.5 Discovery Tagging

**Problem:** Discoveries have no tags or categories — finding related ones requires manual search.

**Plan:**
- Add a `tags: string[]` field to the Discovery data model
- Render tags as colored pill badges
- Add a tags filter in the Discoveries tab
- Global search should search within tags

---

### 2.6 Keyboard Shortcuts

**Currently working:**
- `Ctrl+K` — focus search
- `Ctrl+N` — open Quick Capture

**To add:**
- `Escape` — close any open modal/drawer
- `Ctrl+S` — save current edit (in all edit modals)
- `Ctrl+1` through `Ctrl+6` — switch tabs in current topic
- `Ctrl+Shift+T` — create new topic

---

### 2.7 Toast Queue

**Problem:** If multiple toasts are triggered rapidly (e.g. during import), only the last one appears — earlier ones are overwritten.

**Fix:**
- Change `toast` state from a single string to a queue (array)
- Render toasts stacked at the bottom-right
- Auto-dismiss each one after 3s with a slide-out animation

---

### 2.8 Pinned / Starred Discoveries

**Problem:** No way to mark a discovery as especially important without changing its verification status.

**Plan:**
- Add `starred: boolean` field to discovery objects
- Add a star toggle button on each discovery card
- Add a "Starred" filter in the Discoveries tab

---

## 3. Medium-Term Features (3–6 months)

### 3.1 AI-Assisted Tagging and Summarization

**What it is:** Use a local or cloud AI model to automatically:
- Suggest tags for a discovery
- Summarize a pasted article URL
- Identify and extract key points from a pasted chat log

**Implementation options:**

| Option | Cost | Privacy |
|--------|------|---------|
| OpenAI API (GPT-4o) | ~$0.01/request | Cloud (data leaves device) |
| Ollama (local LLM) | Free | Fully offline |
| Google Gemini API | Free tier available | Cloud |

**Integration point:** Add an "✨ Analyze" button in Quick Capture and the Discovery editor. Call the API in the background. Show a spinner while waiting. Apply suggestions with a one-click accept.

---

### 3.2 Knowledge Graph View

**What it is:** A visual graph of how topics, resources, and discoveries relate to each other.

**Why:** As the vault grows, linear lists become hard to navigate. A graph reveals unexpected connections.

**Implementation:**
- Use `d3.js` or `vis.js` for force-directed graph rendering
- Nodes: Topics (large), Resources (medium), Discoveries (small)
- Edges: Resource → Topic · Discovery → Resource (via `relatedResources`) · Discovery → Note (via `relatedNotes`)
- Clicking a node navigates to that item

---

### 3.3 Browser Extension

**What it is:** A Chrome/Firefox extension that adds a "Save to Research Vault" button on any web page, auto-filling the resource title, URL, and page description.

**Architecture:**
- Extension content script reads `document.title` and `window.location.href`
- Pops a small Quick Capture UI in a browser action popup
- Communicates with the main app via `postMessage` or a shared IndexedDB

---

### 3.4 PDF Viewer (In-App)

**Problem:** Currently PDFs stored offline show a "Download" button — there's no in-app reading.

**Plan:**
- Integrate `PDF.js` (Mozilla's open-source PDF renderer)
- Render the PDF inline in the resource card expanded view
- Allow highlighting text and converting it to a Note or Discovery

---

### 3.5 Advanced Search Filters

**Current search:** Full-text across all objects.

**Planned additions:**
- Filter by topic
- Filter by resource type
- Filter by date range
- Filter by status
- Search within a specific tab (Resources only, Discoveries only)

---

### 3.6 Nextcloud Conflict Resolution

**Problem:** If vault data changes on both devices before syncing, the Push/Pull overwrites one version.

**Plan:**
- Add a `_modifiedAt` timestamp to the vault payload
- On Pull: if local `_modifiedAt > remote _modifiedAt`, warn the user before overwriting
- Consider three-way merge for topics (add topics from both versions, flag conflicts)

---

### 3.7 Topics Folder/Category Groups

**Problem:** With many topics, the sidebar becomes a flat long list.

**Plan:**
- Add a `group: string` field to topics
- Let users create named groups (e.g. "Engineering", "Personal", "Theology")
- Collapse/expand groups in the sidebar like folders
- Topics without a group go into "Uncategorized"

---

### 3.8 Resource Import from URL (Auto-fill)

**Problem:** Users paste a URL manually. The app should auto-fetch the page title and favicon.

**Plan:**
- Add a "Fetch details" button next to the URL input
- Call a CORS-friendly scraping proxy (or a self-hosted worker) to get `<title>` and `<meta description>`
- Auto-fill the resource title and description fields

> **Privacy note:** This requires a network request. Make it opt-in and clearly show users that the URL is being sent to a proxy.

---

## 4. Long-Term Vision (6+ months)

### 4.1 Collaborative Research Spaces

**What:** Allow two or more users to share a topic and collaborate on resources, notes, and discoveries in real-time.

**Architecture:**
- Add a sync server (lightweight Node.js or Cloudflare Worker)
- Use WebSockets (or Server-Sent Events) for live updates
- Each item gets a `lastEditedBy` + `version` field for conflict detection
- End-to-end encrypt all data before transmission

---

### 4.2 Public Discovery Marketplace

**What:** An opt-in network where verified discoveries can be published and found by others researching the same topic.

**Privacy model:**
- Topics and notes are always private
- Only Discoveries explicitly marked "Public" are published
- Users can browse public discoveries by topic tag

---

### 4.3 Spaced Repetition Review Mode

**What:** A built-in flashcard review system for Discoveries.

**How it works:**
- Discoveries with `verification: "Verified"` are added to a review queue
- The app prompts "Do you still remember this?" on a schedule (1 day → 3 days → 1 week → 2 weeks → 1 month)
- User rates: Forgot / Vague / Clear → adjusts next review date

**Algorithm:** SM-2 spaced repetition (the algorithm behind Anki)

---

### 4.4 Academic Citation Generation

**What:** Auto-generate proper academic citations (APA, MLA, Chicago) from source metadata.

**How:**
- Source objects already have: `author`, `title`, `year`, `url`, `publisher`, `pages`
- Add a "Copy Citation" button to each source that formats the stored metadata into the selected citation style

---

### 4.5 Mobile App (Native Android)

**Current status:** Capacitor config is in place, but the app has not been tested on Android.

**Remaining work:**
- Test and fix layout on mobile screen sizes
- Handle touch gestures (swipe to delete, long-press to select)
- Handle Android back button (close modals, navigate up)
- Push notifications for review reminders (requires Capacitor Notifications plugin)
- Camera integration for capturing photos directly into the vault

---

### 4.6 Voice-to-Text Transcription

**What:** After recording audio, automatically transcribe it to text so it becomes searchable.

**Options:**
- **Web Speech API** (`SpeechRecognition`) — free, browser-native, works offline in Chrome
- **Whisper.js** — OpenAI Whisper running locally in the browser (WebAssembly)
- **Whisper API** — cloud version, higher quality but requires internet

**Integration:** After stopping a recording, show a "Transcribe" button. The transcription appears below the audio player and is saved as a linked Note.

---

## 5. Performance & Architecture

### 5.1 Virtualized Lists

**Problem:** Topics with hundreds of resources render all cards in the DOM at once, slowing scroll.

**Fix:** Use `react-window` or a custom intersection-observer approach to render only visible cards.

### 5.2 Migrate to State Management

**Problem:** All state lives in one massive `App` component. As features grow, prop drilling and re-render scope become problematic.

**Options:**
- **Zustand** — lightweight, minimal boilerplate
- **Jotai** — atomic state, great for fine-grained updates
- **React Context + useReducer** — built-in, no extra dependency

**Recommendation:** Zustand, because it works outside React (can be called from utility functions) and doesn't need providers.

### 5.3 Service Worker Improvements

**Current:** Vite-PWA with default Workbox caching.

**Improvements:**
- Add a `Background Sync` handler so exports can be auto-synced to Nextcloud in the background
- Add `Cache-first` strategy for static assets and `Network-first` for dynamic API calls
- Add an offline indicator badge in the topbar

### 5.4 IndexedDB Full Migration

**Current:** IndexedDB is only used for binary file blobs. Topic metadata is in localStorage.

**Proposed:** Move all vault data to IndexedDB:
- One object store for `topics`
- One store for `unsortedResources`
- One store for `attachments`
- Keep localStorage only for `currentUser`, `theme`, `ncUrl/user/pass`

**Benefits:**
- Eliminates localStorage quota errors
- Enables async writes (no blocking)
- Allows storing much larger text content (long notes, chat transcripts)

---

## 6. Platform Expansion

### 6.1 Desktop Menu Bar Integration

**Current:** Electron app has `autoHideMenuBar: true` — no native menu.

**Improvements:**
- Add a native menu: File > Export / Import · Edit > Copy / Paste · View > Toggle Theme
- Add system tray icon so the app runs in background (quick capture from tray)
- Add OS-level keyboard shortcut to open Quick Capture from anywhere

### 6.2 iOS Support

**Current:** Capacitor is configured for Android only.

**Steps to add iOS:**
```bash
npx cap add ios
npx cap open ios
# Then: Archive + distribute in Xcode
```

Requires a Mac with Xcode and an Apple Developer account ($99/year).

### 6.3 Windows Installer (NSIS)

**Current:** `electron-builder` builds a "portable" `.exe` (no install needed).

**Better alternative:** NSIS installer that adds shortcuts, registers file associations, and supports auto-updates via `electron-updater`.

Update `package.json`:
```json
"win": {
  "target": ["nsis", "portable"],
  "publisherName": "Aaenics"
},
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true
}
```

### 6.4 Obsidian Vault Export

**What:** Export the entire Research Vault as an Obsidian-compatible folder of Markdown files.

**Structure:**
```
Research Vault Export/
├── Topics/
│   ├── Webots Robotics/
│   │   ├── Overview.md
│   │   ├── Resources.md
│   │   ├── Notes.md
│   │   └── Discoveries.md
│   └── Machine Learning/
│       └── ...
└── Attachments/
    └── image_abc123.png
```

This bridges the app with the existing Obsidian ecosystem.
