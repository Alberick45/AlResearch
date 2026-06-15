# Research Knowledge Vault — UI/UX Documentation

> This document covers the visual design system, layout architecture, and every major screen in the app with screenshots.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Shadows & Glassmorphism](#4-shadows--glassmorphism)
5. [Layout Architecture](#5-layout-architecture)
6. [Landing Page / Auth Screen](#6-landing-page--auth-screen)
7. [Sidebar](#7-sidebar)
8. [Topic Workspace](#8-topic-workspace)
9. [Resource Cards](#9-resource-cards)
10. [Status Pills](#10-status-pills)
11. [Quick Capture Drawer](#11-quick-capture-drawer)
12. [Search Bar & Results Dropdown](#12-search-bar--results-dropdown)
13. [Modals](#13-modals)
14. [Settings Modal](#14-settings-modal)
15. [All Topics Grid View](#15-all-topics-grid-view)
16. [Recently Viewed Panel](#16-recently-viewed-panel)
17. [Timeline Tab](#17-timeline-tab)
18. [Discussion Chat Rendering](#18-discussion-chat-rendering)
19. [Topbar](#19-topbar)
20. [CSS Class Reference](#20-css-class-reference)

---

## 1. Design Philosophy

The app uses a **dark, premium research aesthetic** inspired by academic journals and intelligence dashboards. Key principles:

- **Dark-first:** The default theme uses near-black backgrounds with muted jewel-tone accents
- **Earthy accent palette:** No generic blues or greens — instead: verdigris (teal), brass (amber), garnet (deep red), sage, clay, indigo
- **Three font families for semantic hierarchy:** Serif for big titles, Sans for body, Mono for data/code
- **Glassmorphism for floating surfaces:** Modals, drawers, and dropdowns use backdrop blur with translucent backgrounds
- **Micro-animations everywhere:** Hover lifts, fade-ins, progress bar transitions, pulse animations for recording

---

## 2. Color System

### Base Palette (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-app` | `#080B10` | Page background (deepest) |
| `--bg-sidebar` | `#0E121A` | Sidebar background |
| `--bg-panel` | `#121824` | Panel / card background |
| `--bg-panel-hover` | `#192030` | Panel on hover |
| `--bg-card` | `#151C2A` | Card background |
| `--bg-card-hover` | `#1D263B` | Card on hover |
| `--bg-modal` | `#101622` | Modal background |
| `--border-color` | `rgba(255,255,255,0.07)` | Subtle dividers |
| `--border-light` | `rgba(255,255,255,0.03)` | Very subtle dividers |
| `--border-focus` | `#C9974D` | Input focus ring |
| `--text-primary` | `#F3F4F6` | Main text |
| `--text-secondary` | `#9CA3AF` | Muted text / labels |
| `--text-dim` | `#6B7280` | Placeholder / disabled |

### Accent Colors

Each accent has a personality and semantic role:

| Token | Hex | Personality | Used For |
|-------|-----|-------------|---------|
| `--accent-verdigris` | `#5E8577` | Calm teal-green | Primary CTA, active states, Discussion type |
| `--accent-brass` | `#C9974D` | Warm amber | Highlights, links, focus rings, Audio type |
| `--accent-garnet` | `#A6533D` | Deep coral-red | Danger, delete, recording active |
| `--accent-indigo` | `#5A6B8C` | Muted slate-blue | Info, secondary items |
| `--accent-sage` | `#8C9B6E` | Warm olive-green | Tags, nature-themed accents |
| `--accent-clay` | `#B5764A` | Earthy brown | Neutral warm highlights |
| `--accent-purple` | `#6366F1` | Electric indigo | Save/capture CTAs |

### Light Theme Override

When `[data-theme="light"]` is set on `<html>`, all tokens are overridden:

```css
[data-theme="light"] {
  --bg-app: #F8F9FA;
  --bg-sidebar: #EAECEF;
  --bg-panel: #FFFFFF;
  --text-primary: #111827;
  --text-secondary: #6B7280;
  /* accents remain the same for brand consistency */
}
```

---

## 3. Typography

Three purpose-built typefaces loaded from Google Fonts:

| Font | Variable | Where Used |
|------|----------|-----------|
| **Fraunces** (optical-size serif) | `--font-serif` | App logo, topic headings, tab titles |
| **IBM Plex Sans** (humanist sans) | `--font-sans` | Body text, labels, buttons, all UI |
| **IBM Plex Mono** (monospaced) | `--font-mono` | Timestamps, IDs, code, chat logs, storage meter |

### Type Scale

| Element | Font | Size | Weight |
|---------|------|------|--------|
| App brand name | serif | 18px | 700 |
| Topic title | serif | 22–28px | 600–700 |
| Tab heading | sans | 13px | 600 |
| Resource card title | sans | 14px | 600 |
| Body text | sans | 13.5px | 400 |
| Labels/meta | sans | 11–12px | 400–500 |
| Mono data | mono | 11–12px | 400 |

---

## 4. Shadows & Glassmorphism

### Shadow Scale

```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
--shadow-md:  0 4px 6px rgba(0,0,0,0.1)
--shadow-lg:  0 10px 15px rgba(0,0,0,0.2)
--shadow-xl:  0 20px 25px rgba(0,0,0,0.3)
```

### Glassmorphism Recipe

Used on: Quick Capture drawer, modals, dropdowns, topbar at scroll

```css
.glass-surface {
  background: rgba(18, 24, 36, 0.7);   /* --glass-bg */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);  /* --glass-border */
}
```

---

## 5. Layout Architecture

The app uses a **three-panel fixed layout** with `display: grid` or `display: flex`:

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR (full width, fixed height 52px)                  │
├─────────────┬───────────────────────────┬───────────────┤
│   SIDEBAR   │   SECONDARY PANEL         │  ABOUT PANEL  │
│   240px     │   flex-grow: 1            │   300px       │
│   fixed     │   scrollable              │   collapsible │
│             │                           │               │
│  Topics     │  Topic workspace tabs     │  Description  │
│  list       │  (Overview / Resources /  │  Stats        │
│             │   Notes / Discoveries /   │  Accent pick  │
│             │   Sources / Timeline)     │               │
└─────────────┴───────────────────────────┴───────────────┘
```

**CSS class:** `.app-shell` → uses CSS Grid with named areas

The About Panel collapses with `width: 0; overflow: hidden` when `aboutPanelOpen === false`.

---

## 6. Landing Page / Auth Screen

![Landing page](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\landing_page_1781460255285.png)

The landing page has two states:
- **Sign in** — username + PIN input
- **Register** — new username + PIN creation

Design features:
- Full-viewport centered card with deep space background
- Animated gradient orb behind the card (CSS `@keyframes` radial gradient)
- Brand logo using the serif Fraunces font + robot emoji
- Input fields with `--accent-brass` focus ring
- Two CTA buttons: "Enter Vault" and "Create Profile"

![Profile creation form](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\profile_details_entered_1781460300204.png)

---

## 7. Sidebar

![Sidebar with many topics](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\sidebar_many_topics_1781486150442.png)

The sidebar is a fixed **240px wide** left column containing:

1. **Topbar integration** — search bar and action buttons
2. **Library section** — fixed, non-scrolling header links:
   - All Topics
   - Recently Viewed  
   - Inbox (Unsorted)
3. **Research Topics section** — vertically scrollable list of topics (only this part scrolls)
4. **Quick Capture button** — pinned at bottom

### Topic List Item

Each topic in the sidebar shows:
- Colored left border using the topic's accent color
- Topic name (truncated at 1 line)
- Subtle hover background

**Active state:** Background `--bg-panel-hover`, left border at full accent opacity, text at full brightness.

---

## 8. Topic Workspace

![Topic loaded - Cloud Host](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\cloud_host_topic_loaded_1781484655057.png)

The topic workspace is the main panel when a topic is selected. It has:

1. **Topic header** — topic name, tagline, accent-colored border-left
2. **Tab bar** — 6 tabs: Overview · Resources · Notes · Discoveries · Sources · Timeline
3. **Tab content** — changes based on active tab

### Tab: Overview

Shows statistics cards in a grid:
- Total resources
- Unread count
- In-progress count  
- Discoveries count
- Notes count
- Last activity date

Also shows a reading progress bar: `(Finished resources / Total) × 100%`

### Tab: Resources

- Filter pills: All · Unread · Reading · Finished · Valuable
- Sort dropdown: By date · By title · By status
- Resource cards list (see Section 9)

### Tab: Notes

- Add note button (textarea inline)
- Note cards with edit/delete/convert-to-discovery actions

### Tab: Discoveries

- Discovery cards with verification status pill
- Lock/Globe icon for visibility toggle (Private/Public)

### Tab: Sources

- Source cards by type (Website, Book, Video, Article)
- Each shows: title, author, URL, year

### Tab: Timeline

- Chronological log of all activity
- Each entry: icon + event description + timestamp
- Events: resource added, status changed, note created, discovery made

---

## 9. Resource Cards

![Resource cards](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\media__1781486622830.png)

A resource card shows:
- **Type icon** (left) — Lucide icon from `TYPE_ICON`
- **Title** — bold, one line
- **Type badge** + date added + "Visit link →" (if URL)
- **Status pill** (clickable to cycle status)
- **Offline preview** (if file stored) — image, video player, audio player, PDF download, or chat timeline

### Card Actions (hover reveal)
- ✏️ Edit (opens Edit Resource modal)
- 🗑️ Delete (with confirmation dialog)

### Offline Preview States

```
"Loading offline preview..."  → still fetching from IndexedDB
Image                        → inline <img>
Video                        → inline <video controls>
Audio                        → inline <audio controls> with header
PDF/Doc                      → Download button with file size
Discussion                   → Chat bubble timeline
```

---

## 10. Status Pills

Status pills are colored badge buttons that cycle through states on click:

| Status | Background color | Text color |
|--------|-----------------|-----------|
| Unread | `rgba(90,107,140,0.2)` | `--accent-indigo` |
| Reading | `rgba(201,151,77,0.2)` | `--accent-brass` |
| Finished | `rgba(16,185,129,0.2)` | `--accent-green` |
| Valuable | `rgba(94,133,119,0.2)` | `--accent-verdigris` |
| Archived | `rgba(107,114,128,0.15)` | `--text-dim` |

Clicking the pill calls `cycleStatus(topicId, resourceId)` which advances the status and appends a timeline entry.

---

## 11. Quick Capture Drawer

![Quick Capture drawer open](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\quick_capture_drawer_open_1781458172018.png)

The Quick Capture drawer slides in from the right edge of the screen. It has:

1. **Mode tabs** — "Discovery" or "Resource"
2. **Topic selector** — dropdown of all existing topics
3. **Mode-specific form**

**Discovery mode:**
- Single large textarea
- No title needed — just the insight text

**Resource mode (varies by type):**

| Resource Type selected | Form shown |
|----------------------|-----------|
| Website, PDF, Book, etc. | URL input + file upload |
| **Audio** | Start/Stop Recording button + live timer + audio preview + optional file upload |
| **Discussion** | Large monospace textarea for pasting chat log + message count live preview |

**Discussion paste area:**
- `font-family: mono` for readability of chat format
- Live counter: "✓ 12 messages detected"
- Accepted formats: WhatsApp brackets, dash-separated, simple colon

**Audio recording controls:**
- Red "Start Recording" button → live pulsing "● Recording… 00:23" timer
- Square stop icon button → saves audio, shows `<audio>` preview
- Also accepts uploaded audio files

![Resource capture form](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\quick_capture_resource_details_1781478111164.png)

---

## 12. Search Bar & Results Dropdown

![Search results dropdown](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\media__1781486622830.png)

The search bar is in the topbar. Typing triggers a live search across:
- Topic names
- Resource titles
- Note text
- Discovery statements
- Source titles

**Results dropdown** appears below the search bar:
- Grouped by type: Resources · Notes · Discoveries
- Each result shows: name/title + type badge + parent topic badge (e.g. "in Webots")
- Clicking a result navigates to the topic and highlights the item

---

## 13. Modals

All modals share a common structure:

```
.modal-overlay (full screen dimmed backdrop, click to close)
  └── .modal-card (centered card, click-stop propagation)
       ├── .modal-header (title + X close button)
       ├── .modal-body (scrollable form content)
       └── .modal-footer (action buttons)
```

**Design:** Modal card uses `--bg-modal` background + `--shadow-xl` + `border-radius: 14px`. The overlay is `rgba(0,0,0,0.6)` with `backdrop-filter: blur(4px)`.

### Edit Resource Modal

Fields:
- Title (text input)
- Resource Type (select)
- URL (text input)
- Source (linked source dropdown)
- Move To Topic (select — moves resource between topics)
- Replace file (file upload)

### Edit Note Modal

- Simple textarea (full-width, resizable)
- Cancel / Save buttons

### Edit Discovery Modal

Fields:
- Statement (textarea)
- Verification status (radio: Unverified / Verified / Disproven)
- Visibility (Private / Public toggle)

### Confirm Dialog

Small centered modal used for destructive actions (delete, clear data):
- Warning message
- Cancel (ghost) + Confirm (red solid) buttons

### Alert Dialog

Single "OK" button — used for validation errors and info messages.

---

## 14. Settings Modal

![Settings modal](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\initial_state_1781486057044.png)

The Settings modal has sections:

1. **Profile Name** — read-only display
2. **Change Password PIN** — old PIN + new PIN form
3. **Backup Management** — Export JSON / Import Backup
4. **Nextcloud Private Cloud Sync** — WebDAV URL, username, app password, path; Push / Pull buttons; status
5. **Storage Overview** (new) — animated progress bar + breakdown:
   - Total browser storage (IndexedDB + Cache) with colour-coded bar
   - localStorage usage (topics, metadata)
   - IndexedDB usage (files, audio, videos)
   - Warning if >80% used
6. **Danger Zone** — "Clear All Vault Data" red button

### Storage Bar Color Logic

| Usage % | Bar color |
|---------|-----------|
| 0–50% | `--accent-verdigris` (green) |
| 50–80% | `--accent-brass` (amber) |
| >80% | `--accent-garnet` (red) |

---

## 15. All Topics Grid View

![All topics view](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\after_scroll_1781458926344.png)

When "All Topics" is clicked in the sidebar, the secondary panel shows a **CSS grid of topic cards** (2–4 columns responsive).

Each topic card shows:
- Topic name (serif font)
- Accent-colored top border
- Resource count · Discovery count · Notes count
- Progress bar (finished/total resources)
- "Private" or "Public" badge

Clicking a card navigates into that topic's workspace.

---

## 16. Recently Viewed Panel

![Recently viewed](C:\Users\PAAPA\.gemini\antigravity-ide\brain\5f337427-7ad2-40e3-b42f-dde3b63b7b00\recently_viewed_list_1781486290509.png)

Shows the last 10 topics/resources opened, with:
- Icon for type
- Name
- Parent topic badge
- Time ago (e.g. "2h ago")

Clicking an item navigates directly to it.

---

## 17. Timeline Tab

The timeline is a **vertical chronological feed** rendered as a list of events:

```
○  ─────────────────────────────────
│   Added resource "Webots Docs"     ← Jun 15, 2026
○  ─────────────────────────────────
│   Status changed: Unread → Reading ← Jun 16, 2026
○  ─────────────────────────────────
│   Discovery created               ← Jun 17, 2026
```

Each event has:
- A colored dot with the topic's accent color
- A vertical connecting line
- Event description text
- Timestamp (relative or absolute)

Events are stored in `topic.timeline[]` and appended automatically when actions occur (add resource, change status, create note, create discovery).

---

## 18. Discussion Chat Rendering

When a Discussion resource is viewed, the stored chat text is decoded and rendered as a **chat bubble timeline**:

```
┌────────────────────────────────────────┐
│ 💬 Digital football aaenics            │
│   3 participants • 12 messages         │
├────────────────────────────────────────┤
│                                        │
│  [23:07]  Alby                         │
│  ╭──────────────────────────────╮      │
│  │ So the real thing was the    │      │
│  │ slider that we need to 3D    │      │
│  │ print                        │      │
│  ╰──────────────────────────────╯      │
│                                        │
│                      [23:09]  Daniella │
│      ╭────────────────────────────╮    │
│      │ Yes please                 │    │
│      ╰────────────────────────────╯    │
│                                        │
└────────────────────────────────────────┘
```

- **Left-aligned bubbles** — first sender
- **Right-aligned bubbles** — subsequent unique senders
- Each bubble: sender name + timestamp above, message text inside
- URLs in messages are rendered as clickable `<a>` links
- Unique senders get assigned alternating accent colors

---

## 19. Topbar

The topbar spans the full width at the top of the app (52px height):

```
[ 🤖 Research Vault ]  [ Search ___________________ ]  [ 🔔 ][ ⚙ ][ 👤 Alby ▾ ]
```

| Element | Description |
|---------|-------------|
| Brand logo | Robot emoji + "Research Vault" in Fraunces serif |
| Search bar | Live-search input with magnifier icon; results dropdown on focus |
| Bell icon | Notifications button (placeholder) |
| Settings icon | Opens Settings modal |
| Profile avatar | Initials in colored circle; dropdown with Switch Profile / Log Out / Settings |

---

## 20. CSS Class Reference

| Class | Used on | Description |
|-------|---------|-------------|
| `.app-shell` | Root layout | Three-panel grid |
| `.sidebar` | Left panel | Fixed 240px, dark bg |
| `.main-content` | Middle panel | Flex-grow, scrollable |
| `.about-panel` | Right panel | Collapsible 300px |
| `.topbar` | Top bar | Fixed height, blur background |
| `.topic-item` | Sidebar list item | Topic entry with accent border |
| `.topic-item.active` | Active topic | Highlighted state |
| `.resource-card` | Resource list item | White card with hover lift |
| `.status-pill` | Status badge | Colored, clickable |
| `.tab-btn` | Workspace tab | Toggle underline on active |
| `.modal-overlay` | Modal backdrop | Full screen dim |
| `.modal-card` | Modal container | Centered card |
| `.drawer` | Quick Capture | Right-side slide-in panel |
| `.form-input` | All inputs | Styled text input |
| `.form-textarea` | Textareas | Styled multiline input |
| `.form-label` | Form labels | Small uppercase label |
| `.btn-solid` | Primary buttons | Filled button |
| `.btn-ghost` | Secondary buttons | Transparent outline button |
| `.toast` | Toast notification | Bottom-right pop-up |
| `.search-results-dropdown` | Search results | Floating results panel |
| `.discovery-card` | Discovery items | Teal-accented card |
| `.note-card` | Note items | Amber-accented card |
| `.timeline-entry` | Timeline items | Vertical dot + line |
| `.desktop-app-btn` | Settings buttons | Outlined action buttons |
| `.auth-card` | Landing page card | Large centered card |
| `.auth-btn-submit` | Login/register | Full-width CTA button |
