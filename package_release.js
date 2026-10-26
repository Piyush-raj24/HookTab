/**
 * Package Extension for GitHub Releases & Chrome Web Store
 * Generates a clean, distribution-ready zip file without development artifacts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const releaseDir = path.join(rootDir, 'dist');

// Read manifest to get extension name and version
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.0.0';

// Ensure dist folder exists
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

const zipName = `HookTab-v${version}.zip`;
const zipPath = path.join(releaseDir, zipName);

// Files and folders required for production distribution
const includeItems = [
  'manifest.json',
  'LICENSE',
  'newtab.html',
  'newtab.css',
  'newtab.js',
  'background.js',
  'popup.html',
  'popup.js',
  'assets'
];

console.log(`🚀 Packaging HookTab v${version} for GitHub Releases...`);

// Temporary staging directory
const stagingDir = path.join(releaseDir, 'staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Copy essential files to staging
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

includeItems.forEach(item => {
  const src = path.join(rootDir, item);
  const dest = path.join(stagingDir, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`  ✓ Added ${item}`);
  } else {
    console.warn(`  ⚠️ Warning: ${item} not found`);
  }
});

// Create zip using PowerShell Compress-Archive (Native on Windows, zero dependencies)
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  const psCmd = `powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  const stat = fs.statSync(zipPath);
  const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`\n🎉 Release archive created successfully!`);
  console.log(`📁 File: ${zipPath} (${sizeMb} MB)`);
  console.log(`👉 Ready to upload to GitHub Releases and Chrome Web Store.`);
} catch (err) {
  console.error('Error creating archive:', err.message);
} finally {
  // Clean up staging directory
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
