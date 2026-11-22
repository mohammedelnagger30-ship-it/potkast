import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brand = resolve(root, 'public/brand');
const res = resolve(root, 'android/app/src/main/res');

function render(source, target, size) {
  const svg = readFileSync(source);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  }).render().asPng();
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, png);
  console.log(`${target.slice(root.length + 1)}  ${size}x${size}`);
}

const icon = resolve(brand, 'sada-icon.svg');
const roundIcon = resolve(brand, 'sada-icon-round.svg');
const foreground = resolve(brand, 'sada-foreground.svg');

// Web / PWA
render(icon, resolve(root, 'public/icon-512.png'), 512);
render(icon, resolve(root, 'public/icon-192.png'), 192);
render(icon, resolve(root, 'public/apple-touch-icon.png'), 180);

// Android legacy launcher icons (48dp baseline)
for (const [folder, size] of Object.entries({
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
})) {
  render(icon, resolve(res, folder, 'ic_launcher.png'), size);
  render(roundIcon, resolve(res, folder, 'ic_launcher_round.png'), size);
}

// Android adaptive icon foreground (108dp baseline)
for (const [folder, size] of Object.entries({
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
})) {
  render(foreground, resolve(res, folder, 'ic_launcher_foreground.png'), size);
}
