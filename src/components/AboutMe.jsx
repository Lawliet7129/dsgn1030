import { useAtom } from "jotai";
import { useLocation } from "react-router-dom";
import { pageAtom } from "./UI";
import "./AboutMe.css";

// Experiences data - easily scalable
const experiences = [
  {
    title: "AQR Capital Management",
    date: "Jun. 2026",
    company: "Incoming Quantitative Research Developer Intern",
    description: "Selected as one of two Quantitative Research Developers in the 2026 Summer cohort; the only QRD on the Global Stock Selection team"
  },
  {
    title: "Karrot (Danggeun Market)",
    date: "Jun. 2025 - Aug. 2025",
    company: "Software Engineering Intern",
    description: "Sole developer in the TF Townies team, building and launching the MVP in Aug 2025. Developed an interactive 3D user profile management system using Three.js and GraphQL APIs, enabling real-time visualization and backend-driven updates of user status tiers on Korea’s largest hyperlocal marketplace app (30M+ users, $4B+ valuation, backed by SoftBank Vision Fund)"
  },
  {
    title: "Palantir Technologies",
    date: "Mar. 2025",
    company: "Palantir Launch Intern",
    description: "Selected as one of ~70 undergraduate students for Palantir’s highly competitive Launch Program focused on real-world AI deployment; Built and demoed a functional MVP in under 5 days, Penn Board Game Night, using Foundry, AIP (OSDK), React + TypeScript, and Vite, enabling efficient game discovery and scheduling; implemented features including 3D browsing (React Three Fiber, Drei), fuzzy search, animated transitions (Framer Motion), responsive UI (Tailwind CSS), state management (React Query), and OAuth-based login scaffolding"  }
];


const awards = {
  trading: [
    { title: "Citadel Trading Challenge", achievement: "Team 1st Place" },
    { title: "DRW Mock the Market", achievement: "Individual 1st Place" },
    { title: "SIG Trade or Tighten", achievement: "Individual 1st Place" },
    { title: "SIG Discovery Day", achievement: "Quantitative Trading" },
    { title: "UChicago Trading Competition", achievement: "Participant" }
  ],
  academic: [
    { title: " x6 AIME Qualifier", achievement: "AIME Perfect Scorer (7th Grade)" },
    { title: "U.S. National Chemistry Olympiad", achievement: "Finalist" },
    { title: "Presidential Science Scholarship of Korea", achievement: "Recipient" },
    { title: "Penn Undergraduate Research Mentorship Award", achievement: "Recipient" },
    { title: "The Congressional Award", achievement: "Gold Medal" },
    { title: "Hampshire College Summer Studies in Mathematics", achievement: "HCSSiM Alum" }
  ],
  others: [
    { title: "IQ Test", achievement: "166 (Cattell scale)" },
    { title: "ACT", achievement: "36" }
  ]
};

// Research & Articles data
const researchArticles = [
  {
    title: "Statistical Comparison Between the Fractal Dimensions of Brownian Motions vs. Random Walks",
    description: "The fractal dimension of a path measures the \"jaggedness\" of a fractal image or shape as a decimal number. Since Random Walks are also considered to be fractal, their fractal dimensions should be measurable. However, there are various types of random walk paths. Will different types of Random Walk paths result in different fractal dimensions? If so, by how much?",
    year: "2024",
    type: "Research"
  },
  {
    title: "A Comparative Analysis on Police Related Deaths and Prediction of the 2020 Presidential Election",
    description: "Proposed and conducted machine learning research (logistic regression and random forest) to predict state-level outcomes for the 2020 presidential election based on the prevalence of police killings and the 2016 election results",
    year: "2020",
    type: "Research"
  },
  {
    title: "The Prime Number Theorem & Riemann Zeta Function",
    description: "In middle school, as part of the HCSSiM program, I studied Don Zagier's proof of the Prime Number Theorem and rewrote it in my own words, unpacking the analytic continuation of the Riemann Zeta function and the non-vanishing of ζ(s) on Re(s) = 1. My goal was to internalize and reconstruct the logical flow.",
    year: "2018",
    type: "Research"
  }
];

