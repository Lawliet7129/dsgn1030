import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AboutMe.css";

// === Content ============================================================

const experiences = [
  {
    title: "AQR Capital Management",
    date: "Jun. 2026",
    company: "Incoming Quantitative Research Developer Intern",
    description:
      "Selected as one of two Quantitative Research Developers in the 2026 Summer cohort; the only QRD on the Global Stock Selection team",
  },
  {
    title: "Karrot (Danggeun Market)",
    date: "Jun. 2025 — Aug. 2025",
    company: "Software Engineering Intern",
    description:
      "Sole developer in the TF Townies team, building and launching the MVP in Aug 2025. Developed an interactive 3D user profile management system using Three.js and GraphQL APIs, enabling real-time visualization and backend-driven updates of user status tiers on Korea’s largest hyperlocal marketplace app (30M+ users, $4B+ valuation, backed by SoftBank Vision Fund).",
  },
  {
    title: "Palantir Technologies",
    date: "Mar. 2025",
    company: "Palantir Launch Intern",
    description:
      "Selected as one of ~70 undergraduate students for Palantir’s highly competitive Launch Program focused on real-world AI deployment; Built and demoed a functional MVP in under 5 days, Penn Board Game Night, using Foundry, AIP (OSDK), React + TypeScript, and Vite, enabling efficient game discovery and scheduling; implemented features including 3D browsing (React Three Fiber, Drei), fuzzy search, animated transitions (Framer Motion), responsive UI (Tailwind CSS), state management (React Query), and OAuth-based login scaffolding.",
  },
];

const awards = {
  trading: [
    { title: "Citadel Trading Challenge", achievement: "Team 1st Place" },
    { title: "DRW Mock the Market", achievement: "Individual 1st Place" },
    { title: "SIG Trade or Tighten", achievement: "Individual 1st Place" },
    { title: "SIG Discovery Day", achievement: "Quantitative Trading" },
    { title: "UChicago Trading Competition", achievement: "Participant" },
  ],
  academic: [
    { title: "x6 AIME Qualifier", achievement: "AIME Perfect Scorer (7th Grade)" },
    { title: "U.S. National Chemistry Olympiad", achievement: "Finalist" },
    {
      title: "Presidential Science Scholarship of Korea",
      achievement: "Recipient",
    },
    {
      title: "Penn Undergraduate Research Mentorship Award",
      achievement: "Recipient",
    },
    { title: "The Congressional Award", achievement: "Gold Medal" },
    {
      title: "Hampshire College Summer Studies in Mathematics",
      achievement: "HCSSiM Alum",
    },
  ],
  others: [
    { title: "IQ Test", achievement: "166 (Cattell scale)" },
    { title: "ACT", achievement: "36" },
  ],
};

const researchArticles = [
  {
    title:
      "Statistical Comparison Between the Fractal Dimensions of Brownian Motions vs. Random Walks",
    description:
      "The fractal dimension of a path measures the “jaggedness” of a fractal image or shape as a decimal number. Since Random Walks are also considered to be fractal, their fractal dimensions should be measurable. However, there are various types of random walk paths. Will different types of Random Walk paths result in different fractal dimensions? If so, by how much?",
    year: "2024",
    type: "Research",
  },
  {
    title:
      "A Comparative Analysis on Police Related Deaths and Prediction of the 2020 Presidential Election",
    description:
      "Proposed and conducted machine learning research (logistic regression and random forest) to predict state-level outcomes for the 2020 presidential election based on the prevalence of police killings and the 2016 election results.",
    year: "2020",
    type: "Research",
  },
  {
    title: "The Prime Number Theorem & Riemann Zeta Function",
    description:
      "In middle school, as part of the HCSSiM program, I studied Don Zagier's proof of the Prime Number Theorem and rewrote it in my own words, unpacking the analytic continuation of the Riemann Zeta function and the non-vanishing of ζ(s) on Re(s) = 1. My goal was to internalize and reconstruct the logical flow.",
    year: "2018",
    type: "Research",
  },
];

