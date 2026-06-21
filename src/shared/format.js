export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Build a `file://` URL for an absolute filesystem path so it can be used as
// an <audio>/<video> source. Custom schemes are rejected by Chromium's media
// "URL safety check", so we use the built-in file: scheme (the renderer runs
// with webSecurity disabled, which permits file: media from the app origin).
// Uses an empty authority (three slashes) so a Windows drive letter (`C:`)
// lands in the path, leaves the drive-letter colon literal (matching Node's
// pathToFileURL), and percent-encodes other segments so spaces, `#`, `?`,
// etc. in filenames don't corrupt the URL.
export function localFileUrl(absPath) {
  const normalized = absPath.replace(/\\/g, '/')
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  const encoded = withLeadingSlash
    .split('/')
    .map((segment) => (/^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join('/')
  return `file://${encoded}`
}
