# The paper fold (shared by 02 · 05 · 06 · 07)

The film's signature move. Four workers build it in four frames, so it is pinned here to one
mechanism, one timing and one shading model: it must feel the same every time it appears.

## Geometry

- Split the sheet (height `H`) into `N` equal horizontal strips, `h = H / N`. Use `N = 6`, or
  `N = 8` when the sheet is taller than 1000 px.
- Each strip is an `overflow: hidden` band of height `h` that holds a copy of the sheet's
  content shifted up by `k × h`, so the flat strips tile the sheet exactly (no seam is visible
  at rest).
- All strips sit at the sheet's top edge inside one 3D stage: `perspective: 2200px`,
  `perspective-origin: 50% 50%` (of the sheet), `transform-style: preserve-3d` on the stage
  and every strip, `transform-origin: 50% 0%` on every strip (its top edge is its hinge).

## Driver (exact, seek-safe)

Tween ONE proxy on the frame's paused timeline and place every strip from it in `onUpdate`
(GSAP calls `onUpdate` on every seek, so this is deterministic):

```js
const fold = { a: 0 };                       // 0 = flat, 1 = folded
const DEG = Math.PI / 180;
function placeStrips() {
  const t = fold.a * 88;                     // θ in degrees (stop short of edge-on)
  const c = Math.cos(t * DEG), s = Math.sin(t * DEG);
  strips.forEach((el, k) => {
    gsap.set(el, {
      y: k * h * c,                          // hinge chain: each top edge sits on the previous bottom edge
      z: k % 2 ? h * s : 0,                  // zigzag toward the viewer
      rotationX: k % 2 ? -t : t,             // alternate mountain / valley
    });
    gsap.set(shade[k], { opacity: s });      // crease light rides the angle
  });
}
placeStrips();
tl.to(fold, { a: 1, duration: 0.7, ease: "power2.inOut", onUpdate: placeStrips }, T_FOLD);
// Unfold (07): the same tween with a 1 → 0, i.e. tl.fromTo(fold, { a: 1 }, { a: 0, ... }).
```

- **Timing:** 0.70 s on `power2.inOut`, every time. No stagger between strips, no overshoot,
  no bounce at the end.
- **Direction:** the hinge at the top folds the sheet UPWARD (the bottom edge rises to the top
  edge). To fold downward, mirror it: hinge at the bottom (`transform-origin: 50% 100%`, chain
  built from the last strip up).
- The folded stack is a thin band (`N × h × cos 88°`, about 3.5% of `H`). What happens to it
  next is the frame's own call (it fades, it becomes the summary line, it unfolds).

## Crease shading (paper, not glow)

Each strip carries one overlay (`position: absolute; inset: 0; pointer-events: none`) whose
opacity is `sin θ` (set in `placeStrips` above; author it at opacity 0 so a flat sheet shows
no seam), with a fixed fill per facing:

- even `k` (bottom edge toward the viewer, the face tilts up to the light):
  `rgba(255, 255, 255, 0.10)` on a dark sheet, `rgba(255, 255, 255, 0.35)` on paper;
- odd `k` (the face tilts away, into shadow): `rgba(23, 21, 26, 0.20)` on paper,
  `rgba(0, 0, 0, 0.35)` on a dark sheet;
- plus a 1 px crease line along each strip's bottom edge, `rgba(23, 21, 26, 0.14)`, at the
  same `sin θ` opacity.

No blur, no glow, no gradient sweep: the light comes only from the strip angles.
