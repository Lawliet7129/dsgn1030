import { atom, useAtom } from "jotai";
import { useEffect, useState } from "react";

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
  "Projects",
  "Incomplete.",
  "Inconsistency.",
  "Undecided.",
  "Back Cover",
];

const AnimatedSpadeacePattern = () => {
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    // Calculate grid dimensions based on viewport
    const cardWidth = 75;
    const cardHeight = 100;
    const cols = Math.ceil(dimensions.width / cardWidth) + 2;
    const rows = Math.ceil(dimensions.height / cardHeight) + 2;
    const totalCards = cols * rows;

    // Initialize all cards as visible
    const initialVisible = new Set(Array.from({ length: totalCards }, (_, i) => i));
    setVisibleCards(initialVisible);

    const interval = setInterval(() => {
      setVisibleCards((prev) => {
        // Target 20-30% of cards to be visible (70-80% will be hidden)
        const targetVisiblePercentage = 0.3 + Math.random() * 0.1; // 20-30%
        const targetVisibleCount = Math.floor(totalCards * targetVisiblePercentage);
        
        // Randomly select which cards should be visible
        const newVisible = new Set();
        const availableIndices = Array.from({ length: totalCards }, (_, i) => i);
        
        // Shuffle and pick random cards to be visible
        for (let i = 0; i < targetVisibleCount; i++) {
          const randomIndex = Math.floor(Math.random() * availableIndices.length);
          const cardIndex = availableIndices.splice(randomIndex, 1)[0];
          newVisible.add(cardIndex);
        }

        return newVisible;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [dimensions]);

  const cardWidth = 75;
  const cardHeight = 100;
  const cols = dimensions.width > 0 ? Math.ceil(dimensions.width / cardWidth) + 2 : 0;
  const rows = dimensions.height > 0 ? Math.ceil(dimensions.height / cardHeight) + 2 : 0;

  if (rows === 0 || cols === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const index = row * cols + col;
          const isVisible = visibleCards.has(index);
          return (
            <div
              key={`${row}-${col}`}
              className="absolute transition-opacity duration-500"
              style={{
                left: `${col * cardWidth}px`,
                top: `${row * cardHeight}px`,
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                opacity: isVisible ? 0.3 : 0,
                backgroundImage: "url('/images/spadeace.png')",
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
          );
        })
      )}
    </div>
  );
};

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
      <AnimatedSpadeacePattern />
      <main className=" pointer-events-none select-none z-10 fixed  inset-0  flex justify-between flex-col">
        {/* Desktop: Vertical navigation on left center - responsive positioning */}
        <div 
          className="hidden md:flex items-center pointer-events-auto fixed top-1/2 -translate-y-1/2"
          style={{ left: 'clamp(1rem, 4vw, 4rem)' }}
        >
          <div className="flex flex-col items-start gap-2">
            {[...pages].map((_, index) => (
              <button
                key={index}
                className={`border-transparent hover:border-white transition-all duration-300  px-1.5 py-1 rounded-full  text-sm uppercase shrink-0 border ${
                  index === page
                    ? "bg-white/90 text-gray-900"
                    : "bg-black/30 text-white"
                }`}
                onClick={() => {
                  setPage(index);
                  // Only show About Me when clicking the About Me button (index 1)
                  // Hide About Me when navigating to other pages
                  setShowAboutMe(index === 1);
                }}
              >
                {pageNames[index]}
              </button>
            ))}
            <button
              className={`border-transparent hover:border-white transition-all duration-300  px-1.5 py-1 rounded-full  text-sm uppercase shrink-0 border ${
                page === pages.length
                  ? "bg-white/90 text-gray-900"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => {
                setPage(pages.length);
                setShowAboutMe(false);
              }}
            >
              {pageNames[pages.length]}
            </button>
          </div>
        </div>
        {/* Mobile: Horizontal navigation at top */}
        <div className="md:hidden w-full overflow-auto pointer-events-auto flex justify-center">
          <div className="overflow-auto flex items-center gap-1 max-w-full p-10">
            {[...pages].map((_, index) => (
              <button
                key={index}
                className={`border-transparent hover:border-white transition-all duration-300  px-1.5 py-1 rounded-full  text-sm uppercase shrink-0 border ${
                  index === page
                    ? "bg-white/90 text-gray-900"
                    : "bg-black/30 text-white"
                }`}
                onClick={() => {
                  console.log('🔘 Button clicked - index:', index, 'pageNames[index]:', pageNames[index]);
                  setPage(index);
                  // Only show About Me when clicking the About Me button (index 1)
                  // Hide About Me when navigating to other pages
                  // This shows poker cards in 3D scene, does NOT navigate to /about
                  const shouldShowAboutMe = index === 1;
                  console.log('🔘 Setting showAboutMe to:', shouldShowAboutMe);
                  setShowAboutMe(shouldShowAboutMe);
                  // Verify it was set
                  setTimeout(() => {
                    console.log('🔘 After setting, showAboutMe should be:', shouldShowAboutMe);
                  }, 100);
                }}
              >
                {pageNames[index]}
              </button>
            ))}
            <button
              className={`border-transparent hover:border-white transition-all duration-300  px-1.5 py-1 rounded-full  text-sm uppercase shrink-0 border ${
                page === pages.length
                  ? "bg-white/90 text-gray-900"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => {
                setPage(pages.length);
                setShowAboutMe(false);
              }}
            >
              {pageNames[pages.length]}
            </button>
          </div>
        </div>
      </main>

      <div className="fixed inset-0 flex items-center -rotate-2 select-none">
        <div className="relative">
          <div className="bg-white/0  animate-horizontal-scroll flex items-center gap-8 w-max px-8">
            <h1 className="shrink-0 text-white text-10xl font-black ">
              
            </h1>
            <h2 className="shrink-0 text-white text-8xl italic font-light">
              Quantitative Developer
            </h2>
            <h2 className="shrink-0 text-white text-12xl font-bold">
              Bailey Koo
            </h2>
            <h2 className="shrink-0 text-transparent text-12xl font-bold italic outline-text">
              
            </h2>
            <h2 className="shrink-0 text-white text-9xl font-medium">
              Programmer
            </h2>
            <h2 className="shrink-0 text-white text-9xl font-extralight italic">
              Mathematics
            </h2>
            <h2 className="shrink-0 text-white text-13xl font-bold">
              Engineer
            </h2>
            <h2 className="shrink-0 text-transparent text-13xl font-bold outline-text italic">
            Quant
            </h2>
          </div>
          <div className="absolute top-0 left-0 bg-white/0 animate-horizontal-scroll-2 flex items-center gap-8 px-8 w-max">
            <h1 className="shrink-0 text-white text-10xl font-black ">
              Bailey Koo
            </h1>
            <h2 className="shrink-0 text-white text-8xl italic font-light">
              Mathematics
            </h2>
            <h2 className="shrink-0 text-white text-12xl font-bold">
              Quantitative Developer
            </h2>
            <h2 className="shrink-0 text-transparent text-12xl font-bold italic outline-text">
              Algorithmic Trader
            </h2>
            <h2 className="shrink-0 text-white text-9xl font-medium">
              Probability
            </h2>
            <h2 className="shrink-0 text-white text-9xl font-extralight italic">
              Graphics
            </h2>
            <h2 className="shrink-0 text-white text-13xl font-bold">
              2027
            </h2>
            <h2 className="shrink-0 text-transparent text-13xl font-bold outline-text italic">
              Quant
            </h2>
          </div>
        </div>
      </div>
    </>
  );
};
