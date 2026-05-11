import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import { FINAL_PROJ_PAGE_INDEX, pageAtom } from "./UI";
import "./CursorTrail.css";

/**
 * Pixie-dust cursor trail.
 *
 * Spawns small glowing stardust particles + occasional ✦/✧ sparkles at the
 * cursor's position, which drift down and fade out — designed to match the
 * Disney-castle / twilight-storybook aesthetic of the rest of the site.
 *
 * Only active when the user is in a "magical" context:
 *   • Final Project page (castle reveal), OR
 *   • /about route (long-form chapter page)
 *
 * Performance notes:
 *   • Mousemove is throttled to ~45 spawns/sec.
 *   • Particles are plain DOM nodes (not React state) and self-remove on
 *     animationend, so no re-renders per frame.
 *   • Hard cap on simultaneous particles guards against runaway memory.
 *   • Disabled when (prefers-reduced-motion: reduce) or (pointer: coarse).
 */
export function CursorTrail() {
  const containerRef = useRef(null);
  const location = useLocation();
  const [page] = useAtom(pageAtom);

  const isAboutRoute = location.pathname === "/about";
  const isFinalProjActive = page === FINAL_PROJ_PAGE_INDEX;
  const enabled = isAboutRoute || isFinalProjActive;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduceMotion || !finePointer) return;

    const container = containerRef.current;
    if (!container) return;

    let lastSpawn = 0;
    let activeCount = 0;
    const MAX_PARTICLES = 90;
    const MIN_INTERVAL = 22; // ms between spawns

    const STAR_GLYPHS = ["✦", "✧", "✶", "✺"];
    const rand = (min, max) => min + Math.random() * (max - min);

    const spawnParticle = (x, y) => {
      if (activeCount >= MAX_PARTICLES) return;

      const el = document.createElement("span");
      el.className = "cursor-trail-particle";

      // Roughly 1 in 6 particles is a serif sparkle glyph; the rest are dust
      // dots. Mixed types make the trail feel hand-drawn, not procedural.
      const isStar = Math.random() < 0.17;

      if (isStar) {
        el.classList.add("cursor-trail-particle--star");
        el.textContent =
          STAR_GLYPHS[Math.floor(Math.random() * STAR_GLYPHS.length)];
        el.style.fontSize = `${rand(7, 13)}px`;
      } else {
        const size = rand(2, 5);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
      }

      // Slight randomization in spawn position so it feels like a wand-puff
      // rather than a rigid line.
      const jitterX = rand(-6, 6);
      const jitterY = rand(-6, 6);
      el.style.left = `${x + jitterX}px`;
      el.style.top = `${y + jitterY}px`;

      // Drift mostly downward (like settling dust), with a little lateral
      // wobble and slow rotation. Stars rotate a bit more dramatically.
      const dx = rand(-22, 22);
      const dy = rand(28, 68);
      const rot = isStar ? rand(-220, 220) : rand(-60, 60);
      const dur = rand(900, 1500);

      el.style.setProperty("--dx", `${dx}px`);
      el.style.setProperty("--dy", `${dy}px`);
      el.style.setProperty("--rot", `${rot}deg`);
      el.style.animationDuration = `${dur}ms`;

      activeCount += 1;
      el.addEventListener(
        "animationend",
        () => {
          activeCount = Math.max(0, activeCount - 1);
          el.remove();
        },
        { once: true }
      );

      container.appendChild(el);
    };

    const onMove = (e) => {
      const now = performance.now();
      if (now - lastSpawn < MIN_INTERVAL) return;
      lastSpawn = now;
      // Most moves spawn one particle; sometimes a small burst of two, for
      // the "shower of dust" feel when the cursor accelerates.
      const burst = Math.random() < 0.28 ? 2 : 1;
      for (let i = 0; i < burst; i++) {
        spawnParticle(e.clientX, e.clientY);
      }
    };

    // Bigger burst on click — like flicking a wand.
    const onClick = (e) => {
      for (let i = 0; i < 14; i++) {
        spawnParticle(
          e.clientX + rand(-4, 4),
          e.clientY + rand(-4, 4)
        );
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      // Clear any remaining particles when the trail is deactivated so the
      // dust doesn't linger after leaving the magical context.
      if (container) container.innerHTML = "";
    };
  }, [enabled]);

  // We always mount the container so the ref is stable; the effect above is
  // what gates whether listeners are actually attached. When disabled the
  // container is just an empty fixed div (pointer-events: none).
  return (
    <div
      className="cursor-trail"
      ref={containerRef}
      aria-hidden="true"
      data-active={enabled ? "true" : "false"}
    />
  );
}
