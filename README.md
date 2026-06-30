# Research Knowledge Vault - Pacing Assistant

An offline-first personal research and knowledge management system equipped with an adaptive, PID-controlled reading/writing pacing assistant.

## Pacing Assistant Features

### 1. Dual Training Modes
- **✍ Writing Mode:** Tailored for typing and taking notes at a comfortable writing speed (defaults to ~40 WPM). Displays an interactive visual timer bar.
- **📖 Reading Mode:** Tailored for reading and absorption (defaults to ~200 WPM). Automatically activates browser Text-to-Speech (TTS).

### 2. Voice-Directed Auto-Transitions (Reading Mode)
- In Reading Mode, the countdown timer is hidden, and transitions are controlled by voice narration. When the browser finishes reading a sentence, it automatically advances to the next sentence.
- Scales the narration rate based on the PID multiplier (from `0.5x` to `2.5x` speed).
- Speech synthesis is protected against browser garbage collection bugs and halts instantly when pausing or exiting.

### 3. Adaptive PID Feedback Loop
- Evaluates reading/writing errors on sentence transitions:
  $$e = \frac{T_{\text{target}} - T_{\text{actual}}}{T_{\text{target}}}$$
- Automatically scales target speeds using Proportional, Integral, and Derivative gains:
  - **Pressing Prev / Timing Out:** Decelerates speed by injecting negative error constants (`-0.5` / `-0.35`).
  - **Finishing Early:** Speeds up pacing dynamically.
- Custom multipliers, average WPM, and average CPS are saved on each note/discovery and persisted in local storage.

### 4. Ergonomic Paragraph & Rest Breaks
- Automatically detects note paragraph boundaries.
- **Finger Rest Breaks:** During Writing Mode, triggers a 10-second finger rest break between paragraphs (if at least 20 words have been written since the last break). Includes manual "Skip Rest / Resume" toggles.

### 5. Training Analytics & Settings
- Keeps a running weighted average of your Reading WPM and Writing WPM in the **Profile & Security** section of the Settings modal.
- Provides a congratulatory statistics modal at the end of each session.

---

## Desktop Compilations (Electron)

To package/compile the desktop application for macOS and Windows:
```bash
# Build production bundle and package Windows/macOS desktop apps
npm run dist:desktop
```
This script compiles the React bundle with Vite and uses `electron-builder` to package portable executables inside the `dist-desktop` directory.

---

## Getting Started (Development)

Run the local development server:
```bash
npm run dev
```
