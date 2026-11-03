// The launch video's score and sound effects, synthesized as one piece: one
// key (D major), one tempo grid (120 BPM, so bars land on even seconds), one
// reverb space. Nothing is sampled, so there is no licence to check.
//
// Cue times come from the video's own timeline (the T object in
// ../composition/vertical.html), so picture and sound cannot drift apart.
//
//   node synth.mjs            -> score.wav (full mix), stem-music.wav, stem-sfx.wav

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "composition", "vertical.html"), "utf8");
const lit = /const T = (\{[\s\S]*?\});/.exec(html);
if (lit === null) throw new Error("timeline T not found in vertical.html");
const T = Function(`"use strict"; return (${lit[1]});`)();

const PROMPT_LEN = 597;
const CMD_LEN = 'prompt2md retrieve "p2md:src=c6199e0698ecc214#2874-3278"'.length;

const SR = 48000;
const DUR = 20.0;
const N = Math.round(SR * DUR);
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- buses
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const music = bus();
const sfx = bus();
const verbSend = bus();
const delaySend = bus();
const duck = new Float32Array(N).fill(1); // sidechain gain, written by the kick

// ---------------------------------------------------------------- helpers
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const idx = (t) => Math.round(t * SR);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260930);

/** Equal-power pan, -1 left .. 1 right. */
const panGains = (p) => {
  const a = ((p + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};

/** Zero-delay-feedback state-variable filter (Simper). */
class SVF {
  constructor() {
    this.ic1 = 0;
    this.ic2 = 0;
  }
  set(fc, q) {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    this.k = 1 / q;
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  run(x) {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = x - this.k * v1 - v2;
    return v2;
  }
}

function polyblep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Write a mono signal into a bus with pan, gain and effect sends. */
function place(target, start, sig, { gain = 1, pan = 0, verb = 0, delay = 0, ducked = false }) {
  const [gl, gr] = panGains(pan);
  const s0 = idx(start);
  for (let j = 0; j < sig.length; j++) {
    const i = s0 + j;
    if (i < 0 || i >= N) continue;
    const v = sig[j] * gain * (ducked ? duck[i] : 1);
    target.L[i] += v * gl;
    target.R[i] += v * gr;
    if (verb) {
      verbSend.L[i] += v * gl * verb;
      verbSend.R[i] += v * gr * verb;
    }
    if (delay) {
      delaySend.L[i] += v * gl * delay;
      delaySend.R[i] += v * gr * delay;
    }
  }
}

// ---------------------------------------------------------------- instruments

/** Kick: sine with a falling pitch, a soft click, and a sidechain dip. */
function kick(t, vel = 1) {
  const len = Math.round(0.5 * SR);
  const sig = new Float32Array(len);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    const f = 46 + 72 * Math.exp(-s / 0.038);
    ph += (TAU * f) / SR;
    const amp = Math.exp(-s / 0.24) * (1 - Math.exp(-s / 0.0015));
    const click = j < 90 ? (rand() * 2 - 1) * Math.exp(-j / 18) * 0.12 : 0;
    sig[j] = Math.sin(ph) * amp + click;
  }
  place(music, t, sig, { gain: 0.42 * vel, verb: 0.02 });
  const s0 = idx(t);
  for (let j = 0; j < Math.round(0.34 * SR); j++) {
    const i = s0 + j;
    if (i >= N) break;
    const s = j / SR;
    const dip = 0.42 * vel * Math.exp(-s / 0.11) * Math.min(1, s / 0.004);
    duck[i] = Math.min(duck[i], 1 - dip);
  }
}

/** Soft clap: three filtered noise bursts a few ms apart, mostly in the room. */
function clap(t, vel = 1) {
  const len = Math.round(0.3 * SR);
  const sig = new Float32Array(len);
  const f = new SVF();
  f.set(1500, 1.1);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    let env = 0;
    for (const off of [0, 0.009, 0.019]) if (s >= off) env += Math.exp(-(s - off) / (off === 0.019 ? 0.085 : 0.012));
    f.run((rand() * 2 - 1) * env);
    sig[j] = f.band;
  }
  place(music, t, sig, { gain: 0.16 * vel, pan: 0.05, verb: 0.35 });
}

/** Closed hat: very short high-passed noise. */
function hat(t, vel = 1, pan = 0.25) {
  const len = Math.round(0.06 * SR);
  const sig = new Float32Array(len);
  const f = new SVF();
  f.set(8200, 0.8);
  for (let j = 0; j < len; j++) {
    f.run(rand() * 2 - 1);
    sig[j] = f.high * Math.exp(-j / SR / 0.022);
  }
  place(music, t, sig, { gain: 0.05 * vel, pan, verb: 0.08 });
}

/** Warm pad: three detuned band-limited saws per note, low-passed, slow envelope. */
function pad(notes, t0, t1, { gain = 1, cut0 = 700, cut1 = 1300, attack = 0.6, release = 1.1 } = {}) {
  const len = Math.round((t1 - t0 + release) * SR);
  const outL = new Float32Array(len);
  const outR = new Float32Array(len);
  for (const n of notes) {
    const f0 = midi(n);
    const det = [-0.08, 0, 0.08].map((c) => f0 * Math.pow(2, c / 12));
    const ph = det.map(() => rand());
    const fl = new SVF();
    const fr = new SVF();
    for (let j = 0; j < len; j++) {
      const s = j / SR;
      if (j % 64 === 0) {
        const k = Math.min(1, s / Math.max(0.001, t1 - t0));
        const fc = cut0 + (cut1 - cut0) * k;
        fl.set(fc, 0.62);
        fr.set(fc * 1.04, 0.62);
      }
      let v = [0, 0, 0];
      for (let o = 0; o < 3; o++) {
        const dt = det[o] / SR;
        ph[o] += dt;
        if (ph[o] >= 1) ph[o] -= 1;
        v[o] = 2 * ph[o] - 1 - polyblep(ph[o], dt);
      }
      let env;
      if (s < attack) env = Math.sin((Math.PI / 2) * (s / attack)) ** 2;
      else if (s < t1 - t0) env = 1;
      else env = Math.exp(-(s - (t1 - t0)) / (release / 3.2));
      const l = fl.run(v[0] * 0.8 + v[1] * 0.55);
      const r = fr.run(v[2] * 0.8 + v[1] * 0.55);
      outL[j] += l * env;
      outR[j] += r * env;
    }
  }
  const s0 = idx(t0);
  const g = (0.05 * gain) / Math.sqrt(notes.length);
  for (let j = 0; j < len; j++) {
    const i = s0 + j;
    if (i < 0 || i >= N) continue;
    const d = 0.55 + 0.45 * duck[i];
    music.L[i] += outL[j] * g * d;
    music.R[i] += outR[j] * g * d;
    verbSend.L[i] += outL[j] * g * 0.3;
    verbSend.R[i] += outR[j] * g * 0.3;
  }
}

/** Mallet pluck: a sine with a quick second partial and a tiny bright strike. */
function pluck(n, t, { gain = 1, pan = 0, decay = 0.3, verb = 0.25, delay = 0.22, target = music } = {}) {
  const f = midi(n);
  const len = Math.round(decay * 7 * SR);
  const sig = new Float32Array(len);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    const env = (1 - Math.exp(-s / 0.0025)) * Math.exp(-s / decay);
    sig[j] =
      env *
      (Math.sin(TAU * f * s) +
        0.22 * Math.exp(-s / (decay * 0.35)) * Math.sin(TAU * 2 * f * s) +
        0.05 * Math.exp(-s / 0.018) * Math.sin(TAU * 4.1 * f * s));
  }
  place(target, t, sig, { gain: 0.085 * gain, pan, verb, delay });
}

