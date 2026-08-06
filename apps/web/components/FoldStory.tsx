"use client";

import { useEffect, useRef } from "react";

/**
 * The Fold, told as motion instead of asserted as a headline. A "sheet" of
 * pasted text scrolls into a crane (paper folding, nothing discarded) and
 * back into a sheet with a retrieve_original tag (unfolding, byte-exact).
 * Progress is scrubbed to scroll position via a CSS-sticky viewport, not a
 * ScrollTrigger pin, so it never fights the page's own sticky masthead.
 *
 * Base markup renders the assembled crane statically — the animation is a
 * progressive enhancement. No JS, a blocked script, or reduced motion all
 * land on the same valid end state: the crane, with the fold caption.
 */
export function FoldStory() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<SVGGElement | null>(null);
  const wingRef = useRef<SVGGElement | null>(null);
  const neckRef = useRef<SVGGElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const tailRef = useRef<SVGGElement | null>(null);
  const beakRef = useRef<SVGGElement | null>(null);
  const capScrollRef = useRef<HTMLParagraphElement | null>(null);
  const capFoldRef = useRef<HTMLParagraphElement | null>(null);
  const capUnfoldRef = useRef<HTMLParagraphElement | null>(null);
  const tagRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const facets = [wingRef, neckRef, bodyRef, tailRef, beakRef].map((r) => r.current);
    if (facets.some((f) => f === null) || sheetRef.current === null) return;

    let killed = false;
    let ctx: { revert: () => void } | undefined;

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.set(sheetRef.current, { opacity: 1, scale: 1 });
        gsap.set(wingRef.current, { opacity: 0, x: -10, y: -70, rotation: -35 });
        gsap.set(neckRef.current, { opacity: 0, x: -70, y: 20, rotation: 40 });
        gsap.set(bodyRef.current, { opacity: 0, x: 0, y: 80, rotation: 15 });
        gsap.set(tailRef.current, { opacity: 0, x: 70, y: -10, rotation: -30 });
        gsap.set(beakRef.current, { opacity: 0, x: -90, y: -40, rotation: 60 });
        gsap.set(tagRef.current, { opacity: 0 });
        gsap.set(capScrollRef.current, { opacity: 1 });
        gsap.set(capFoldRef.current, { opacity: 0 });
        gsap.set(capUnfoldRef.current, { opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wrapRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.4,
          },
          defaults: { ease: "power2.inOut" },
        });

        tl.to(capScrollRef.current, { opacity: 0, duration: 0.06 }, 0)
          .to(capFoldRef.current, { opacity: 1, duration: 0.08 }, 0.04)
          .to(sheetRef.current, { opacity: 0, scale: 0.82, duration: 0.4 }, 0)
          .to(wingRef.current, { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.32 }, 0.06)
          .to(neckRef.current, { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.32 }, 0.13)
          .to(bodyRef.current, { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.32 }, 0.19)
          .to(tailRef.current, { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.28 }, 0.25)
          .to(beakRef.current, { opacity: 1, duration: 0.18 }, 0.33)
          .to(capFoldRef.current, { opacity: 0, duration: 0.08 }, 0.66)
          .to(capUnfoldRef.current, { opacity: 1, duration: 0.08 }, 0.72)
          .to([wingRef.current, neckRef.current, bodyRef.current, tailRef.current, beakRef.current], { opacity: 0, duration: 0.26 }, 0.68)
          .to(sheetRef.current, { opacity: 1, scale: 1, duration: 0.26 }, 0.74)
          .to(tagRef.current, { opacity: 1, duration: 0.2 }, 0.86);
      });
    });

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div className="fold-story" ref={wrapRef}>
      <div className="fold-story-sticky">
        <svg viewBox="-60 -70 184 184" className="fold-story-svg" role="img" aria-label="A pasted sheet of text folding into a crane, then unfolding back to the exact original">
          <g ref={sheetRef} className="fs-sheet">
            <rect x="-12" y="-8" width="90" height="80" rx="8" fill="#FFFFFF" stroke="var(--border-lit)" />
            <rect x="-12" y="-8" width="4" height="80" rx="2" fill="var(--brand)" />
            {[6, 18, 30, 42, 54, 66].map((y, i) => (
              <rect key={y} x={4} y={y} width={i === 5 ? 34 : 66} height={4} rx={2} fill="var(--border-lit)" />
            ))}
          </g>
          <g ref={wingRef}>
            <polygon points="26,36 40,36 35,14" fill="#FFFFFF" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
          <g ref={neckRef}>
            <polygon points="20,44 26,36 16,19" fill="#FFFFFF" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
          <g ref={bodyRef}>
            <polygon points="20,44 26,36 40,36 46,44 33,50" fill="#FFFFFF" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
          <g ref={tailRef}>
            <polygon points="46,44 40,36 56,32" fill="#FFFFFF" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
          <g ref={beakRef}>
            <polygon points="16,19 9,23 17,24" fill="#17151A" />
          </g>
          <g ref={tagRef} className="fs-tag">
            <rect x="-6" y="76" width="98" height="18" rx="9" fill="#F0FAF3" stroke="#BBE3C8" />
            <text x="43" y="88.5" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="#15803D">
              retrieve_original: byte-exact
            </text>
          </g>
        </svg>

        <div className="fold-story-caption">
          <p ref={capScrollRef} className="fs-cap fs-cap-scroll">
            Scroll ↓ — this is your pasted text.
          </p>
          <p ref={capFoldRef} className="fs-cap fs-cap-fold">
            <strong>Fold.</strong> Structure and duplication come out. Nothing is discarded.
          </p>
          <p ref={capUnfoldRef} className="fs-cap fs-cap-unfold">
            <strong>Unfold.</strong> <code>retrieve_original</code> hands back the exact source bytes.
          </p>
        </div>
      </div>
    </div>
  );
}
