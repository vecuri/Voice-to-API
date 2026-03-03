#!/usr/bin/env node
/**
 * Generates placeholder PNG assets for the Expo app.
 * Run: node scripts/generate-assets.js
 *
 * Creates minimal valid PNG files (solid black) for:
 * - assets/icon.png (1024x1024)
 * - assets/splash.png (1284x2778)
 * - assets/adaptive-icon.png (1024x1024)
 *
 * Replace these with real assets before publishing.
 */

const fs = require('fs');
const path = require('path');

// Minimal 1x1 black PNG in base64, we'll use this as a placeholder
// Real apps should replace with proper sized images
function createMinimalPng() {
  // This is a valid 1x1 black pixel PNG
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

const assetsDir = path.join(__dirname, '..', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const files = ['icon.png', 'splash.png', 'adaptive-icon.png'];
const png = createMinimalPng();

for (const file of files) {
  const filePath = path.join(assetsDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, png);
    console.log(`Created placeholder: assets/${file}`);
  } else {
    console.log(`Already exists: assets/${file}`);
  }
}

console.log('\nDone! Replace these with real assets before publishing.');
