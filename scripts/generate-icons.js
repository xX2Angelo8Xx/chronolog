/**
 * ChronoLog Icon Generator
 *
 * Converts the SVG icon (assets/icon.svg) into PNG files at various sizes
 * needed for an Electron app (tray icon, window icon, installer icon, etc.)
 *
 * === DEPENDENCIES ===
 * This script requires the "sharp" package:
 *   npm install --save-dev sharp
 *
 * === USAGE ===
 *   node scripts/generate-icons.js
 *
 * === OUTPUT ===
 * Generates the following files in assets/:
 *   icon-16.png    - Tray icon (small)
 *   icon-24.png    - Tray icon (medium)
 *   icon-32.png    - Tray icon / window title bar
 *   icon-48.png    - Windows taskbar
 *   icon-64.png    - General use
 *   icon-128.png   - macOS dock (small)
 *   icon-256.png   - Standard app icon / electron-builder
 *   icon-512.png   - macOS dock (large) / high-DPI
 *   icon.png       - 256x256 default (used by electron-builder)
 *   icon.ico       - Windows icon (256x256, auto-converted by electron-builder)
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const SVG_PATH = path.join(ASSETS_DIR, 'icon.svg');

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

async function generateIcons() {
  // Check if SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`ERROR: SVG file not found at ${SVG_PATH}`);
    process.exit(1);
  }

  // Try to load sharp
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('='.repeat(60));
    console.log('  sharp module is not installed.');
    console.log('  To generate PNG icons, install it first:');
    console.log('');
    console.log('    npm install --save-dev sharp');
    console.log('');
    console.log('  Then re-run this script:');
    console.log('');
    console.log('    node scripts/generate-icons.js');
    console.log('');
    console.log('  --- MANUAL ALTERNATIVES ---');
    console.log('');
    console.log('  1. Use Inkscape CLI:');
    console.log('     inkscape assets/icon.svg -w 256 -h 256 -o assets/icon.png');
    console.log('');
    console.log('  2. Use ImageMagick:');
    console.log('     magick convert -background none assets/icon.svg');
    console.log('       -resize 256x256 assets/icon.png');
    console.log('');
    console.log('  3. Use an online converter:');
    console.log('     - https://svgtopng.com');
    console.log('     - https://cloudconvert.com/svg-to-png');
    console.log('');
    console.log('  4. For .ico files (Windows), use:');
    console.log('     - https://convertico.com');
    console.log('     - electron-builder will auto-generate .ico from a 256x256 .png');
    console.log('='.repeat(60));
    process.exit(0);
  }

  const svgBuffer = fs.readFileSync(SVG_PATH);

  console.log('Generating PNG icons from SVG...\n');

  for (const size of SIZES) {
    const outputName = `icon-${size}.png`;
    const outputPath = path.join(ASSETS_DIR, outputName);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${outputName} (${size}x${size})`);
  }

  // Also create the default icon.png at 256x256 (used by electron-builder)
  const defaultIconPath = path.join(ASSETS_DIR, 'icon.png');
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(defaultIconPath);

  console.log(`  ✓ icon.png (256x256, default)`);

  console.log('\nDone! Icons saved to assets/');
  console.log('\nNote: electron-builder can auto-generate .ico and .icns from icon.png.');
  console.log('See: https://www.electron.build/icons');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
