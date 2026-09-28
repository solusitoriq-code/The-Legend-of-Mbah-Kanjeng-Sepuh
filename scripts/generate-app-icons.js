const sharp = require('sharp');
const fs = require('fs');

async function generateAppIcons() {
  console.log('Generating optimized icons for SI KANJENG SEPUH...');

  // Base portrait cropped square (241x241) centered from 271x241
  const rawSquare = await sharp('assets/icons/icon-logo.png')
    .extract({ left: 15, top: 0, width: 241, height: 241 })
    .toBuffer();

  // 1. Full-bleed square optimized version of icon-logo.png (standard app icon)
  // Let's also keep an optimized icon-logo.png or create high-res 512x512
  const portrait512 = await sharp(rawSquare)
    .resize(512, 512, { kernel: 'lanczos3' })
    .sharpen({ sigma: 1.2, m1: 1.0, m2: 2.0 })
    .toBuffer();

  // Create PWA Maskable & Standalone Master:
  // Android safe zone is 80% circle (radius ~204px from center 256, 256).
  // Diameter is ~410px.
  // Within a 512x512 canvas with dark background #0f172a (or royal dark indigo #0c101d):
  // We place a 420x420 portrait with rounded corners and a gold royal border.
  const innerSize = 420;
  const innerRadius = 90;
  const innerMask = Buffer.from(`
    <svg width="${innerSize}" height="${innerSize}">
      <rect width="${innerSize}" height="${innerSize}" rx="${innerRadius}" fill="#fff"/>
    </svg>
  `);

  const innerImage = await sharp(rawSquare)
    .resize(innerSize, innerSize, { kernel: 'lanczos3' })
    .sharpen({ sigma: 1.0, m1: 0.8, m2: 1.5 })
    .composite([{ input: innerMask, blend: 'dest-in' }])
    .toBuffer();

  const fullCanvasSvg = Buffer.from(`
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="60%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#090d16"/>
        </radialGradient>
        <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="40%" stop-color="#f59e0b"/>
          <stop offset="70%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <!-- Solid base to prevent any transparent corner issues in iOS & Android -->
      <rect width="512" height="512" fill="url(#bgGlow)"/>
      <!-- Shadow and Gold Border -->
      <rect x="46" y="46" width="${innerSize}" height="${innerSize}" rx="${innerRadius}" 
            fill="none" stroke="url(#goldBorder)" stroke-width="8" filter="url(#shadow)"/>
    </svg>
  `);

  // Composite master 512
  const master512 = await sharp(fullCanvasSvg)
    .composite([{ input: innerImage, top: 46, left: 46 }])
    .png({ quality: 90, compressionLevel: 9, effort: 8 })
    .toBuffer();

  // Save 512x512
  await sharp(master512)
    .toFile('assets/icons/icon-512.png');
  console.log('Saved assets/icons/icon-512.png');

  // Save 192x192
  await sharp(master512)
    .resize(192, 192, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 0.6, m2: 1.2 })
    .png({ quality: 90, compressionLevel: 9, effort: 8 })
    .toFile('assets/icons/icon-192.png');
  console.log('Saved assets/icons/icon-192.png');

  // Save Apple Touch Icon (180x180)
  await sharp(master512)
    .resize(180, 180, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 0.6, m2: 1.2 })
    .png({ quality: 90, compressionLevel: 9, effort: 8 })
    .toFile('assets/icons/apple-touch-icon.png');
  console.log('Saved assets/icons/apple-touch-icon.png');

  // Save Favicon 32x32 and 48x48
  // For favicon at small sizes (32x32 / 48x48), a full-bleed square or circular portrait with gold border is much clearer!
  const favCrop32 = await sharp(rawSquare)
    .resize(32, 32, { kernel: 'lanczos3' })
    .sharpen({ sigma: 1.5, m1: 1.2, m2: 2.0 })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile('assets/icons/favicon-32x32.png');

  const favCrop48 = await sharp(rawSquare)
    .resize(48, 48, { kernel: 'lanczos3' })
    .sharpen({ sigma: 1.2, m1: 1.0, m2: 1.8 })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile('assets/icons/favicon-48x48.png');

  // Also create a 512 full portrait (without frame) as icon-maskable or alternative if needed
  await sharp(portrait512)
    .png({ quality: 90, compressionLevel: 9, effort: 8 })
    .toFile('assets/icons/icon-portrait-512.png');

  // WebP versions for ultra-fast modern web loading
  await sharp(master512)
    .webp({ quality: 85, effort: 6 })
    .toFile('assets/icons/icon-512.webp');

  await sharp(master512)
    .resize(192, 192, { kernel: 'lanczos3' })
    .webp({ quality: 85, effort: 6 })
    .toFile('assets/icons/icon-192.webp');

  // Also update icon.svg to embed the new logo cleanly
  const base64Png = (await sharp('assets/icons/icon-192.png').toBuffer()).toString('base64');
  const newSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <image href="data:image/png;base64,${base64Png}" width="192" height="192"/>
</svg>`;
  fs.writeFileSync('assets/icons/icon.svg', newSvg);
  console.log('Saved assets/icons/icon.svg');

  console.log('All icons generated successfully!');
}

generateAppIcons().catch(err => console.error('Error generating icons:', err));
