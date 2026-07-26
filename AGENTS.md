# Eurydice Development Notes

## Project Structure
- **Electron + React** desktop music player
- **Frontend**: `src/renderer/` (Vite + React)
- **Electron main**: `src/main/` (preload.js, main.js, library.js, certAuth.js)
- **API server**: `api/` (Express + TypeScript)
- **Shared types**: `shared/types.ts`

## Running the App
```powershell
# Terminal 1: API server (required for scan functionality)
cd api; npm run dev

# Terminal 2: Electron app
npm run dev
```

## Key Build Commands
```powershell
npm run dev        # Electron app (Vite)
cd api; npm run build  # API server (TypeScript)
npm run build      # Full Electron build
```

## Environment Files
- **Root `.env`**: Frontend config (`VITE_AZURE_*`, `VITE_API_BASE_URL`)
- **`api/.env`**: Backend config (`AZURE_*`, `FFPROBE_PATH`)
- Both must exist and be properly configured

## Azure Storage (OBO Flow)
- Uses **OnBehalfOfCredential** - user's JWT token is exchanged for storage access
- Container naming: `user-{userId}` (Azure storage containers can't have `/`)
- App Registration needs **Azure Storage permission**: API permissions → Add → Azure Storage → Delegated → user_impersonation
- Storage account must have public access disabled (correct for OBO)

## Auth Token Validation
- MSAL returns tokens with `https://sts.windows.net/{tenant}/` issuer (v1.0)
- API validates against `https://login.microsoftonline.com/{tenant}/v2.0` (v2.0)
- Auth middleware accepts both issuers

## ffprobe for Music Metadata
```powershell
# Install ffmpeg (includes ffprobe)
winget install ffmpeg

# Find ffprobe location
where ffprobe 2>$null
# Or search WinGet packages folder:
Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Directory | Where-Object { $_.Name -like "*ffmpeg*" }

# Set in api/.env (use full path):
FFPROBE_PATH=C:\path\to\ffprobe.exe
```

## Common Errors
| Error | Solution |
|-------|----------|
| `jwt issuer invalid` | Token uses v1.0 issuer - auth middleware now accepts both |
| `Public access not permitted` | Remove `access: 'container'` when creating containers |
| `Invalid URI` | Container name contained `/` - now using `user-{userId}` format |
| `BlobNotFound` | Check `error.code === 'BlobNotFound'`, not message |
| `Cannot find ffprobe` | Set `FFPROBE_PATH` in `api/.env` |
| API config empty | API server needs `import 'dotenv/config'` at top of index.ts |
