"use client";

import { useEffect, useRef } from "react";

/**
 * Reading progress AS a folding page corner, not a progress bar with a fold
 * icon next to it. The corner grows as you scroll toward the end of the
 * page, like a dog-eared page you're folding down further the more you
 * read; the label names which of the six numbered chapters you're
 * currently in, read straight from the `.chapter` markers already in the
 * page — one signal, driven by real scroll position, not two unrelated
 * widgets glued together.
 *
 * Static default (no JS / reduced motion): a small resting corner labelled
 * "Ch. 01 / 06" — correct at the top of the page, just not live.
 */
export function FoldProgress() {
  const flapRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chapters = Array.from(document.querySelectorAll<HTMLElement>(".chapter"));
    if (chapters.length === 0) return;

    let killed = false;
    let st: { kill: () => void } | undefined;

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);

      st = ScrollTrigger.create({
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const size = Math.round(14 + self.progress * 58);
          if (flapRef.current) {
            flapRef.current.style.width = `${size}px`;
            flapRef.current.style.height = `${size}px`;
          }
          let idx = 0;
          for (let i = 0; i < chapters.length; i++) {
            if (chapters[i]!.getBoundingClientRect().top < window.innerHeight * 0.6) idx = i;
          }
          if (labelRef.current) {
            labelRef.current.textContent = `Ch. ${String(idx + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
          }
        },
      });
    });

    return () => {
      killed = true;
      st?.kill();
    };
  }, []);

  return (
    <div className="fold-progress" aria-hidden="true">
      <span ref={labelRef} className="fold-progress-label">
        Ch. 01 / 06
      </span>
      <div className="fold-progress-corner">
        <div ref={flapRef} className="fold-progress-flap" />
      </div>
    </div>
  );
}