/** Sub bass: sine plus a little second harmonic, ducked under the kick. */
function bass(n, t, dur, vel = 1) {
  const f = midi(n);
  const len = Math.round((dur + 0.2) * SR);
  const sig = new Float32Array(len);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    const env = Math.min(1, s / 0.012) * (s < dur ? 1 : Math.exp(-(s - dur) / 0.06));
    sig[j] = env * (Math.sin(TAU * f * s) + 0.16 * Math.sin(TAU * 2 * f * s + 0.4));
  }
  place(music, t, sig, { gain: 0.25 * vel, ducked: true });
}

/** FM bell for the three payoffs, tuned to the chord underneath. */
function bell(n, t, { gain = 1, pan = 0, ratio = 3.5, index = 1.1, decay = 1.5, target = sfx } = {}) {
  const f = midi(n);
  const len = Math.round(decay * 5 * SR);
  const sig = new Float32Array(len);
  // Low-passed so the upper FM sidebands (10-20 kHz in the first mix) stay soft.
  const lp = new SVF();
  lp.set(6800, 0.6);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    const env = (1 - Math.exp(-s / 0.002)) * Math.exp(-s / decay);
    const I = index * Math.exp(-s / 0.32);
    sig[j] = lp.run(env * Math.sin(TAU * f * s + I * Math.sin(TAU * f * ratio * s)));
  }
  place(target, t, sig, { gain: 0.09 * gain, pan, verb: 0.45, delay: 0.12 });
}

