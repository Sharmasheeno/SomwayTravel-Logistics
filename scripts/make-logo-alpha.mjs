/**
 * The supplied SomWay primary logo ships on a solid black plate (no alpha), so it
 * renders as a visible black box on the navy sidebar and public nav. This derives a
 * transparent-background copy by keying out the near-black plate. The original asset
 * is left untouched.
 */
import sharp from "sharp";

const SRC = "public/somway-primary-logo.png";
const OUT = "public/somway-primary-logo-alpha.png";

const image = sharp(SRC).ensureAlpha();
const { width, height } = await image.metadata();
const raw = await image.raw().toBuffer();

// Luma below FLOOR is fully transparent; above CEIL fully opaque; linear ramp between
// so anti-aliased glyph edges stay smooth instead of turning crunchy.
const FLOOR = 12;
const CEIL = 52;
let cleared = 0;

for (let i = 0; i < raw.length; i += 4) {
  const luma = 0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2];
  if (luma <= FLOOR) {
    raw[i + 3] = 0;
    cleared++;
  } else if (luma < CEIL) {
    raw[i + 3] = Math.round(((luma - FLOOR) / (CEIL - FLOOR)) * 255);
  }
}

await sharp(raw, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(
  `${OUT}: ${width}x${height}, ${((cleared / (width * height)) * 100).toFixed(1)}% of pixels made transparent`,
);
