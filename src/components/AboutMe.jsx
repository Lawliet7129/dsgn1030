import { useMemo } from "react";
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

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// === Atmosphere =========================================================

/** Twinkling star field that lives behind the page — matches the home book's
 *  night-sky atmosphere, but isolated to this route so its z-index doesn't
 *  fight the 3D canvas underneath. */
function AboutTwinkleStars() {
  const stars = useMemo(() => {
    const rand = (min, max) => min + Math.random() * (max - min);
    return Array.from({ length: 110 }, (_, id) => ({
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

// === Building blocks ====================================================

function SectionHeader({ eyebrow, title }) {
  return (
    <div className="about-section-header">
      <div className="about-ornament">·&nbsp;&nbsp;✦&nbsp;&nbsp;·</div>
      {eyebrow ? <div className="about-eyebrow">{eyebrow}</div> : null}
      <h3 className="about-section-title">{title}</h3>
      <div className="about-rule" />
    </div>
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

// === Page ===============================================================

export const AboutMe = () => {
  const location = useLocation();
  const shouldShow = location.pathname === "/about";
  if (!shouldShow) return null;

  return (
    <div className="about-me-page">
      <AboutTwinkleStars />
      <div className="about-vignette" aria-hidden="true" />

      <header className="about-topbar">
        <ReturnToBookButton />
        <div className="about-brand-mark" aria-hidden="true">
          ✦&nbsp;&nbsp;Bailey Koo · A Chapter, in Full
        </div>
      </header>

      <main className="about-main">
        {/* Hero plate */}
        <section className="about-hero">
          <div className="about-ornament about-ornament--big">
            ·&nbsp;&nbsp;✦&nbsp;&nbsp;·
          </div>
          <div className="about-eyebrow about-eyebrow--big">
            Chapter the First, expanded
          </div>
          <h1 className="about-hero-title">Bailey Koo</h1>
          <div className="about-hero-subtitle">
            — the storyteller, in detail —
          </div>
          <div className="about-rule about-rule--big" />
        </section>

        {/* Prologue */}
        <section className="about-prose">
          <p>
            <span className="about-dropcap">I</span>’m a junior studying
            Computer Science and Mathematics at the University of Pennsylvania.
            After finishing AP Calculus as a fourth grader and TA’ing it in
            middle school, I gravitated naturally toward math olympiads and
            strategic games. Since then, I’ve qualified for the{" "}
            <strong>AIME six times</strong>, placed in the{" "}
            <strong>global top 30</strong>, explored the Prime Number Theorem
            in middle school, and ranked top 30 worldwide in the board game{" "}
            <em>Splendor</em>.
          </p>
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

        {/* Experiences */}
        <section className="about-section">
          <SectionHeader eyebrow="Act II" title="Of Experiences" />
          <div className="about-timeline">
            {experiences.map((exp, i) => (
              <article key={i} className="about-timeline-entry">
                <div className="about-entry-roman">{ROMAN[i]}</div>
                <div className="about-entry-body">
                  <div className="about-entry-head">
                    <span className="about-entry-title">{exp.title}</span>
                    <span className="about-entry-date">{exp.date}</span>
                  </div>
                  <div className="about-entry-company">{exp.company}</div>
                  <p className="about-entry-description">{exp.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Awards */}
        <section className="about-section">
          <SectionHeader eyebrow="Act III" title="Of Distinction" />
          <div className="about-awards-spread">
            <div className="about-awards-pillar">
              <h4>Trading Competitions</h4>
              <ul>
                {awards.trading.map((a, i) => (
                  <li key={i}>
                    <span className="about-award-title">{a.title}</span>
                    <span className="about-award-achievement">
                      {a.achievement}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="about-awards-pillar">
              <h4>Academic &amp; Research</h4>
              <ul>
                {awards.academic.map((a, i) => (
                  <li key={i}>
                    <span className="about-award-title">{a.title}</span>
                    <span className="about-award-achievement">
                      {a.achievement}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="about-awards-pillar">
              <h4>Others</h4>
              <ul>
                {awards.others.map((a, i) => (
                  <li key={i}>
                    <span className="about-award-title">{a.title}</span>
                    <span className="about-award-achievement">
                      {a.achievement}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Research */}
        <section className="about-section">
          <SectionHeader eyebrow="Act IV" title="Of Research & Writing" />
          <div className="about-research-spread">
            {researchArticles.map((r, i) => (
              <a key={i} href="#" className="about-research-folio">
                <div className="about-folio-meta">
                  <span className="about-folio-year">{r.year}</span>
                  <span className="about-folio-type">{r.type}</span>
                </div>
                <h4 className="about-folio-title">{r.title}</h4>
                <p className="about-folio-desc">{r.description}</p>
                <div className="about-folio-foot">
                  <span>read on</span>
                  <span aria-hidden="true">→</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="about-section">
          <SectionHeader eyebrow="Act V" title="Tools of the Trade" />
          <div className="about-tech-spread">
            {techStack.map((t, i) => (
              <span key={i} className="about-tech-chip">
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Contact / Epilogue */}
        <section className="about-section">
          <SectionHeader eyebrow="Epilogue" title="The Postscript" />
          <ul className="about-contact-list">
            <li>
              <span className="about-contact-label">Email</span>
              <a
                className="about-contact-link"
                href="mailto:baileykoo0305@gmail.com"
              >
                baileykoo0305@gmail.com
              </a>
            </li>
            <li>
              <span className="about-contact-label">LinkedIn</span>
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
        <div className="about-ornament about-ornament--footer">
          ·&nbsp;&nbsp;✦&nbsp;&nbsp;·
        </div>
        <div className="about-fin">FIN.</div>
        <div className="about-copy">
          © 2026 Bailey Koo · written in twilight.
        </div>
      </footer>
    </div>
  );
};