/** Paper: band-passed noise swept across the fold, with fibre crackle riding on it. */
function paper(t0, dur, { gain = 1, pan = 0, f0 = 1800, f1 = 4200, crackle = 1 } = {}) {
  const len = Math.round((dur + 0.15) * SR);
  const sig = new Float32Array(len);
  const bp = new SVF();
  const hp = new SVF();
  hp.set(3800, 0.7);
  // Paper has air, not hiss: everything above ~8 kHz is rolled off (the first
  // mix sprayed noise to 24 kHz here).
  const lp1 = new SVF();
  const lp2 = new SVF();
  lp1.set(8000, 0.6);
  lp2.set(8000, 0.6);
  let imp = 0;
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    const x = Math.min(1, s / dur);
    if (j % 32 === 0) bp.set(f0 * Math.pow(f1 / f0, x), 0.85);
    const shape = s < dur ? Math.pow(Math.sin(Math.PI * Math.pow(x, 0.7)), 1.4) : 0;
    bp.run((rand() * 2 - 1) * shape);
    if (rand() < (90 * crackle) / SR) imp = (rand() * 2 - 1) * 0.9;
    hp.run(imp);
    imp *= 0.6;
    sig[j] = lp2.run(lp1.run(bp.band * 0.9 + hp.high * shape * 0.5));
  }
  place(sfx, t0, sig, { gain: 0.2 * gain, pan, verb: 0.22 });
}

/** A crease: the soft low thump when a fold closes. */
function crease(t, gain = 1) {
  const len = Math.round(0.14 * SR);
  const sig = new Float32Array(len);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    sig[j] = Math.sin(TAU * (92 + 40 * Math.exp(-s / 0.02)) * s) * Math.exp(-s / 0.045) * Math.min(1, s / 0.002);
  }
  place(sfx, t, sig, { gain: 0.18 * gain, verb: 0.1 });
}

/** Key click: a short noisy tick with a small resonant body. */
function key(t, { gain = 1, pan = 0, body = 2600 } = {}) {
  const len = Math.round(0.03 * SR);
  const sig = new Float32Array(len);
  const f = new SVF();
  f.set(body, 2.2);
  const lp = new SVF();
  lp.set(9000, 0.6);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    f.run((rand() * 2 - 1) * Math.exp(-s / 0.0035));
    sig[j] = lp.run(f.band + 0.3 * Math.sin(TAU * 5200 * s) * Math.exp(-s / 0.002));
  }
  place(sfx, t, sig, { gain: 0.12 * gain, pan, verb: 0.06 });
}

