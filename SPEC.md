# Music App — MVP Spec

**Mission**: Help humans listen to their music on their terms.  
**Version**: 1.0  
**Date**: 2026-06-19

---

## Core User Flows (v1)

### 1. Open a file and play it
User opens the app, selects a local audio file from their filesystem, and it starts playing.

### 2. Playback controls
User can play, pause, and resume the current track. A seek bar shows elapsed time and total duration. User can drag to seek.

### 3. Volume control
User can adjust volume with a slider.

### 4. Queue
User can add multiple files to a queue. Tracks play in sequence. User can skip forward and backward.

### 5. Now Playing
The current track's filename and duration are displayed while playing. If embedded metadata (ID3/FLAC tags) exists, show title, artist, and album art.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | **Electron** (Node.js + Chromium) | Ships a cross-platform desktop app fast; proven for media apps (Spotify desktop used it) |
| UI | **Vanilla HTML/CSS/JS** (no framework) | No build complexity; the UI surface is small |
| Audio | **Web Audio API** (built into Chromium) | Handles mp3, flac, m4a, ogg natively; no codec licensing headaches |
| Metadata | **music-metadata** npm package | Battle-tested tag parser; covers ID3, FLAC, MP4 |
| Storage | **None in v1** | No database; queue is in-memory. No user accounts. |
| Packaging | **electron-builder** | One command produces Windows/macOS/Linux installers |

**Language**: JavaScript (Node.js main process, vanilla JS renderer). TypeScript not worth the setup cost for this scope.

---

## What v1 Does NOT Include

- **Library / music scanner** — no scanning folders, no persisted library, no database
- **Playlists** — no save/load of queues
- **Streaming** — local files only; no Spotify, YouTube, SoundCloud integration
- **Sync / cloud** — no iCloud, Dropbox, or any remote storage
- **Equalizer / audio effects** — straight playback only
- **Mini player / system tray** — single window
- **Lyrics** — not in scope
- **Sleep timer / alarm** — not in scope
- **Mobile** — desktop only
- **User accounts / login** — none
- **Visualizations** — no waveforms or spectrum analyzers

---

## Acceptance Criteria

- [ ] App opens without errors on Windows, macOS, or Linux
- [ ] User can open local mp3, flac, and m4a files
- [ ] Play / pause / seek / volume controls work
- [ ] Queue accepts multiple files; skip forward/back works
- [ ] Track title visible while playing (filename fallback if no tags)
- [ ] No crash after playing 3+ consecutive tracks