export const AboutMe = () => {
  const [page] = useAtom(pageAtom);
  const location = useLocation();
  
  // Only show on /about route, NOT when showAboutMe is true on home page
  // This allows the poker cards to show in 3D scene without covering it
  const shouldShow = location.pathname === '/about';
  if (!shouldShow) return null;

  return (
    <div className="about-me-page">
      <header>
        <div className="container">
          <div className="logo col-start-1 col-end-3">
            <h1>Bailey Koo</h1>
          </div>
          <nav className="col-start-4 col-end-7">
            <a href="#" className="active">About</a>
            <span className="bracket">(</span>
            <a href="#">Projects</a>
            <span className="bracket">)</span>
          </nav>
          <a href="mailto:baileykoo0305@gmail.com" className="email col-start-14 col-end-16">
            baileykoo0305@gmail.com
          </a>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <div className="bracket-container col-start-1 col-end-3 bracket-left-responsive">
            <div className="bracket-left-container">
              <button className="bracket-left" aria-label="Previous">
                <div className="wrapper-svg">
                  <svg width="120" height="2" viewBox="0 0 120 2" fill="none">
                    <path d="M0 1 L120 1" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <div className="mask">(1)</div>
                </div>
              </button>
            </div>
          </div>

          <div className="col-start-4 col-end-7 main-content-responsive">
            <h2>About Me</h2>
            <p>
    I’m a junior studying Computer Science and Mathematics at the University of Pennsylvania.
    After finishing AP Calculus as a fourth grader and TA’ing it in middle school, I gravitated
    naturally toward math olympiads and strategic games. Since then, I’ve qualified for the <strong>AIME
    six times</strong>, placed in the <strong>global top 30</strong>, explored the Prime Number Theorem in middle school,
    and ranked top 30 worldwide in the board game <em>Splendor</em>.
  </p>

  <p>
    My background lies in <strong>quantitative research</strong> and <strong>algorithmic development</strong>. I also work on
    graphics and game development using Three.js for fun, play board games competitively, and
    write math problems for AoPS.
  </p>
            <a href="#" className="download-resume-btn">Download Resume</a>
          </div>

          <div className="bracket-right-container col-start-14 col-end-16">
            <button className="bracket-right" aria-label="Next">
              <div className="wrapper-svg">
                <div className="mask">(2)</div>
                <svg width="120" height="2" viewBox="0 0 120 2" fill="none">
                  <path d="M0 1 L120 1" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Experiences & Awards Side by Side */}
        <div className="container section-container experiences-awards-container">
          {/* Experiences Section */}
          <div className="experiences-column main-content-responsive">
            <h3 className="section-title">Experiences</h3>
            <div className="experiences-timeline">
              {experiences.map((experience, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-number">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="experience-content">
                    <div className="experience-header">
                      <span className="experience-title">{experience.title}</span>
                      <span className="experience-date">{experience.date}</span>
                    </div>
                    <div className="experience-company">{experience.company}</div>
                    <p className="experience-description">
                      {experience.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Awards Section */}
          <div className="awards-column main-content-responsive">
            <h3 className="section-title">Awards</h3>
            
            {/* Trading Competitions */}
            <div className="award-category">
              <h4 className="award-category-title">Trading Competitions</h4>
              <div className="awards-list">
                {awards.trading.map((award, index) => (
                  <div key={index} className="award-item-compact">
                    <div className="award-title-compact">{award.title}</div>
                    <div className="award-achievement">{award.achievement}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Academic Achievements */}
            <div className="award-category">
              <h4 className="award-category-title">Academic & Research</h4>
              <div className="awards-list">
                {awards.academic.map((award, index) => (
                  <div key={index} className="award-item-compact">
                    <div className="award-title-compact">{award.title}</div>
                    <div className="award-achievement">{award.achievement}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Others */}
            <div className="award-category">
              <h4 className="award-category-title">Others</h4>
              <div className="awards-list">
                {awards.others.map((award, index) => (
                  <div key={index} className="award-item-compact">
                    <div className="award-title-compact">{award.title}</div>
                    <div className="award-achievement">{award.achievement}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Research & Articles Section */}
        <div className="container section-container">
          <div className="col-start-4 col-end-7 main-content-responsive">
            <h3 className="section-title">Research & Articles</h3>
            <div className="research-grid">
              {researchArticles.map((article, index) => (
                <a key={index} href="#" className="research-card">
                  <div className="research-card-header">
                    <span className="research-card-year">{article.year}</span>
                    <span className="research-card-type">{article.type}</span>
                  </div>
                  <h4 className="research-card-title">{article.title}</h4>
                  <p className="research-card-description">
                    {article.description}
                  </p>
                  <div className="research-card-footer">
                    <span className="research-card-link">Read more →</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Tech Stack Section */}
        <div className="container section-container">
          <div className="col-start-4 col-end-7 main-content-responsive">
            <h3 className="section-title">Tech Stack</h3>
            <div className="tech-stack-grid">
              <div className="tech-item">Python</div>
              <div className="tech-item">JavaScript</div>
              <div className="tech-item">React</div>
              <div className="tech-item">Three.js</div>
              <div className="tech-item">C++</div>
              <div className="tech-item">SQL</div>
              <div className="tech-item">TensorFlow</div>
              <div className="tech-item">PyTorch</div>
              <div className="tech-item">Git</div>
              <div className="tech-item">Docker</div>
              <div className="tech-item">AWS</div>
              <div className="tech-item">Linux</div>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="container section-container">
          <div className="col-start-4 col-end-7 main-content-responsive">
            <h3 className="section-title">Contact Information</h3>
            <div className="contact-item">
              <span className="contact-label">Email:</span>
              <a href="mailto:baileykoo0305@gmail.com" className="contact-link">baileykoo0305@gmail.com</a>
            </div>
            <div className="contact-item">
              <span className="contact-label">LinkedIn:</span>
              <a href="#" className="contact-link">linkedin.com/in/bailey-koo-a24840229</a>
            </div>
            <div className="contact-item">
              <span className="contact-label">GitHub:</span>
              <a href="#" className="contact-link">github.com/Lawliet7129</a>
            </div>
          </div>
        </div>
      </main>

      <footer>
        <div className="container">
          <div className="col-start-4 col-end-7 footer-content-responsive">
            <p>© 2026 Bailey Koo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