/** Button: a rounded "tock" for the press, a lighter one for the release. */
function tock(t, { gain = 1, f = 1250 } = {}) {
  const len = Math.round(0.06 * SR);
  const sig = new Float32Array(len);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    sig[j] = Math.sin(TAU * f * (1 - 0.3 * Math.min(1, s / 0.02)) * s) * Math.exp(-s / 0.012) * Math.min(1, s / 0.0008);
  }
  place(sfx, t, sig, { gain: 0.16 * gain, verb: 0.1 });
}

/** Counter blip, pitched on the scale so it belongs to the music. */
function blip(n, t, gain = 1) {
  const f = midi(n);
  const len = Math.round(0.08 * SR);
  const sig = new Float32Array(len);
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    sig[j] = Math.sin(TAU * f * s) * Math.exp(-s / 0.022) * Math.min(1, s / 0.001);
  }
  place(sfx, t, sig, { gain: 0.15 * gain, pan: 0.1, verb: 0.2 });
}

/** Air swell: noise opening up into a downbeat. */
function swell(t0, t1, { gain = 1, f0 = 600, f1 = 5200 } = {}) {
  const dur = t1 - t0;
  const len = Math.round((dur + 0.05) * SR);
  const sig = new Float32Array(len);
  const bp = new SVF();
  for (let j = 0; j < len; j++) {
    const s = j / SR;
    const x = Math.min(1, s / dur);
    if (j % 32 === 0) bp.set(f0 * Math.pow(f1 / f0, x), 1.2);
    const env = s < dur ? x * x : Math.exp(-(s - dur) / 0.01);
    bp.run((rand() * 2 - 1) * env);
    sig[j] = bp.band;
  }
  place(music, t0, sig, { gain: 0.07 * gain, verb: 0.4 });
}

// ---------------------------------------------------------------- the score
// Bars are 2 s. Chords: Dmaj9 | D | Bm7 | Gmaj7 | Em7 | Gmaj9 | Asus4 A | D | Gmaj7/D | D
const BAR = 2;
const CHORDS = [
  [50, 57, 61, 64, 66],
  [50, 57, 64, 66],
  [47, 54, 57, 62],
  [43, 50, 54, 59],
  [52, 55, 59, 62],
  [43, 47, 54, 57],
  [45, 50, 52, 57],
  [50, 57, 62, 64, 66],
  [50, 55, 59, 66],
  [50, 57, 62, 66],
];
const ROOTS = [null, 38, 35, 31, 40, 31, 33, 38, 38, 38];

// Pad: fades up under the hook, opens on the fold, resolves wide at the outro.
CHORDS.forEach((c, b) => {
  const t0 = b * BAR - (b === 0 ? 0 : 0.06);
  const t1 = b === 9 ? 19.2 : (b + 1) * BAR;
  const opts = {
    gain: b === 0 ? 2.1 : b >= 7 ? 1.15 : 1,
    cut0: b === 0 ? 420 : 760,
    cut1: b === 0 ? 900 : b >= 7 ? 1650 : 1300,
    attack: b === 0 ? 0.35 : 0.5,
    release: b === 9 ? 0.8 : 1.0,
  };
  pad(c, t0, t1, opts);
  // Bar 6 is a suspension: D falls to C# half way through.
  if (b === 6) pad([49], 13.0, 14.0, { gain: 0.55, cut0: 900, cut1: 1300, attack: 0.3 });
});

// Arpeggio: eighth notes over the chord, an octave above the pad, from the drop.
const arpFor = (chord) => {
  const tones = [...new Set(chord.map((n) => { let m = n; while (m < 71) m += 12; while (m > 86) m -= 12; return m; }))].sort((a, b) => a - b);
  const p = [0, 2, 1, 3, 2, 1, 3, 2];
  return p.map((i) => tones[i % tones.length]);
};
for (let b = 1; b <= 8; b++) {
  const notes = arpFor(CHORDS[b]);
  for (let s = 0; s < 8; s++) {
    const t = b * BAR + s * 0.25;
    if (b === 8 && s % 2 === 1) continue; // outro thins out
    if (b === 4 && s >= 6) continue; // breath before the terminal
    const accent = s % 4 === 0 ? 1 : 0.72;
    const fadeOut = b === 8 ? 0.7 - s * 0.06 : 1;
    pluck(notes[s], t, { gain: accent * fadeOut, pan: s % 2 === 0 ? -0.28 : 0.28, decay: 0.26 });
  }
}

