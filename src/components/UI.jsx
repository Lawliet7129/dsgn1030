import { atom, useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";

const pictures = [
  "DSC00680",
  "DSC00933",
  "DSC00966",
  "DSC00983",
  "DSC01011",
  "DSC01040",
  "DSC01064",
  "DSC01071",
  "DSC01103",
  "DSC02069",
];

export const showAboutMeAtom = atom(false);

/**
 * Increments once each time the Disney castle is revealed (i.e. when the page
 * flip settles on "Final Proj."). Book.jsx writes to it; the UI's
 * CastleSparkleFlourish reads it to fire a one-shot sparkle burst overlay so
 * the model's appearance reads as a deliberate, magical moment.
 */
export const castleRevealTriggerAtom = atom(0);
export const pages = [
  {
    front: "book-cover",
    back: pictures[0],
  },
];
for (let i = 1; i < pictures.length - 1; i += 2) {
  pages.push({
    front: pictures[i % pictures.length],
    back: pictures[(i + 1) % pictures.length],
  });
}

pages.push({
  front: pictures[pictures.length - 1],
  back: "book-back",
});

// Page names mapping
export const pageNames = [
  "Cover",
  "About Me",
  "Exercise 1",
  "Incomplete.",
  "Inconsistency.",
  "Final Proj.",
  "Back Cover",
];

/** Sidebar index for "Final Proj." — used by Canvas scene and book logic. */
export const FINAL_PROJ_PAGE_INDEX = pageNames.indexOf("Final Proj.");

/** Default chapter on first load: Final Proj. */
export const pageAtom = atom(FINAL_PROJ_PAGE_INDEX);

/** Soft twinkling night-sky field that sits behind the 3D scene.
 *  Subtle cursor parallax adds depth — the stars drift opposite to the cursor
 *  with a damped lerp so the motion feels like atmosphere, not a UI element. */
const TwinkleStars = () => {
  const containerRef = useRef(null);
  const stars = useMemo(() => {
    const COUNT = 110;
    const rand = (min, max) => min + Math.random() * (max - min);
    return Array.from({ length: COUNT }, (_, i) => {
      const isSparkle = Math.random() < 0.16;
      return {
        id: i,
        left: rand(0, 100),
        top: rand(0, 100),
        size: isSparkle ? rand(5, 11) : rand(1, 2.4),
        isSparkle,
        twinkleMin: rand(0.12, 0.32),
        twinkleMax: rand(0.7, 1),
        delay: rand(0, 6),
        duration: rand(3.2, 6.5),
      };
    });
  }, []);

  useEffect(() => {
    // Respect the user's motion preference — no parallax if reduced motion.
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const MAX_X = 16; // px — total horizontal travel from cursor edges.
    const MAX_Y = 10;
    const LERP = 0.06; // damping factor; lower = smoother / slower.

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      // Negative so stars drift opposite to the cursor — reads as depth.
      targetX = -nx * MAX_X;
      targetY = -ny * MAX_Y;
    };

    const tick = () => {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${currentX.toFixed(
          2
        )}px, ${currentY.toFixed(2)}px, 0)`;
      }
      raf = window.requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0, willChange: "transform" }}
    >
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            ["--twinkle-min"]: s.twinkleMin,
            ["--twinkle-max"]: s.twinkleMax,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            willChange: "opacity, transform",
          }}
        >
          {s.isSparkle ? (
            <svg
              viewBox="0 0 100 100"
              style={{
                width: "100%",
                height: "100%",
                filter:
                  "drop-shadow(0 0 4px rgba(200,204,215,0.55))",
              }}
            >
              <path
                d="M50 4 L54 46 L96 50 L54 54 L50 96 L46 54 L4 50 L46 46 Z"
                fill="#c8ccd7"
              />
            </svg>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "#c8ccd7",
                boxShadow: "0 0 6px rgba(200,204,215,0.5)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Occasional shooting-star streaks. Fires one streak every ~6–12 seconds at a
 * random origin in the upper portion of the sky. Pure CSS animation with a tiny
 * React scheduler — fits the "wish upon a star" castle motif without competing
 * with the main scene for attention.
 */
const ShootingStars = () => {
  const [streaks, setStreaks] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    let timeoutId;
    let cancelled = false;

    const fire = () => {
      if (cancelled) return;
      const id = idRef.current++;
      // Origin biased to upper-half so streaks fall toward the castle/horizon.
      const left = 15 + Math.random() * 70;
      const top = Math.random() * 38;
      // Downward-right angle so streaks read as "falling".
      const angle = 18 + Math.random() * 22;
      const duration = 1.4 + Math.random() * 0.8;
      const streak = { id, left, top, angle, duration };
      setStreaks((prev) => [...prev, streak]);
      setTimeout(() => {
        if (cancelled) return;
        setStreaks((prev) => prev.filter((s) => s.id !== id));
      }, duration * 1000 + 200);
    };

    const schedule = () => {
      const delay = 6000 + Math.random() * 6000;
      timeoutId = setTimeout(() => {
        fire();
        schedule();
      }, delay);
    };

    // First streak comes in early so the user catches the effect.
    timeoutId = setTimeout(() => {
      fire();
      schedule();
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {streaks.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.left}%`,
            top: `${s.top}%`,
            transform: `rotate(${s.angle}deg)`,
            transformOrigin: "0 50%",
          }}
        >
          <div
            className="shooting-star"
            style={{
              animation: `shoot ${s.duration}s ease-out forwards`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Cinematic radial vignette. Sits above the canvas/marquee but below the
 * interactive UI. Darkens the corners so the eye is drawn to the book/castle
 * at center — the same trick used in storybook illustration plates.
 */
const Vignette = () => (
  <div
    aria-hidden
    className="fixed inset-0 pointer-events-none"
    style={{
      zIndex: 1,
      background:
        "radial-gradient(ellipse 95% 75% at 50% 55%, rgba(0,0,0,0) 42%, rgba(15, 22, 42, 0.55) 100%)",
    }}
  />
);

/**
 * Top-left identity mark. Small Playfair italic with a star ornament — anchors
 * the page as a single curated object rather than a generic portfolio.
 * Hidden on mobile to avoid colliding with the horizontal nav pill bar.
 */
const BrandMark = () => (
  <div
    aria-hidden
    className="hidden md:flex fixed top-6 left-6 z-20 pointer-events-none select-none items-baseline gap-2 text-[#c8ccd7]"
  >
    <span className="text-[11px] tracking-[0.32em] opacity-80">✦</span>
    <span className="font-['Playfair_Display'] italic text-[13px] tracking-[0.18em] opacity-85">
      Bailey Koo · MMXXVII
    </span>
  </div>
);

/**
 * One-shot sparkle burst that plays when the Disney castle reveals. Listens to
 * `castleRevealTriggerAtom`, which Book.jsx increments each time `showCastle`
 * flips on after a page-flip settles on Final Proj. Pure HTML overlay — does
 * not touch the 3D scene. Particles bloom out from a point roughly aligned
 * with the on-screen castle so the model's appearance reads as deliberate.
 */
const CastleSparkleFlourish = () => {
  const [trigger] = useAtom(castleRevealTriggerAtom);
  const [burstId, setBurstId] = useState(null);

  // Pre-computed particle layout for each burst. Memo'd on burstId so each
  // reveal gets a fresh fan of angles/distances rather than identical bursts.
  const particles = useMemo(() => {
    if (burstId === null) return [];
    const COUNT = 16;
    return Array.from({ length: COUNT }, (_, i) => {
      // Spread evenly around the circle, jittered for organic feel.
      const base = (i / COUNT) * Math.PI * 2;
      const angle = base + (Math.random() - 0.5) * 0.4;
      const distance = 110 + Math.random() * 160; // px
      const duration = 900 + Math.random() * 500; // ms
      const delay = Math.random() * 180; // ms
      const size = 9 + Math.random() * 7; // px
      return {
        id: i,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        duration,
        delay,
        size,
      };
    });
  }, [burstId]);

  useEffect(() => {
    if (trigger === 0) return undefined;
    const id = trigger;
    setBurstId(id);
    // Clear after the longest particle has finished (duration + delay + buffer).
    const timer = setTimeout(() => {
      setBurstId((current) => (current === id ? null : current));
    }, 1800);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (burstId === null) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    >
      {/* Soft glow flash beneath the particles — adds the "fwoomph" of reveal. */}
      <div
        className="castle-sparkle-glow"
        style={{
          left: "50%",
          top: "52%",
        }}
      />
      {particles.map((p) => (
        <div
          key={p.id}
          className="castle-sparkle"
          style={{
            left: "50%",
            top: "52%",
            width: `${p.size}px`,
            height: `${p.size}px`,
            ["--tx"]: `${p.tx}px`,
            ["--ty"]: `${p.ty}px`,
            animation: `sparkle-burst ${p.duration}ms cubic-bezier(0.18, 0.7, 0.3, 1) ${p.delay}ms forwards`,
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <path
              d="M50 4 L54 46 L96 50 L54 54 L50 96 L46 54 L4 50 L46 46 Z"
              fill="#c8ccd7"
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

function NavPill({ active, onClick, label, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2 ${
        compact ? "px-2.5 py-1" : "px-3 py-1.5"
      } rounded-full text-[10.5px] tracking-[0.22em] uppercase font-medium whitespace-nowrap transition-all duration-200 ${
        active
          ? "bg-[#c8ccd7] text-[#2e3c5f] shadow-[0_2px_10px_rgba(46,60,95,0.25)]"
          : "text-[#c8ccd7]/75 hover:text-[#c8ccd7] hover:bg-[#c8ccd7]/10"
      }`}
    >
      {active ? (
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-2.5 h-2.5 text-[#2e3c5f]"
        >
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            className="animate-spin-slow"
          >
            <path
              d="M50 4 L54 46 L96 50 L54 54 L50 96 L46 54 L4 50 L46 46 Z"
              fill="currentColor"
            />
          </svg>
        </span>
      ) : (
        <span
          aria-hidden
          className="inline-block w-1 h-1 rounded-full bg-[#c8ccd7]/40 group-hover:bg-[#c8ccd7]/80 transition-all duration-200"
        />
      )}
      <span>{label}</span>
    </button>
  );
}

export const UI = () => {
  const [page, setPage] = useAtom(pageAtom);
  const [showAboutMe, setShowAboutMe] = useAtom(showAboutMeAtom);
  
  // Debug: log showAboutMe changes
  useEffect(() => {
    console.log('🔘 UI: showAboutMe changed to:', showAboutMe);
  }, [showAboutMe]);

  useEffect(() => {
    const audio = new Audio("/audios/page-flip-01a.mp3");
    // Only play audio after user interaction
    const playAudio = () => {
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    };
    // Try to play, but don't throw error if it fails
    playAudio();
  }, [page]);

  // Page counter for the chapter nav. Total includes the trailing "Back Cover".
  const totalChapters = pages.length + 1;
  const activeChapter = Math.min(page, pages.length);
  const counterLabel = `${String(activeChapter + 1).padStart(2, "0")} / ${String(
    totalChapters
  ).padStart(2, "0")}`;

  return (
    <>
      <TwinkleStars />
      <ShootingStars />
      <Vignette />
      <BrandMark />
      <CastleSparkleFlourish />
      <main className=" pointer-events-none select-none z-10 fixed  inset-0  flex justify-between flex-col">
        {/* Desktop: vertical navigation in a glass panel */}
        <div
          className="hidden md:flex items-center pointer-events-auto fixed top-1/2 -translate-y-1/2"
          style={{ left: "clamp(1rem, 4vw, 4rem)" }}
        >
          <div className="flex flex-col gap-1 px-3 py-4 rounded-2xl border border-[#c8ccd7]/25 bg-[#2e3c5f]/15 backdrop-blur-md shadow-[0_10px_30px_rgba(46,60,95,0.18)]">
            <div className="px-2 pb-2 mb-1 flex items-baseline justify-between gap-3 text-[9px] tracking-[0.32em] uppercase text-[#c8ccd7]/55 border-b border-[#c8ccd7]/15">
              <span>Chapters</span>
              <span className="font-['Playfair_Display'] italic tracking-normal normal-case text-[11px] text-[#c8ccd7]/70">
                {counterLabel}
              </span>
            </div>
            {[...pages].map((_, index) => (
              <NavPill
                key={index}
                active={index === page}
                onClick={() => {
                  setPage(index);
                  setShowAboutMe(index === 1);
                }}
                label={pageNames[index]}
              />
            ))}
            <div className="my-1 border-t border-[#c8ccd7]/15" />
            <NavPill
              active={page === pages.length}
              onClick={() => {
                setPage(pages.length);
                setShowAboutMe(false);
              }}
              label={pageNames[pages.length]}
            />
          </div>
        </div>
        {/* Mobile: horizontal navigation pill bar at top */}
        <div className="md:hidden w-full pointer-events-auto flex flex-col items-center gap-1.5 px-4 pt-4">
          <div className="overflow-auto flex items-center gap-1 max-w-full px-2 py-1.5 rounded-full border border-[#c8ccd7]/25 bg-[#2e3c5f]/15 backdrop-blur-md shadow-[0_8px_20px_rgba(46,60,95,0.18)]">
            {[...pages].map((_, index) => (
              <NavPill
                key={index}
                active={index === page}
                onClick={() => {
                  setPage(index);
                  setShowAboutMe(index === 1);
                }}
                label={pageNames[index]}
                compact
              />
            ))}
            <NavPill
              active={page === pages.length}
              onClick={() => {
                setPage(pages.length);
                setShowAboutMe(false);
              }}
              label={pageNames[pages.length]}
              compact
            />
          </div>
          <span className="font-['Playfair_Display'] italic text-[11px] tracking-wider text-[#c8ccd7]/70">
            {counterLabel}
          </span>
        </div>
      </main>

      <div className="marquee-mask fixed inset-0 flex items-center -rotate-2 select-none font-['Playfair_Display'] opacity-90">
        <div className="relative">
          <div className="animate-horizontal-scroll flex items-center gap-10 w-max px-8">
            <h2 className="shrink-0 text-[#c8ccd7] text-10xl italic font-light">
              Once upon a time
            </h2>
            <h2 className="shrink-0 text-transparent text-12xl font-semibold italic outline-text">
              Whimsy
            </h2>
            <h1 className="shrink-0 text-[#c8ccd7] text-12xl font-bold">
              Bailey Koo
            </h1>
            <h2 className="shrink-0 text-[#c8ccd7] text-9xl italic font-extralight">
              storyteller
            </h2>
            <h2 className="shrink-0 text-[#c8ccd7] text-9xl font-medium">
              Reverie
            </h2>
            <h2 className="shrink-0 text-transparent text-13xl font-bold outline-text italic">
              Folklore
            </h2>
            <h2 className="shrink-0 text-[#c8ccd7] text-13xl italic font-light">
              a quiet tale
            </h2>
          </div>
          <div className="absolute top-0 left-0 animate-horizontal-scroll-2 flex items-center gap-10 px-8 w-max">
            <h2 className="shrink-0 text-[#c8ccd7] text-10xl italic font-light">
              Chapter one
            </h2>
            <h2 className="shrink-0 text-transparent text-12xl font-bold italic outline-text">
              Daydreamer
            </h2>
            <h1 className="shrink-0 text-[#c8ccd7] text-12xl font-bold">
              Bailey Koo
            </h1>
            <h2 className="shrink-0 text-[#c8ccd7] text-9xl font-medium">
              Lullaby
            </h2>
            <h2 className="shrink-0 text-[#c8ccd7] text-9xl italic font-extralight">
              castles in the sky
            </h2>
            <h2 className="shrink-0 text-transparent text-13xl font-semibold outline-text italic">
              2027
            </h2>
            <h2 className="shrink-0 text-[#c8ccd7] text-13xl italic font-light">
              builder of worlds
            </h2>
          </div>
        </div>
      </div>
    </>
  );
};
