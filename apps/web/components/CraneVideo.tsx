"use client";

import { useEffect, useRef } from "react";

/**
 * The mark, made real — a Blender-rendered 360° turntable of the same five
 * facets as the flat mark, baked onto the page's own paper colour (no alpha
 * channel needed, no seam). Simpler and more compatible than a live WebGL
 * object: no GPU/WebGL dependency, works identically everywhere a `<video>`
 * tag does. See blender/build_crane.py for the render pipeline.
 *
 * Static default: the poster frame (a real still, not a placeholder).
 * `prefers-reduced-motion` pauses playback on that same frame.
 */
export function CraneVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current?.pause();
    }
  }, []);

  return (
    <video
      ref={ref}
      className="crane-3d"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/crane-poster.png"
      aria-hidden="true"
    >
      <source src="/crane-turntable.mp4" type="video/mp4" />
    </video>
  );
}