// Bass: two half notes a bar, then one long note that rings out the end.
for (let b = 1; b <= 8; b++) {
  const r = ROOTS[b];
  bass(r, b * BAR, 0.92, b === 4 ? 0.8 : 1);
  if (b !== 4 && b !== 8) bass(r, b * BAR + 1.0, 0.88, 0.9);
}
bass(38, 9 * BAR, 1.1, 0.75);

// Drums: half-time. Kick on 1 and 3 from the drop, a breath at the scene change.
for (let b = 1; b <= 8; b++) {
  kick(b * BAR, b === 7 ? 1.1 : 1);
  if (b !== 4 && b !== 8) kick(b * BAR + 1.0, 0.85);
}
for (const b of [2, 3, 5, 6]) clap(b * BAR + 1.0, b === 6 ? 1 : 0.85);
for (let b = 2; b <= 7; b++) {
  for (let e = 0; e < 4; e++) {
    if (b === 4 && e % 2 === 1) continue;
    hat(b * BAR + 0.25 + e * 0.5, 0.75 + 0.25 * rand(), e % 2 === 0 ? 0.3 : -0.2);
  }
}

// Air into the drop and into the outro.
swell(1.25, 2.0, { gain: 0.9 });
swell(13.3, 14.0, { gain: 1.1, f0: 500, f1: 4800 });

// ---------------------------------------------------------------- sound effects

// Hook: the prompt streams in, a soft tick stream rather than one click per character.
{
  const chars = PROMPT_LEN;
  const perSec = chars / (T.typeB - T.typeA);
  const every = Math.ceil(perSec / 26);
  for (let c = 0; c < chars; c += every) {
    const t = T.typeA + c / perSec + (rand() - 0.5) * 0.006;
    key(t, { gain: 0.8 + 0.5 * rand(), pan: (rand() - 0.5) * 0.5, body: 2400 + rand() * 1200 });
  }
}

// Fold it: press, release.
tock(T.press, { gain: 2, f: 1180 });
tock(T.press + 0.1, { gain: 0.9, f: 1600 });

// The prompt folds shut, the Markdown opens out on the downbeat.
paper(T.foldA, T.foldB - T.foldA, { gain: 1, pan: -0.1, f0: 1600, f1: 4000 });
crease(T.foldB - 0.03, 0.8);
paper(T.unfoldA + 0.02, T.unfoldB - T.unfoldA, { gain: 1.4, pan: 0.1, f0: 4200, f1: 1900, crackle: 0.7 });

// Ledger: numbers count on the scale, then the share lands on a bell.
{
  const scale = [74, 76, 78, 81, 83, 86, 88, 90];
  const n = 9;
  for (let i = 0; i < n; i++) blip(scale[Math.min(scale.length - 1, Math.floor((i / n) * scale.length))], T.ledgerA + i * 0.06, 0.6 + 0.04 * i);
  bell(81, T.ledgerA + 0.58, { gain: 1.1, pan: 0.15 });
  bell(86, T.ledgerA + 0.62, { gain: 0.75, pan: -0.15 });
}

// Scene 1 leaves as a sheet.
paper(T.exitA, 0.44, { gain: 1.0, f0: 2000, f1: 4600, crackle: 0.6 });

