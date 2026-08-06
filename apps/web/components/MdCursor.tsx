"use client";

import { useEffect, useRef } from "react";

const ACTIVE_SELECTOR = 'a, button, [role="button"], .tab, .chip, .btn, summary, label';
const TEXT_SELECTOR = "input, textarea, select, [contenteditable]";

/**
 * The system cursor, replaced by a markdown heading mark — the smallest
 * possible piece of branding that still says "this is a Markdown tool" on
 * every pixel of the page. Grows and inverts over anything clickable; steps
 * aside for the real text caret over anything editable, because a studio
 * full of textareas cannot lose precise text placement to a mascot.
 *
 * Only activates for a fine pointer with motion allowed — touch devices and
 * `prefers-reduced-motion` keep the native cursor, no exceptions.
 */
export function MdCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const dot = dotRef.current;
    if (dot === null) return;

    document.documentElement.classList.add("md-cursor");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const shown = { x: pos.x, y: pos.y };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
    };
    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(TEXT_SELECTOR)) {
        dot.dataset["state"] = "text";
      } else if (target?.closest(ACTIVE_SELECTOR)) {
        dot.dataset["state"] = "active";
      } else {
        dot.dataset["state"] = "";
      }
    };
    const onLeave = () => {
      dot.style.opacity = "0";
    };
    const onEnter = () => {
      dot.style.opacity = "1";
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    const tick = () => {
      shown.x += (pos.x - shown.x) * 0.35;
      shown.y += (pos.y - shown.y) * 0.35;
      dot.style.transform = `translate3d(${shown.x - 15}px, ${shown.y - 15}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("md-cursor");
    };
  }, []);

  return (
    <div ref={dotRef} className="md-cursor-dot" style={{ opacity: 0 }}>
      <div className="md-cursor-dot-inner">#</div>
    </div>
  );
}
