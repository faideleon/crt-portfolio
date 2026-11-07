// Pre-dithers portfolio screenshots into the retro palette (run: npm run dither).
// Input: assets-src/*.png  →  Output: public/img/dithered/*.png
// Images are dithered at half display size and shown with `image-rendering: pixelated`,
// so each dither dot reads as a chunky 2x2 pixel, like an old monitor.
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as iq from 'image-q';

const SRC = 'assets-src';
const OUT = 'public/img/dithered';
const MAX_W = 420;
const MAX_H = 420;

// Retro palette: ink, deep teal, teal, pale teal, beige, cream, coral, mustard.
const PALETTE = ['#2b2420', '#2f5d5a', '#5e8f8a', '#a9c9c2', '#d9cdb0', '#f6ecd6', '#e8735a', '#e9b949'];

const palette = new iq.utils.Palette();
for (const hex of PALETTE) {
  const n = parseInt(hex.slice(1), 16);
  palette.add(iq.utils.Point.createByRGBA((n >> 16) & 255, (n >> 8) & 255, n & 255, 255));
}

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

for (const file of files) {
  const { data, info } = await sharp(path.join(SRC, file))
    .resize(MAX_W, MAX_H, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#f6ecd6' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const points = iq.utils.PointContainer.fromUint8Array(new Uint8Array(data), info.width, info.height);
  const out = iq.applyPaletteSync(points, palette, {
    colorDistanceFormula: 'euclidean-bt709',
    imageQuantization: 'atkinson',
  });

  const name = path.parse(file).name + '.png';
  await sharp(Buffer.from(out.toUint8Array()), { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ palette: true, colors: PALETTE.length })
    .toFile(path.join(OUT, name));
  console.log(`dithered ${file} → ${OUT}/${name} (${info.width}x${info.height})`);
}
