"use client";

import { useEffect, useRef } from "react";

/**
 * Counts a proof-bar number up from 0 when it scrolls into view, via GSAP
 * tweening a plain number and writing textContent on each tick — no React
 * re-render per frame. The real value is in the markup from the first paint
 * (SSR'd as `display`), so a blocked/failed script or reduced motion just
 * leaves the correct number sitting there instead of stuck at 0.
 */
export function Count({ value, display }: { value: number; display: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup = () => {};

    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const rect = el.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
      const counter = { v: alreadyVisible ? 0 : value };
      el.textContent = alreadyVisible ? "0" : display;

      const run = () => {
        gsap.fromTo(
          counter,
          { v: 0 },
          {
            v: value,
            duration: 1.1,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = Math.round(counter.v).toLocaleString("en-US");
            },
            onComplete: () => {
              el.textContent = display;
            },
          },
        );
      };

      if (alreadyVisible) {
        run();
        return;
      }

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              run();
              io.disconnect();
            }
          }
        },
        { threshold: 0.4 },
      );
      io.observe(el);
      cleanup = () => io.disconnect();
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [value, display]);

  return <span ref={ref}>{display}</span>;
}