const techStack = [
  "Python",
  "JavaScript",
  "React",
  "Three.js",
  "C++",
  "SQL",
  "TensorFlow",
  "PyTorch",
  "Git",
  "Docker",
  "AWS",
  "Linux",
];

const ROMAN_LC = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

// === Atmosphere =========================================================

/** Twinkling star field behind everything else. */
function AboutTwinkleStars() {
  const stars = useMemo(() => {
    const rand = (min, max) => min + Math.random() * (max - min);
    return Array.from({ length: 130 }, (_, id) => ({
      id,
      x: rand(0, 100),
      y: rand(0, 100),
      size: rand(1, 2.6),
      duration: rand(2.4, 7),
      delay: rand(0, 6),
      opacityMax: rand(0.45, 0.95),
    }));
  }, []);
  return (
    <div className="about-stars" aria-hidden="true">
      {stars.map((s) => (
        <span
          key={s.id}
          className="about-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            "--star-max": s.opacityMax,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** A faint SVG-noise overlay so the page reads as printed paper rather than
 *  glassy UI — the kind of texture you only notice when it's missing. */
function PaperGrain() {
  return (
    <svg className="about-paper" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <filter id="about-paper-noise" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
            seed="11"
          />
          <feColorMatrix
            values="0 0 0 0 0.82
                    0 0 0 0 0.84
                    0 0 0 0 0.92
                    0 0 0 1 0"
          />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#about-paper-noise)" />
    </svg>
  );
}

/** Vertical "spine label" on the far left edge of the viewport. */
function SpineLabel() {
  return (
    <div className="about-spine" aria-hidden="true">
      <span>
        Bailey&nbsp;Koo&nbsp;&nbsp;·&nbsp;&nbsp;Chapter&nbsp;the&nbsp;First&nbsp;&nbsp;·&nbsp;&nbsp;A.D.&nbsp;MMXXVI
      </span>
    </div>
  );
}

/** Folio numeral pinned to the top-right corner, like a page number on a
 *  hand-set book plate. */
function FolioCorner({ roman = "I" }) {
  return (
    <div className="about-folio-corner" aria-hidden="true">
      <span className="folio-corner-tick">—</span>
      <span className="folio-corner-num">{roman}</span>
      <span className="folio-corner-tick">—</span>
    </div>
  );
}

/** Hand-drawn calligraphic flourish used between major sections. */
function Flourish({ variant = "default" }) {
  return (
    <div className={`about-flourish about-flourish--${variant}`} aria-hidden="true">
      <svg
        viewBox="0 0 320 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.65"
        strokeLinecap="round"
      >
        <path d="M6 13 C 60 4, 110 22, 144 13" />
        <path d="M176 13 C 210 4, 260 22, 314 13" />
        <path d="M140 9 C 145 11, 150 11, 155 13" />
        <path d="M180 13 C 175 11, 170 11, 165 9" />
        <path d="M140 17 C 145 15, 150 15, 155 13" />
        <path d="M180 13 C 175 15, 170 15, 165 17" />
        <circle cx="160" cy="13" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="160" cy="13" r="5.4" />
        <path d="M154 13 L 158 13 M162 13 L 166 13" />
      </svg>
    </div>
  );
}

/** Mini ornament used between paragraphs / inside the prose. */
function MiniFlourish() {
  return (
    <div className="about-miniflourish" aria-hidden="true">
      <svg
        viewBox="0 0 80 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
      >
        <path d="M2 6 C 18 2, 28 10, 36 6" />
        <path d="M44 6 C 52 2, 62 10, 78 6" />
        <circle cx="40" cy="6" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

function PullQuote({ children, attribution }) {
  return (
    <figure className="about-pullquote" data-reveal>
      <div className="pq-rule" aria-hidden="true" />
      <span className="pq-bigmark" aria-hidden="true">
        “
      </span>
      <blockquote className="pq-body">
        <p>{children}</p>
      </blockquote>
      {attribution ? (
        <figcaption className="pq-attribution">— {attribution}</figcaption>
      ) : null}
      <div className="pq-rule" aria-hidden="true" />
    </figure>
  );
}

// === Building blocks ====================================================

function SectionHeader({ numeral, eyebrow, title, subtitle }) {
  return (
    <header className="about-section-header" data-reveal>
      <div className="section-mark">
        <div className="section-numeral">{numeral}</div>
        <div className="section-numeral-rule" aria-hidden="true" />
        <div className="section-numeral-dot" aria-hidden="true">
          ✦
        </div>
      </div>
      <div className="section-title-block">
        {eyebrow ? (
          <div
            className="section-eyebrow"
            dangerouslySetInnerHTML={{ __html: eyebrow }}
          />
        ) : null}
        <h3 className="section-title">{title}</h3>
        {subtitle ? <div className="section-subtitle">{subtitle}</div> : null}
      </div>
    </header>
  );
}

function ReturnToBookButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="about-back-button"
      onClick={() => navigate("/")}
      aria-label="Return to the storybook"
      title="Return to the storybook"
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        aria-hidden="true"
        className="about-back-arrow"
      >
        <path
          d="M19 12H5M11 6l-6 6 6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="about-back-ornament" aria-hidden="true">
        ✦
      </span>
      <span className="about-back-label">return to the storybook</span>
    </button>
  );
}

function ContentsIndex() {
  const entries = [
    { roman: "i.", title: "Preface", page: "i" },
    { roman: "ii.", title: "Of Experiences", page: "ii" },
    { roman: "iii.", title: "Of Distinction", page: "iii" },
    { roman: "iv.", title: "Of Research & Writing", page: "iv" },
    { roman: "v.", title: "Tools of the Trade", page: "v" },
    { roman: "vi.", title: "The Postscript", page: "vi" },
  ];
  return (
    <aside className="about-contents" data-reveal>
      <div className="about-contents-eyebrow">— a table of —</div>
      <h2 className="about-contents-title">Contents</h2>
      <ol className="about-contents-list">
        {entries.map((e, i) => (
          <li key={i}>
            <span className="contents-num">{e.roman}</span>
            <span className="contents-title">{e.title}</span>
            <span className="contents-dots" aria-hidden="true" />
            <span className="contents-page">{e.page}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

// === Reveal-on-scroll ===================================================

function useRevealOnScroll(active) {
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") {
      document
        .querySelectorAll("[data-reveal]")
        .forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [active]);
}

// === Page ===============================================================

export const AboutMe = () => {
  const location = useLocation();
  const shouldShow = location.pathname === "/about";

  useRevealOnScroll(shouldShow);

  if (!shouldShow) return null;

  return (
    <div className="about-me-page">
      <AboutTwinkleStars />
      <PaperGrain />
      <SpineLabel />
      <FolioCorner roman="I" />
      <div className="about-vignette" aria-hidden="true" />

      <header className="about-topbar">
        <ReturnToBookButton />
        <div className="about-topbar-meta" aria-hidden="true">
          <span className="topbar-folio">2026</span>
          <span className="topbar-sep">✦</span>
          <span className="topbar-date">Bailey Koo</span>
          <span className="topbar-sep">✦</span>
          <span className="topbar-read">University of Pennsylvania</span>
        </div>
        <div className="about-brand-mark" aria-hidden="true">
          ✦  About Me
        </div>
      </header>

      <main className="about-main">
        {/* Hero plate -------------------------------------------------- */}
        <section className="about-hero" data-reveal>
          <div className="about-ornament about-ornament--big">
            ·&nbsp;&nbsp;✦&nbsp;&nbsp;·
          </div>
          <div className="about-eyebrow about-eyebrow--big">
            Chapter the First &nbsp;·&nbsp; in full
          </div>
          <h1 className="about-hero-title">Bailey Koo</h1>
          <div className="about-hero-subtitle">
            — Math & Computer Science—
          </div>
          <div className="about-rule about-rule--big" />
          <div className="about-hero-meta">
            <span>Quantiative Research Developer</span>
            <span className="hero-meta-dot" aria-hidden="true">
              ✦
            </span>
            <span>University of Pennsylvania</span>
            <span className="hero-meta-dot" aria-hidden="true">
              ✦
            </span>
            <span>
              <em>Class of 2027</em>
            </span>
          </div>
        </section>

        {/* Contents ---------------------------------------------------- */}
        <ContentsIndex />

        <Flourish />

        {/* Preface ----------------------------------------------------- */}
        <section className="about-prose" data-reveal>
          <div className="prose-eyebrow">·&nbsp;&nbsp;Preface&nbsp;&nbsp;·</div>
          <p>
            <span className="about-dropcap">I</span>
            ’m a junior studying Computer Science and Mathematics at the
            University of Pennsylvania. After finishing AP Calculus as a fourth
            grader and TA’ing it in middle school, I gravitated naturally toward
            math olympiads and strategic games. Since then, I’ve qualified for
            the <strong>AIME six times</strong>, placed in the{" "}
            <strong>global top 30</strong>, explored the Prime Number Theorem in
            middle school, and ranked top 30 worldwide in the board game{" "}
            <em>Splendor</em>.
          </p>
          <MiniFlourish />
          <p>
            My background lies in <strong>quantitative research</strong> and{" "}
            <strong>algorithmic development</strong>. I also work on graphics
            and game development using Three.js for fun, play board games
            competitively, and write math problems for AoPS.
          </p>
          <div className="about-prose-actions">
            <a href="#" className="about-storybook-button">
              <span className="about-btn-ornament" aria-hidden="true">
                ✦
              </span>
              <span>Download Résumé</span>
              <span className="about-btn-arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </section>

        <PullQuote attribution="from the preface">
          …placed in the global top thirty, explored the prime number theorem
          in middle school, and ranked top thirty worldwide in&nbsp;
          <em>Splendor</em>.
        </PullQuote>

        <Flourish />

        {/* Experiences ------------------------------------------------- */}
        <section className="about-section">
          <SectionHeader
            numeral="II"
            eyebrow="·&nbsp; Folio&nbsp;ii"
            title="Of Experiences"
          />
          <div className="about-timeline">
            {experiences.map((exp, i) => (
              <article key={i} className="about-timeline-entry" data-reveal>
                <div className="entry-side">
                  <div className="entry-roman">{ROMAN_LC[i]}.</div>
                  <div className="entry-side-rule" aria-hidden="true" />
                </div>
                <div className="entry-body">
                  <div className="entry-head">
                    <span className="entry-title">{exp.title}</span>
                    <span className="entry-date">{exp.date}</span>
                  </div>
                  <div className="entry-company">{exp.company}</div>
                  <p className="entry-description">{exp.description}</p>
                </div>
                <span className="entry-corner-spark" aria-hidden="true">
                  ✦
                </span>
              </article>
            ))}
          </div>
        </section>

        <Flourish />

        {/* Distinction ------------------------------------------------- */}
        <section className="about-section">
          <SectionHeader
            numeral="III"
            eyebrow="Folio&nbsp;iii"
            title="Of Distinction"
          />
          <div className="about-awards-spread">
            <div className="about-awards-pillar" data-reveal>
              <h4>
                <span className="pillar-tag">i.</span>Trading Competitions
              </h4>
              <ul>
                {awards.trading.map((a, i) => (
                  <li key={i}>
                    <span className="about-award-title">{a.title}</span>
                    <span className="about-award-dots" aria-hidden="true" />
                    <span className="about-award-achievement">
                      {a.achievement}
                    </span>
                  </li>
                ))}
              </ul>
              <span className="pillar-corner-spark" aria-hidden="true">
                ✦
              </span>
            </div>
            <div className="about-awards-pillar" data-reveal>
              <h4>
                <span className="pillar-tag">ii.</span>Academic &amp; Research
              </h4>
              <ul>
                {awards.academic.map((a, i) => (
                  <li key={i}>
                    <span className="about-award-title">{a.title}</span>
                    <span className="about-award-dots" aria-hidden="true" />
                    <span className="about-award-achievement">
                      {a.achievement}
                    </span>
                  </li>
                ))}
              </ul>
              <span className="pillar-corner-spark" aria-hidden="true">
                ✦
              </span>
            </div>
            <div className="about-awards-pillar" data-reveal>
              <h4>
                <span className="pillar-tag">iii.</span>Others
              </h4>
              <ul>
                {awards.others.map((a, i) => (
                  <li key={i}>
                    <span className="about-award-title">{a.title}</span>
                    <span className="about-award-dots" aria-hidden="true" />
                    <span className="about-award-achievement">
                      {a.achievement}
                    </span>
                  </li>
                ))}
              </ul>
              <span className="pillar-corner-spark" aria-hidden="true">
                ✦
              </span>
            </div>
          </div>
        </section>

        <PullQuote attribution="a working motto">
          curiosity, rendered slowly. each placement is a sentence; each award,
          a comma in the same long paragraph.
        </PullQuote>

        <Flourish />

        {/* Research ---------------------------------------------------- */}
        <section className="about-section">
          <SectionHeader
            numeral="IV"
            eyebrow="Folio&nbsp;iv"
            title="Of Research & Writing"
          />
          <div className="about-research-spread">
            {researchArticles.map((r, i) => (
              <a key={i} href="#" className="about-research-folio" data-reveal>
                <div className="about-folio-meta">
                  <span className="about-folio-year">{r.year}</span>
                  <span className="about-folio-rule" aria-hidden="true" />
                  <span className="about-folio-type">{r.type}</span>
                </div>
                <h4 className="about-folio-title">{r.title}</h4>
                <p className="about-folio-desc">{r.description}</p>
                <div className="about-folio-foot">
                  <span>read on</span>
                  <span aria-hidden="true">→</span>
                </div>
                <span className="folio-corner-spark" aria-hidden="true">
                  ✦
                </span>
              </a>
            ))}
          </div>
        </section>

        <Flourish />

        {/* Tech stack -------------------------------------------------- */}
        <section className="about-section">
          <SectionHeader
            numeral="V"
            eyebrow="Folio&nbsp;v"
            title="Tools of the Trade"
          />
          <div className="about-tech-spread" data-reveal>
            {techStack.map((t, i) => (
              <span key={i} className="about-tech-chip">
                {t}
              </span>
            ))}
          </div>
        </section>

        <Flourish />

        {/* Postscript -------------------------------------------------- */}
        <section className="about-section">
          <SectionHeader
            numeral="VI"
            eyebrow="Epilogue"
            title="Contact"
          />
          <ul className="about-contact-list" data-reveal>
            <li>
              <span className="about-contact-label">Email</span>
              <span className="about-contact-dots" aria-hidden="true" />
              <a
                className="about-contact-link"
                href="mailto:baileykoo0305@gmail.com"
              >
                baileykoo0305@gmail.com
              </a>
            </li>
            <li>
              <span className="about-contact-label">LinkedIn</span>
              <span className="about-contact-dots" aria-hidden="true" />
              <a
                className="about-contact-link"
                href="https://www.linkedin.com/in/bailey-koo-a24840229"
                target="_blank"
                rel="noreferrer"
              >
                linkedin.com/in/bailey-koo-a24840229
              </a>
            </li>
            <li>
              <span className="about-contact-label">GitHub</span>
              <span className="about-contact-dots" aria-hidden="true" />
              <a
                className="about-contact-link"
                href="https://github.com/Lawliet7129"
                target="_blank"
                rel="noreferrer"
              >
                github.com/Lawliet7129
              </a>
            </li>
          </ul>
        </section>
      </main>

      <footer className="about-footer">
        <Flourish variant="footer" />
        <div className="about-fin">FIN.</div>
        <div className="about-copy">
          © MMXXVI &nbsp;·&nbsp; Bailey Koo &nbsp;·&nbsp; written in twilight.
        </div>
      </footer>
    </div>
  );
};
