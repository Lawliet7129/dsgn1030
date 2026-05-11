import { atom, useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";

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

export const pageAtom = atom(0);
export const showAboutMeAtom = atom(false);
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

/** Soft twinkling night-sky field that sits behind the 3D scene. */
const TwinkleStars = () => {
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

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
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
      <span
        aria-hidden
        className={`inline-block w-1 h-1 rounded-full transition-all duration-200 ${
          active
            ? "bg-[#2e3c5f]"
            : "bg-[#c8ccd7]/40 group-hover:bg-[#c8ccd7]/80"
        }`}
      />
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

  return (
    <>
      <TwinkleStars />
      <main className=" pointer-events-none select-none z-10 fixed  inset-0  flex justify-between flex-col">
        {/* Desktop: vertical navigation in a glass panel */}
        <div
          className="hidden md:flex items-center pointer-events-auto fixed top-1/2 -translate-y-1/2"
          style={{ left: "clamp(1rem, 4vw, 4rem)" }}
        >
          <div className="flex flex-col gap-1 px-3 py-4 rounded-2xl border border-[#c8ccd7]/25 bg-[#2e3c5f]/15 backdrop-blur-md shadow-[0_10px_30px_rgba(46,60,95,0.18)]">
            <div className="px-2 pb-2 mb-1 text-[9px] tracking-[0.32em] uppercase text-[#c8ccd7]/55 border-b border-[#c8ccd7]/15">
              Chapters
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
        <div className="md:hidden w-full pointer-events-auto flex justify-center px-4 pt-4">
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
        </div>
      </main>

      <div className="fixed inset-0 flex items-center -rotate-2 select-none font-['Playfair_Display'] opacity-90">
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
