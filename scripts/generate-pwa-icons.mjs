/**
 * يولّد أيقونات PWA مربّعة من الشعار الأفقي لمصنع التركي.
 * التشغيل: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoPath = path.join(root, 'public', 'turki-logo.png');
const outDir = path.join(root, 'public', 'icons');

/** أزرق الشعار الرسمي */
const BRAND_BLUE = { r: 13, g: 58, b: 122, alpha: 1 };

async function squareIcon(size, { bg = '#ffffff', padding = 0.12, filename }) {
  const logo = sharp(logoPath);
  const meta = await logo.metadata();
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await logo
    .resize({
      width: inner,
      height: inner,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(resized).metadata();
  const left = Math.round((size - (resizedMeta.width ?? inner)) / 2);
  const top = Math.round((size - (resizedMeta.height ?? inner)) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(path.join(outDir, filename));

  console.log(`✓ ${filename} (${size}×${size})`);
}

async function maskableIcon(size) {
  const padding = 0.18;
  const inner = Math.round(size * (1 - padding * 2));
  const logo = sharp(logoPath);
  const resized = await logo.resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  const left = Math.round((size - (resizedMeta.width ?? inner)) / 2);
  const top = Math.round((size - (resizedMeta.height ?? inner)) / 2);

  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BLUE },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512.png'));

  console.log(`✓ icon-maskable-512.png (${size}×${size})`);
}

async function favicon() {
  const size = 32;
  const inner = 28;
  const resized = await sharp(logoPath).resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  const left = Math.round((size - (resizedMeta.width ?? inner)) / 2);
  const top = Math.round((size - (resizedMeta.height ?? inner)) / 2);

  await sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(path.join(outDir, 'favicon-32.png'));

  console.log('✓ favicon-32.png');
}

await mkdir(outDir, { recursive: true });
await squareIcon(192, { filename: 'icon-192.png' });
await squareIcon(512, { filename: 'icon-512.png' });
await squareIcon(180, { filename: 'apple-touch-icon.png', padding: 0.1 });
await maskableIcon(512);
await favicon();
console.log('Done — icons in public/icons/');
