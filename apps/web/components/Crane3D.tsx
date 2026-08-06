"use client";

import { useEffect, useRef } from "react";
import type * as ThreeNS from "three";

/**
 * The mark, made real: the same five facets as the flat crane, extruded into
 * paper-thin 3D panels and tilted slightly off-plane like an actual fold,
 * floating and slowly turning — a product shot for a product with no
 * physical form. Auto-rotates; leans gently toward the pointer on desktop.
 *
 * Three.js is imported lazily so it never lands in the initial bundle — this
 * is decorative, not load-bearing, and the hero must render without it.
 * Static default: nothing renders (the hero copy stands on its own); on
 * `prefers-reduced-motion` the crane still mounts but never rotates.
 */
export function Crane3D() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    let killed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (killed || host === null) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 2, 26);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      // Bright hemisphere + key light, generously overdriven — three.js's
      // physically-correct light-intensity scale reads as dim/grey at the
      // old "intensity 1" conventions. Colour comes from hand-set per-facet
      // hex (white / lavender / ink, the same alternating lit/shaded scheme
      // as the flat mark) rather than from relying on lighting to create
      // contrast — that's what failed once already: a single uniform
      // "paper" material under simple lighting reads as grey plastic (see
      // docs/BRAND.md icon-review history). Fixed facet colour is immune to
      // that regardless of light intensity or renderer.
      const hemi = new THREE.HemisphereLight(0xffffff, 0xc7bcf2, 3.2);
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(6, 10, 8);
      const fill = new THREE.PointLight(0x5b3df5, 0.5, 60);
      fill.position.set(-10, -4, 6);
      scene.add(hemi, key, fill);

      // Same 2D coordinates and lit/shaded palette as the flat mark
      // (icon.svg), extruded flat and tilted per-facet to fake the
      // dimensionality of an actual fold.
      const white = new THREE.MeshLambertMaterial({ color: 0xfbf9f5, side: THREE.DoubleSide });
      const lavender = new THREE.MeshLambertMaterial({ color: 0xc7bcf2, side: THREE.DoubleSide });
      const ink = new THREE.MeshLambertMaterial({ color: 0x17151a, side: THREE.DoubleSide });

      const extrude = (points: [number, number][], material: ThreeNS.Material, tilt: [number, number, number]) => {
        const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, -y)));
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false });
        const mesh = new THREE.Mesh(geo, material);
        mesh.rotation.set(tilt[0], tilt[1], tilt[2]);
        return mesh;
      };

      const group = new THREE.Group();
      group.add(
        extrude(
          [[20, 44], [26, 36], [40, 36], [46, 44], [33, 50]],
          lavender,
          [0, 0, 0],
        ),
        extrude(
          [[26, 36], [40, 36], [35, 14]],
          white,
          [-0.16, 0.02, 0],
        ),
        extrude(
          [[20, 44], [26, 36], [16, 19]],
          white,
          [0.05, -0.22, 0.02],
        ),
        extrude(
          [[46, 44], [40, 36], [56, 32]],
          lavender,
          [-0.08, 0.18, -0.02],
        ),
        extrude(
          [[16, 19], [9, 23], [17, 24]],
          ink,
          [0.05, -0.22, 0.02],
        ),
      );

      // Recenter the group on its own bounding box so it rotates in place.
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      group.position.sub(center);
      const wrapper = new THREE.Group();
      wrapper.add(group);
      wrapper.scale.setScalar(0.62);
      scene.add(wrapper);

      let raf = 0;
      let disposed = false;
      const pointer = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      };
      if (!reduceMotion) window.addEventListener("pointermove", onMove);

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      let t = 0;
      const tick = () => {
        if (disposed) return;
        if (!reduceMotion) {
          t += 0.0032;
          wrapper.rotation.y = t + pointer.x * 0.35;
          wrapper.rotation.x = 0.12 + pointer.y * -0.18;
        } else {
          wrapper.rotation.set(0.12, 0.5, 0);
        }
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      cleanup = () => {
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        });
        white.dispose();
        lavender.dispose();
        ink.dispose();
        renderer.dispose();
        host.removeChild(renderer.domElement);
      };
    });

    return () => {
      killed = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className="crane-3d" aria-hidden="true" />;
}
