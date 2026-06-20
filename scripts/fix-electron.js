#!/usr/bin/env node
/*
 * Repairs a broken Electron install.
 *
 * On some Windows machines (antivirus / permissions quirks) Electron's
 * postinstall downloads the binary zip fine but the `extract-zip` step
 * silently fails to settle, leaving node_modules/electron/dist without
 * electron.exe and without the path.txt marker. The result is:
 *
 *   throw new Error('Electron failed to install correctly, please delete
 *                    node_modules/electron and try installing again');
 *
 * This script detects that state and repairs it by (re)downloading the
 * cached zip via @electron/get and extracting it with a platform-native
 * tool (PowerShell Expand-Archive on Windows, `unzip` elsewhere), then
 * writing the path.txt marker. It is a no-op when Electron is already
 * installed correctly, so it is safe to run as a postinstall hook.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron');

function log(msg) {
  console.log(`[fix-electron] ${msg}`);
}

function getPlatformPath(platform) {
  switch (platform) {
    case 'mas':
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron';
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return 'electron';
    case 'win32':
      return 'electron.exe';
    default:
      throw new Error('Electron builds are not available on platform: ' + platform);
  }
}

function isInstalled(distPath, platformPath, pathTxt) {
  try {
    if (fs.readFileSync(pathTxt, 'utf-8') !== platformPath) return false;
  } catch {
    return false;
  }
  return fs.existsSync(path.join(distPath, platformPath));
}

function extractZip(zipPath, destDir) {
  if (process.platform === 'win32') {
    // .NET-based; the closest reliable native extractor on Windows.
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
      ],
      { stdio: 'inherit' }
    );
  } else {
    execFileSync('unzip', ['-o', zipPath, '-d', destDir], { stdio: 'inherit' });
  }
}

async function main() {
  if (!fs.existsSync(electronDir)) {
    log('node_modules/electron not found — run `npm install` first. Skipping.');
    return;
  }

  const { version } = require(path.join(electronDir, 'package.json'));
  const platform = process.platform;
  const platformPath = getPlatformPath(platform);
  const distPath = path.join(electronDir, 'dist');
  const pathTxt = path.join(electronDir, 'path.txt');

  if (isInstalled(distPath, platformPath, pathTxt)) {
    log(`Electron v${version} already installed correctly. Nothing to do.`);
    return;
  }

  log(`Electron v${version} is not fully installed — repairing...`);

  // Resolve @electron/get from within the electron package so the right
  // version is used regardless of hoisting.
  const getModulePath = require.resolve('@electron/get', { paths: [electronDir] });
  const { downloadArtifact } = require(getModulePath);

  let checksums;
  try {
    checksums = require(path.join(electronDir, 'checksums.json'));
  } catch {
    checksums = undefined;
  }

  log('Ensuring the Electron binary zip is downloaded/cached...');
  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform,
    arch: process.arch,
    checksums,
  });
  log(`Zip ready: ${zipPath}`);

  log(`Extracting to ${distPath} ...`);
  fs.mkdirSync(distPath, { recursive: true });
  extractZip(zipPath, distPath);

  // Move bundled type definitions up to the package root, mirroring
  // Electron's own install.js behaviour.
  const srcTypeDef = path.join(distPath, 'electron.d.ts');
  if (fs.existsSync(srcTypeDef)) {
    fs.renameSync(srcTypeDef, path.join(electronDir, 'electron.d.ts'));
  }

  // Write the marker that node_modules/electron/index.js looks for.
  fs.writeFileSync(pathTxt, platformPath);

  if (!isInstalled(distPath, platformPath, pathTxt)) {
    throw new Error(
      `Extraction completed but ${platformPath} is still missing from ${distPath}. ` +
        'Check antivirus / folder permissions and retry.'
    );
  }

  log(`Done. Electron v${version} repaired successfully (${platformPath}).`);
}

main().catch((err) => {
  console.error(`[fix-electron] FAILED: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
