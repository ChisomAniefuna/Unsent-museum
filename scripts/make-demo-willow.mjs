// DEMO-ONLY stand-in particle data for the Willow of Grief canvas shader.
//
// The real artwork's imagery is baked into the prototype HTML (~620KB of base64)
// and must be lifted out with scripts/extract-willow-particles.mjs. This script
// instead SYNTHESIZES a rough willow/face/figure/shoot scene so the animation can
// be seen running locally (dissolve, tears, ripples, regrowth) before that data
// step. It writes the same JSON the component reads. Do not commit its output as
// the real data — it is a placeholder for screenshots/local preview only.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/imports/willow-grief-particles.json");

const W = 420, H = 475;
// anchors the component cares about: eye (tears) 285,218 · figure (ripples) 320,413 · shoot 95,408
const hx = [], hy = [], cr = [], cg = [], cb = [], tag = [], rb = [];
const rnd = (a, b) => a + Math.random() * (b - a);

function push(x, y, r, g, b, t) {
  if (x < 1 || x > W - 2 || y < 1 || y > H - 2) return;
  hx.push(Math.round(x));
  hy.push(Math.max(0, Math.round(y - 18))); // component deposits at hy+18
  cr.push(r | 0); cg.push(g | 0); cb.push(b | 0); tag.push(t);
  rb.push((Math.random() * 256) | 0);
}

// ---- head / grieving profile (interior=0, rim=1) centered near the eye ----
const HX = 272, HY = 196, RX = 58, RY = 74;
for (let i = 0; i < 11000; i++) {
  const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
  const x = HX + Math.cos(a) * RX * rr, y = HY + Math.sin(a) * RY * rr;
  const edge = rr > 0.82;
  const ink = edge ? rnd(28, 52) : rnd(8, 26);
  push(x, y, ink, ink, ink + 6, edge ? 1 : 0);
}
// a darker "eye" hollow near 285,205 so tears read as coming from the eye
for (let i = 0; i < 500; i++) push(285 + rnd(-6, 6), 206 + rnd(-4, 4), rnd(70, 95), rnd(70, 95), rnd(75, 100), 0);

// ---- body / trunk falling from the head, widening like a dress/willow trunk ----
for (let i = 0; i < 9000; i++) {
  const t = Math.random();
  const y = 250 + t * 215;
  const w = 30 + t * 70;
  const cxs = HX - 6 + Math.sin(t * 2.2) * 10;
  const x = cxs + rnd(-w, w);
  const edge = Math.abs(x - cxs) > w * 0.8;
  const ink = edge ? rnd(26, 48) : rnd(6, 22);
  push(x, y, ink, ink, ink + 5, edge ? 1 : 0);
}

// ---- willow branches sweeping up & left, with leaf clusters (all shed: tag 1) ----
const BR = [
  { ang: -2.5, len: 230 }, { ang: -2.2, len: 200 }, { ang: -1.95, len: 250 },
  { ang: -1.7, len: 180 }, { ang: -2.75, len: 210 }, { ang: -1.5, len: 150 },
];
for (const b of BR) {
  const x0 = HX + rnd(-20, 30), y0 = HY - 50 + rnd(-10, 10);
  const steps = 90;
  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const curl = Math.sin(t * 3) * 28;
    const x = x0 + Math.cos(b.ang) * b.len * t + curl;
    const y = y0 + Math.sin(b.ang) * b.len * t + Math.sin(t * 5) * 10;
    for (let k = 0; k < 3; k++) push(x + rnd(-2, 2), y + rnd(-2, 2), rnd(18, 40), rnd(18, 40), rnd(22, 46), 1);
    if (Math.random() < 0.5) { // leaf cluster
      for (let k = 0; k < 10; k++) push(x + rnd(-7, 7), y + rnd(-7, 7), rnd(20, 55), rnd(28, 70), rnd(20, 50), 1);
    }
  }
}

// ---- seated, huddled figure near the ripple anchor (tag 4: trembles, stays dark) ----
for (let i = 0; i < 2600; i++) {
  const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random());
  // back hump + bowed head
  let x = 320 + Math.cos(a) * 17 * rr;
  let y = 408 + Math.sin(a) * 14 * rr;
  if (Math.random() < 0.35) { x = 315 + rnd(-7, 7); y = 392 + rnd(-6, 6); } // head
  push(x, y, rnd(10, 30), rnd(10, 30), rnd(12, 34), 4);
}

// ---- green shoot lower-left (tag 3: green→brown→green regrowth) ----
for (let i = 0; i < 500; i++) push(95 + rnd(-1.5, 1.5), 440 - i * 0.07 + rnd(-1, 1), 40, 160, 40, 3); // stem
for (const lf of [[-9, 412, -0.7], [9, 408, 0.7], [-6, 398, -0.5]]) {
  for (let i = 0; i < 160; i++) {
    const t = i / 160; const x = 95 + lf[0] * t + Math.cos(lf[2]) * t * 6; const y = lf[1] - t * 10;
    push(x, y, 40, 170, 40, 3);
  }
}

// ---- faint drifting dust (tag 5) ----
for (let i = 0; i < 1500; i++) push(rnd(10, W - 10), rnd(20, H - 20), rnd(30, 60), rnd(30, 60), rnd(34, 66), 5);

// ---- encode ----
const u16 = (arr) => Buffer.from(new Uint16Array(arr).buffer).toString("base64");
const u8 = (arr) => Buffer.from(Uint8Array.from(arr)).toString("base64");
const json = {
  hx: u16(hx), hy: u16(hy),
  cr: u8(cr), cg: u8(cg), cb: u8(cb), tag: u8(tag), rb: u8(rb),
  _demo: "Synthetic stand-in scene (scripts/make-demo-willow.mjs). Replace with real data via scripts/extract-willow-particles.mjs.",
};
writeFileSync(OUT, JSON.stringify(json));
console.log(`wrote ${hx.length} demo particles -> ${OUT}`);