// Scene 2: the doc opens, the anchor lights, the command is typed.
paper(T.docUnfoldA, T.docUnfoldB - T.docUnfoldA, { gain: 0.8, pan: -0.15, f0: 4000, f1: 2000, crackle: 0.5 });
blip(86, T.anchorA, 0.9);
{
  const per = (T.cmdB - T.cmdA) / CMD_LEN;
  for (let c = 0; c < CMD_LEN; c++) {
    key(T.cmdA + c * per + (rand() - 0.5) * per * 0.35, { gain: 1.2 + 0.6 * rand(), pan: (rand() - 0.5) * 0.3, body: 2100 + rand() * 900 });
  }
}
key(T.enter, { gain: 2.6, body: 1500 });
tock(T.enter + 0.004, { gain: 0.8, f: 700 });

// The original unfolds, the key finding lights, byte-exact rings.
paper(T.retA, T.retB - T.retA, { gain: 1.1, pan: 0.12, f0: 4200, f1: 1800, crackle: 0.8 });
blip(88, T.hitA, 0.8);
bell(76, T.exactA, { gain: 1.1, pan: -0.1 });
bell(81, T.exactA + 0.05, { gain: 0.8, pan: 0.1 });

// Scene 2 folds away into the outro.
paper(T.exit2A + 0.1, 0.48, { gain: 0.8, f0: 1900, f1: 4400, crackle: 0.6 });

// Outro: the lockup chimes, each tool gets a note, the URL a last bell.
bell(74, T.lockA, { gain: 0.9, pan: -0.2, decay: 1.9 });
bell(78, T.lockA + 0.05, { gain: 0.7, pan: 0, decay: 1.9 });
bell(81, T.lockA + 0.1, { gain: 0.6, pan: 0.2, decay: 1.9 });
[74, 76, 78, 81, 83, 86, 88].forEach((n, i) =>
  pluck(n, T.toolsA + i * 0.13, { gain: 0.6, pan: -0.3 + i * 0.1, decay: 0.22, target: sfx, delay: 0.1 }),
);
bell(86, T.urlA, { gain: 0.55, pan: 0.05, decay: 2.2 });

// ---------------------------------------------------------------- effects

/** Stereo ping-pong delay, dotted eighth, darkened on each repeat. */
function pingPong(src, time = 0.375, fb = 0.34) {
  const d = Math.round(time * SR);
  const out = bus();
  const lpL = new SVF();
  const lpR = new SVF();
  lpL.set(3200, 0.7);
  lpR.set(3200, 0.7);
  for (let i = 0; i < N; i++) {
    const inL = src.L[i];
    const inR = src.R[i];
    const tapL = i >= d ? out.L[i - d] : 0;
    const tapR = i >= d ? out.R[i - d] : 0;
    out.L[i] = lpL.run(inR * 0.0 + inL + tapR * fb);
    out.R[i] = lpR.run(tapL * fb + inR * 0.35);
  }
  return out;
}

/** Freeverb: eight damped combs and four allpasses per side. */
function freeverb(src, { room = 0.84, damp = 0.4, width = 1 } = {}) {
  const scale = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const spread = 23;
  const fb = room * 0.28 + 0.7;
  const dmp = damp * 0.4;
  const make = (off) => ({
    combs: combT.map((c) => ({ buf: new Float32Array(Math.round((c + off) * scale)), i: 0, store: 0 })),
    aps: apT.map((a) => ({ buf: new Float32Array(Math.round((a + off) * scale)), i: 0 })),
  });
  const sides = [make(0), make(spread)];
  const out = bus();
  // Pre-delay keeps transients clear of their own tail.
  const pre = Math.round(0.018 * SR);
  for (let i = 0; i < N; i++) {
    const x = ((i >= pre ? src.L[i - pre] + src.R[i - pre] : 0) * 0.5) * 0.015 * 2;
    const res = [0, 0];
    for (let s = 0; s < 2; s++) {
      const side = sides[s];
      let acc = 0;
      for (const c of side.combs) {
        const y = c.buf[c.i];
        c.store = y * (1 - dmp) + c.store * dmp;
        c.buf[c.i] = x + c.store * fb;
        if (++c.i >= c.buf.length) c.i = 0;
        acc += y;
      }
      for (const a of side.aps) {
        const b = a.buf[a.i];
        const y = -acc + b;
        a.buf[a.i] = acc + b * 0.5;
        if (++a.i >= a.buf.length) a.i = 0;
        acc = y;
      }
      res[s] = acc;
    }
    const wet1 = (width / 2 + 0.5), wet2 = (1 - width) / 2;
    out.L[i] = res[0] * wet1 + res[1] * wet2;
    out.R[i] = res[1] * wet1 + res[0] * wet2;
  }
  return out;
}

