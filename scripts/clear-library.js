#!/usr/bin/env node
/*
 * Deletes the persisted library file (library.json) so the app starts empty.
 *
 * The app stores its library in Electron's `app.getPath('userData')` directory,
 * which is `<appData>/<appName>`. We mirror that path here so this can run as a
 * plain Node script without launching Electron. `loadLibrary()` treats a missing
 * file as an empty library, so deleting it is a safe reset.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const APP_NAME = require('../package.json').name // 'moo-music'

function appDataDir() {
  if (process.platform === 'win32') {
    return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support')
  }
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
}

const libraryPath = path.join(appDataDir(), APP_NAME, 'library.json')

if (fs.existsSync(libraryPath)) {
  fs.rmSync(libraryPath)
  console.log(`Cleared library: ${libraryPath}`)
} else {
  console.log(`No library file found — nothing to clear: ${libraryPath}`)
}
