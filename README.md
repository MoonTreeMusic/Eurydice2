# Moo Music

A desktop music player. Help humans listen to their music on their terms.

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

This starts the Vite dev server and Electron together. `npm run dev` is an alias.

## Test

```bash
npm test
```

## Build (production)

```bash
npm run build
```

## Stack

- **Electron** — desktop shell, native file dialog
- **React** — UI
- **Vite** — build tooling
- **HTML5 Audio API** — playback engine (mp3, m4a, flac, wav, ogg)

## Features (v0.1)

- Open local audio files via native dialog (mp3, flac, m4a minimum)
- Play / Pause / Resume
- Seek bar with current position and duration
- Volume control with mute toggle
- Queue: load and play multiple tracks sequentially
- Error recovery on bad tracks
