// One-time data step for the Willow of Grief canvas shader.
//
// The willow piece is a Canvas2D particle artwork whose imagery is baked from a
// reference image into 7 base64 arrays (the same pattern as smoking-particles.json).
// That data lives only inside the standalone prototype HTML, so this script lifts
// it out and writes src/imports/willow-grief-particles.json.
//
// Usage:
//   node scripts/extract-willow-particles.mjs path/to/willow-grief-tree.html
//
// It validates byte lengths against P=52000 (hx/hy are Uint16 => 2*P bytes, the
// rest are Uint8 => P bytes) and fails loudly if an array is truncated.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/imports/willow-grief-particles.json");
const P = 52000;

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error("usage: node scripts/extract-willow-particles.mjs <willow-grief.html>");
  process.exit(1);
}

const html = readFileSync(resolve(process.cwd(), htmlPath), "utf8");

// Each array is declared as `const _<name>=...b64ToBytes("<base64>")...`.
// hx/hy are wrapped in `new Uint16Array(b64ToBytes("..."))`, the rest are plain
// `b64ToBytes("...")`. A single tolerant regex per variable handles both.
const VARS = ["hx", "hy", "cr", "cg", "cb", "tag", "rb"];

function grab(name) {
  const re = new RegExp(`_${name}\\s*=\\s*(?:new\\s+Uint16Array\\()?b64ToBytes\\("([A-Za-z0-9+/=]+)"\\)`);
  const m = html.match(re);
  if (!m) throw new Error(`could not find base64 for _${name}`);
  return m[1];
}

function byteLen(b64) {
  // exact decoded byte length without allocating the buffer
  let len = (b64.length / 4) * 3;
  if (b64.endsWith("==")) len -= 2;
  else if (b64.endsWith("=")) len -= 1;
  return len;
}

const out = {};
const expected = { hx: 2 * P, hy: 2 * P, cr: P, cg: P, cb: P, tag: P, rb: P };
let ok = true;

for (const name of VARS) {
  const b64 = grab(name);
  const bytes = byteLen(b64);
  const want = expected[name];
  const pass = bytes === want;
  ok = ok && pass;
  console.log(`${pass ? "ok " : "BAD"} ${name.padEnd(3)} ${bytes} bytes (expected ${want})`);
  out[name] = b64;
}

if (!ok) {
  console.error("\nByte-length validation failed — the HTML source looks truncated. Aborting.");
  process.exit(2);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(`\nwrote ${OUT}`);
