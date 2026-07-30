"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-reveal wrapper. One IntersectionObserver per element, disconnected
 * after the first intersection — reveals are a one-way transition, so keeping
 * observers alive would cost work for no behaviour.
 *
 * Motion here explains sequence (this section follows that one). It is not
 * decoration, so `prefers-reduced-motion` skips straight to the visible state
 * rather than playing a faster version.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    // No observer support, or motion is unwanted: show immediately rather
    // than leaving the element in its hidden starting state forever.
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    // Anything already on screen at mount reveals right away — an above-the-
    // fold hero must never wait for a scroll that may never come.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`.trim()}
      data-shown={shown}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
