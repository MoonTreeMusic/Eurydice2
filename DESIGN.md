# Eurydice Architecture Design Doc

## Overview

Split the monolithic Electron app into:
1. **Frontend**: Electron renderer (React UI) + future React Native (iOS/Android)
2. **Backend**: Azure-hosted REST API
3. **Storage**: Azure Blob Storage per user

## Phases

| Phase | Scope |
|-------|-------|
| **1** | Cloud API, multi-user, Entra ID, blob storage, CI/CD |
| **2** | Storage abstraction (local + cloud) |
| **3** | Mobile apps (iOS/Android) |
| **4** | Offline support (local-first sync) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Electron (Desktop) / React Native (Mobile - future)            │
│  - MSAL auth (Entra ID)                                         │
│  - Audio playback via signed blob URLs                          │
│  - Local SQLite cache (phase 4)                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────────┐
│  Azure API (Node.js/Express on Azure App Service)               │
│  - REST endpoints                                               │
│  - Entra ID token validation                                    │
│  - Azure Blob Storage SDK                                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│  Azure Services                                                  │
│  - Azure App Service (dev/staging/prod)                         │
│  - Azure Blob Storage (per user: users/{oid}/)                  │
│  - Azure Entra ID (authentication)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Environments

| Environment | Purpose | API Endpoint | Storage Account |
|-------------|---------|--------------|-----------------|
| `local` | Development | `http://localhost:3000` | Azure Storage Emulator or dev account |
| `staging` | Pre-production | `https://eurydice-api-staging.azurewebsites.net` | Staging |
| `production` | Live users | `https://eurydice-api.azurewebsites.net` | Production |

## CI/CD Pipeline

### GitHub Actions Workflows

**API Deployment (`api-deploy.yml`):**
```
Feature PR opened
  └── lint/test → deploy to staging-slot-pr-{number}.azurewebsites.net

PR merged to main
  └── lint/test → deploy to staging slot (auto)

Manual approval gate
  └── deploy to production slot
```

**Electron Build (`electron-build.yml`):** (Phase 1: not implemented)
- Future: builds for Windows, macOS, Linux on merge to main

### Environments Configured in GitHub
- `staging` - auto-deploy on PR merge
- `production` - requires manual approval

## Project Structure

```
eurydice/
├── .github/
│   └── workflows/
│       ├── api-deploy.yml
│       └── (electron-build.yml - future)
│
├── api/                           # Azure API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── library.ts
│   │   │   └── playlists.ts
│   │   ├── services/
│   │   │   ├── blobStorage.ts
│   │   │   ├── ffprobe.ts
│   │   │   └── library.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   ├── default.ts
│   │   │   ├── staging.ts
│   │   │   └── production.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── src/                           # Electron renderer (React UI)
│   ├── renderer/
│   ├── components/
│   ├── hooks/
│   ├── config/
│   │   └── environments.ts
│   ├── App.jsx
│   └── main/                      # Will be refactored (main.ts + preload.ts)
│
├── shared/                        # Shared TypeScript types
│   └── types.ts
│
└── electron/                      # Electron main process (future)
    └── src/
        ├── main.ts
        └── preload.ts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/library/tracks` | Get all tracks for user |
| `POST` | `/api/library/scan` | Upload files, extract metadata via ffprobe |
| `DELETE` | `/api/library/tracks/:id` | Delete track + blob file |
| `GET` | `/api/library/settings/:key` | Get setting |
| `PUT` | `/api/library/settings/:key` | Update setting |
| `GET` | `/api/playlists` | List playlists |
| `POST` | `/api/playlists` | Create playlist |
| `GET` | `/api/playlists/:id` | Get playlist with tracks |
| `PUT` | `/api/playlists/:id` | Rename playlist |
| `DELETE` | `/api/playlists/:id` | Delete playlist |
| `POST` | `/api/playlists/:id/tracks` | Add track |
| `DELETE` | `/api/playlists/:id/tracks/:trackId` | Remove track |
| `PUT` | `/api/playlists/:id/tracks` | Reorder tracks |
| `GET` | `/api/audio/:trackId/url` | Get signed URL (1hr expiry) |

## Data Model

**User namespace in Blob Storage:** `users/{entra-id-oid}/`

```
users/abc-123-def/
├── library.json        # { tracks, playlists, settings, nextId, nextPlaylistId }
└── tracks/
    ├── 1.mp3
    └── ...
```

## Implementation Order (Phase 1)

### 1. Azure Resources
- [ ] Create Entra ID app registration
- [ ] Create Storage Account (dev/staging/prod)
- [ ] Create App Service plan + web apps (staging + production slots)
- [ ] Configure Entra ID app permissions for Blob Storage

### 2. API Scaffold
- [ ] Initialize Node.js/Express project with TypeScript
- [ ] Add environment config system (local/staging/production)
- [ ] Add auth middleware (Entra ID JWT validation)
- [ ] Add Blob Storage service
- [ ] Implement `/api/library/*` routes
- [ ] Implement `/api/playlists/*` routes
- [ ] Implement `/api/audio/:id/url` for signed URLs
- [ ] Add ffprobe integration for metadata extraction

### 3. CI/CD
- [ ] Create `api-deploy.yml` GitHub Actions workflow
- [ ] Configure GitHub Environments (staging auto-deploy, production manual gate)
- [ ] Test PR → staging preview deployment
- [ ] Test merge → staging deployment
- [ ] Test manual approval → production deployment

### 4. Electron Refactor
- [ ] Create new Electron project structure (`electron/` folder)
- [ ] Add MSAL authentication
- [ ] Update renderer to call REST API
- [ ] Implement signed URL refresh logic
- [ ] Build for local testing against local/staging API

### 5. End-to-End Testing
- [ ] Test full scan flow (upload → ffprobe → library.json update)
- [ ] Test audio playback with signed URLs
- [ ] Test playlist CRUD
- [ ] Test multi-user isolation

## Decisions

| Question | Decision |
|----------|----------|
| Storage abstraction | Blob container per user (`users/{oid}/`) |
| Offline support | Not in phase 1 |
| Authentication | Entra ID via MSAL |
| Backend hosting | Azure App Service |
| API language | Node.js + Express |
| CI/CD PR previews | Auto-deploy to `staging-slot-pr-{number}` |
| Production deploys | Manual approval gate |
| Electron builds in CI | Not in phase 1 (future all platforms) |