import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'build/icon.svg'), 'utf-8');

const sizes = [16, 32, 64, 128, 256, 512, 1024];

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  writeFileSync(join(root, `build/icon-${size}.png`), png);
  console.log(`✓ build/icon-${size}.png`);
}

// Also write the main icon.png at 1024 for electron-builder
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  font: { loadSystemFonts: false },
});
writeFileSync(join(root, 'build/icon.png'), resvg.render().asPng());
console.log('✓ build/icon.png (1024×1024 — used by electron-builder)');
