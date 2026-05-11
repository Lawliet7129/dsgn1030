import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import "./LoadingScreen.css";

/**
 * Minimalist loading screen — tuned for GPU/CPU overlap with Drei preload:
 *
 * • Percent text updates via RAF + ref (no per-frame React re-renders).
 * • No drop-shadow stacks on SVG strokes (heavy while animating).
 * • Fewer stars, opacity-only twinkle (no per-star transforms).
 */

const CASTLE_PATH =
  "M 10 140 L 10 90 L 30 70 L 50 90 L 50 110 L 80 110 L 80 60 L 100 30 L 120 60 L 120 110 L 150 110 L 150 90 L 170 70 L 190 90 L 190 140 Z";

function LoadingStars() {
  const stars = useMemo(() => {
    const rand = (min, max) => min + Math.random() * (max - min);
    return Array.from({ length: 18 }, (_, id) => ({
      id,
      x: rand(0, 100),
      y: rand(0, 100),
      size: rand(1, 2),
      duration: rand(3.2, 8),
      delay: rand(0, 6),
      max: rand(0.35, 0.75),
    }));
  }, []);
  return (
    <div className="loading-stars" aria-hidden="true">
      {stars.map((s) => (
        <span
          key={s.id}
          className="loading-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            "--star-max": s.max,
          }}
        />
      ))}
    </div>
  );
}

export function LoadingScreen() {
  const { active, progress } = useProgress();
  const [mounted, setMounted] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  const targetRef = useRef(0);
  const displayedRef = useRef(0);
  const percentSpanRef = useRef(null);
  const lastRoundedRef = useRef(-1);

  useEffect(() => {
    targetRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!mounted || fadingOut) return;

    let rafId = 0;

    const tick = () => {
      const target = targetRef.current;
      let curr = displayedRef.current;
      const diff = target - curr;
      if (Math.abs(diff) > 0.02) {
        curr += diff * 0.18;
        displayedRef.current = curr;
      } else {
        displayedRef.current = target;
        curr = target;
      }
      const rounded = Math.min(100, Math.max(0, Math.round(curr)));
      if (rounded !== lastRoundedRef.current) {
        lastRoundedRef.current = rounded;
        const el = percentSpanRef.current;
        if (el) el.textContent = rounded.toString().padStart(2, "0");
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mounted, fadingOut]);

  useEffect(() => {
    if (!active && !fadingOut && mounted) {
      setFadingOut(true);
      const t = setTimeout(() => setMounted(false), 950);
      return () => clearTimeout(t);
    }
  }, [active, fadingOut, mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`loading-screen ${fadingOut ? "is-fading" : ""}`}
      role="status"
      aria-busy={active}
    >
      <LoadingStars />
      <div className="loading-vignette" aria-hidden="true" />

      <div className="loading-content">
        <div className="loading-spark" aria-hidden="true">
          ✦
        </div>

        <div className="loading-castle-shell">
          <svg
            className="loading-castle"
            viewBox="0 0 200 150"
            aria-hidden="true"
          >
            <path
              className="castle-base"
              d={CASTLE_PATH}
              pathLength="100"
              fill="none"
            />
            <path
              className="castle-trace"
              d={CASTLE_PATH}
              pathLength="100"
              fill="none"
            />
          </svg>
        </div>

        <div className="loading-percent">
          <span ref={percentSpanRef} className="loading-percent-num">
            00
          </span>
          <span className="loading-percent-pct">%</span>
        </div>
      </div>
    </div>
  );
}
