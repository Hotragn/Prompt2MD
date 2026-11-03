/*
 * Shared by both compositions. Every frame is a pure function of t (seconds):
 * nothing here reads a clock, and render(t) can be called in any order. That
 * is what lets the renderer step frames one at a time and get the same image
 * for the same t every run.
 */
(function (g) {
  "use strict";

  const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
  const lerp = (a, b, k) => a + (b - a) * k;

  /** The solver CSS uses for cubic-bezier(), so the video moves on the site's own curve. */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (u) => ((ax * u + bx) * u + cx) * u;
    const Y = (u) => ((ay * u + by) * u + cy) * u;
    const dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) {
        const err = X(u) - x;
        if (Math.abs(err) < 1e-7) return Y(u);
        const d = dX(u);
        if (Math.abs(d) < 1e-6) break;
        u -= err / d;
      }
      let lo = 0, hi = 1;
      u = x;
      for (let i = 0; i < 40; i++) {
        if (X(u) < x) lo = u;
        else hi = u;
        u = (lo + hi) / 2;
      }
      return Y(u);
    };
  }

  const ease = {
    brand: bezier(0.2, 0.7, 0.3, 1), // --ease in globals.css
    inOut: bezier(0.65, 0, 0.35, 1),
    fold: bezier(0.55, 0, 0.45, 1),
    out: (x) => 1 - Math.pow(1 - x, 3),
    in: (x) => x * x * x,
    linear: (x) => x,
  };

  /** Progress of t through [t0, t1], eased, clamped to 0..1. */
  const seg = (t, t0, t1, e = ease.brand) => e(clamp((t - t0) / (t1 - t0)));

  /** Fade + rise, the same move the site's Reveal component makes (14px, 520ms). */
  function reveal(el, t, t0, dur = 0.5, rise = 14) {
    const k = seg(t, t0, t0 + dur);
    el.style.opacity = k.toFixed(4);
    el.style.transform = k >= 1 ? "none" : `translateY(${((1 - k) * rise).toFixed(2)}px)`;
    return k;
  }

  /** Reverse of reveal, for exits. */
  function conceal(el, t, t0, dur = 0.35, lift = 10) {
    const k = seg(t, t0, t0 + dur, ease.in);
    if (k <= 0) return 0;
    el.style.opacity = (1 - k).toFixed(4);
    el.style.transform = `translateY(${(-k * lift).toFixed(2)}px)`;
    return k;
  }

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /**
   * Text made of runs, some of them marked as filler. Returns HTML for the
   * first `n` characters, so typing and dimming share one source of truth.
   */
  function runsHTML(runs, n, dim, caret) {
    let left = n;
    let out = "";
    for (const r of runs) {
      if (left <= 0) break;
      const piece = r.text.slice(0, left);
      left -= piece.length;
      if (r.filler) {
        out += `<span class="fill" style="--dim:${dim.toFixed(3)}">${esc(piece)}</span>`;
      } else {
        out += esc(piece);
      }
    }
    if (caret) out += '<span class="caret"></span>';
    return out;
  }

  /**
   * A sheet that folds like paper. The content is sliced into horizontal
   * strips, each hinged to the bottom edge of the one above and turning the
   * opposite way, so one angle folds the whole sheet into a zig-zag stack
   * against its top edge. 0 = flat, 90 = folded shut. The host's layout
   * height follows the fold, so whatever sits below slides up and down with it.
   */
  class Accordion {
    constructor(host, { strips, height, faceClass = "" }) {
      this.host = host;
      this.n = strips;
      this.H = height;
      this.h = height / strips;
      host.classList.add("acc-host");
      host.style.height = `${height}px`;
      this.strips = [];
      let parent = host;
      for (let i = 0; i < strips; i++) {
        const s = document.createElement("div");
        s.className = "acc-strip";
        s.style.top = `${i === 0 ? 0 : this.h}px`;
        s.style.height = `${this.h + (i === strips - 1 ? 0 : 0.5)}px`;
        const face = document.createElement("div");
        face.className = `acc-face ${faceClass}`;
        const inner = document.createElement("div");
        inner.className = "acc-inner";
        inner.style.top = `${-i * this.h}px`;
        inner.style.height = `${height}px`;
        const shade = document.createElement("div");
        shade.className = "acc-shade";
        face.appendChild(inner);
        face.appendChild(shade);
        s.appendChild(face);
        parent.appendChild(s);
        parent = s;
        this.strips.push({ s, inner, shade });
      }
      this.html = null;
      this.angle = -1;
    }

    setHTML(html) {
      if (html === this.html) return;
      this.html = html;
      for (const st of this.strips) st.inner.innerHTML = html;
    }

    /** Scroll the content inside the sheet (the panes on the site scroll). */
    setScroll(px) {
      this.strips.forEach((st, i) => {
        st.inner.style.top = `${-i * this.h - px}px`;
      });
    }

    setAngle(deg) {
      if (deg === this.angle) return;
      this.angle = deg;
      const a = (deg * Math.PI) / 180;
      const sin = Math.sin(a);
      this.strips.forEach((st, i) => {
        const local = i === 0 ? deg : i % 2 === 1 ? -2 * deg : 2 * deg;
        st.s.style.transform = deg === 0 ? "none" : `rotateX(${local.toFixed(3)}deg)`;
        // Even strips tilt their face up toward the light, odd strips away from it.
        const up = i % 2 === 0;
        st.shade.style.opacity = (up ? 0.07 * sin : 0.24 * sin).toFixed(4);
        st.shade.dataset.up = up ? "1" : "0";
      });
      this.host.style.height = `${(this.H * Math.cos(a)).toFixed(3)}px`;
      this.host.style.opacity = deg > 78 ? String(clamp((90 - deg) / 12)) : "1";
    }
  }

  /** Deterministic noise in [0, 1) from an integer. */
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  g.P2 = { clamp, lerp, bezier, ease, seg, reveal, conceal, esc, runsHTML, Accordion, hash };
})(window);