const delayed = pingPong(delaySend);
// The delay repeats also live in the room.
for (let i = 0; i < N; i++) {
  verbSend.L[i] += delayed.L[i] * 0.4;
  verbSend.R[i] += delayed.R[i] * 0.4;
}
const verb = freeverb(verbSend, { room: 0.86, damp: 0.42 });

// ---------------------------------------------------------------- mixdown
const VERB_RETURN = 0.9;
const DELAY_RETURN = 0.55;
const mix = bus();
const musicStem = bus();
const sfxStem = bus();
for (let i = 0; i < N; i++) {
  musicStem.L[i] = music.L[i] + delayed.L[i] * DELAY_RETURN;
  musicStem.R[i] = music.R[i] + delayed.R[i] * DELAY_RETURN;
  sfxStem.L[i] = sfx.L[i];
  sfxStem.R[i] = sfx.R[i];
  mix.L[i] = musicStem.L[i] + sfxStem.L[i] + verb.L[i] * VERB_RETURN;
  mix.R[i] = musicStem.R[i] + sfxStem.R[i] + verb.R[i] * VERB_RETURN;
}

// Gentle glue: RMS compressor, 2:1 above -20 dBFS, then a soft ceiling.
function master(b) {
  let env = 0;
  const att = Math.exp(-1 / (0.012 * SR));
  const rel = Math.exp(-1 / (0.18 * SR));
  const thr = Math.pow(10, -20 / 20);
  for (let i = 0; i < N; i++) {
    const p = (b.L[i] * b.L[i] + b.R[i] * b.R[i]) * 0.5;
    env = p > env ? att * env + (1 - att) * p : rel * env + (1 - rel) * p;
    const lvl = Math.sqrt(env);
    const g = lvl > thr ? Math.pow(lvl / thr, 1 / 2 - 1) : 1;
    b.L[i] = Math.tanh(b.L[i] * g * 1.1) / 1.1;
    b.R[i] = Math.tanh(b.R[i] * g * 1.1) / 1.1;
  }
  // Fade the last 0.6 s so the ring-out ends in true silence.
  const f0 = idx(DUR - 0.6);
  for (let i = f0; i < N; i++) {
    const k = 1 - (i - f0) / (N - f0);
    b.L[i] *= k * k;
    b.R[i] *= k * k;
  }
}
master(mix);

function writeWav(file, b, fixedNorm) {
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(b.L[i]), Math.abs(b.R[i]));
  // Mix: -1 dBFS peak (loudness is set later by ffmpeg). Stems: the mix's own
  // gain, so their relative levels can be measured against each other.
  const norm = fixedNorm ?? (peak > 0 ? 0.89 / peak : 1);
  const data = Buffer.alloc(N * 2 * 4);
  for (let i = 0; i < N; i++) {
    data.writeFloatLE(b.L[i] * norm, i * 8);
    data.writeFloatLE(b.R[i] * norm, i * 8 + 4);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20); // IEEE float
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 8, 28);
  h.writeUInt16LE(8, 32);
  h.writeUInt16LE(32, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
  return { file, peakDb: 20 * Math.log10(peak), norm };
}

const main = writeWav(join(here, "score.wav"), mix);
console.log(main);
console.log(writeWav(join(here, "stem-music.wav"), musicStem, main.norm));
console.log(writeWav(join(here, "stem-sfx.wav"), sfxStem, main.norm));
