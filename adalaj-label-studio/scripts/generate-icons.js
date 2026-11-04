import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = fs.readFileSync(path.resolve('./public/icon.svg'));

async function generate() {
  await sharp(svgBuffer).resize(192, 192).png().toFile('./public/pwa-192x192.png');
  await sharp(svgBuffer).resize(512, 512).png().toFile('./public/pwa-512x512.png');
  await sharp(svgBuffer).resize(180, 180).png().toFile('./public/apple-touch-icon.png');
  
  // Maskable icon with 15% safe padding
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#18181b'
    })
    .png()
    .toFile('./public/pwa-maskable-512x512.png');

  console.log('PWA icons generated successfully in /public');
}

generate().catch(console.error);
