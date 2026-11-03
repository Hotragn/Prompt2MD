// Re-applies the audio decisions that the workflow's audio passes overwrite.
// `fetch-sfx` rebuilds audio_meta.json from the engine sidecar, which resets
// voice durations to the bare takes, drops word timings, drops the generated
// bed, and starts every effect at its frame's first frame. Run this after any
// audio pass, then run align-words.mjs.
//
//   node .hyperframes/finalize-audio.mjs && node .hyperframes/align-words.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const probe = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
const meta = JSON.parse(readFileSync("audio_meta.json", "utf8"));

// 1. Voices: each line's designed slot (take + trailing breath) is the padded file on disk.
for (const v of meta.voices) {
  const raw = `.hyperframes/voice-raw/${String(v.frame).padStart(2, "0")}.wav`;
  v.take_s = Number(probe(raw).toFixed(3));
  v.duration_s = Number(probe(v.path).toFixed(3));
}
meta.total_duration_s = Number(meta.voices.reduce((s, v) => s + v.duration_s, 0).toFixed(3));

// 2. The bed: MusicGen output, extended to 33 s on a beat-aligned splice
//    (.hyperframes/bgm-musicgen-raw.wav is the untouched take). 0.22 sits it
//    around -31 LUFS under the voice, the level the media-use docs recommend.
meta.bgm = { path: "assets/bgm/track.wav", volume: 0.22, mode: "generate", provider: "musicgen", duration_s: Number(probe("assets/bgm/track.wav").toFixed(3)) };
meta.bgm_pending = false;
meta.bgm_provider = "musicgen";

// 3. Effects: each cue lands on its storyboard moment (frame-local seconds).
const CUES = {
  1: [["typing", 0.05, 0.2]],
  2: [["whoosh-cinematic", 0.0, 0.28], ["chime", 0.95, 0.24]],
  3: [["click-soft", 1.15, 0.34], ["whoosh-short", 2.2, 0.22]],
  4: [["ping", 2.5, 0.24]],
  5: [["whoosh-short", 0.82, 0.22], ["ping", 3.0, 0.2]],
  6: [["click", 0.62, 0.28], ["whoosh-short", 1.5, 0.22]],
  7: [["typing", 0.3, 0.2], ["key-press", 1.45, 0.34], ["chime", 3.1, 0.3]],
  8: [["pop", 0.95, 0.18], ["pop", 1.65, 0.18], ["pop", 2.3, 0.16], ["pop", 2.95, 0.18]],
  9: [["whoosh-cinematic", 0.0, 0.2], ["chime", 1.85, 0.3]],
};
const fileFor = (name) => `assets/sfx/${name}.mp3`;
const sfx = [];
for (const [frame, cues] of Object.entries(CUES)) {
  for (const [name, offset, volume] of cues) {
    const file = fileFor(name);
    sfx.push({ frame: Number(frame), file, offset_s: offset, duration_s: Number(probe(file).toFixed(3)), volume });
  }
}
meta.sfx = sfx;
writeFileSync("audio_meta.json", JSON.stringify(meta, null, 2));
console.log(`voices ${meta.voices.length} (total ${meta.total_duration_s}s) · bgm ${meta.bgm.duration_s}s @${meta.bgm.volume} · sfx ${sfx.length} cues`);
