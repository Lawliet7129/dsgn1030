import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { Experience } from "./components/Experience";
import {
  FINAL_PROJ_PAGE_INDEX,
  pageAtom,
  showAboutMeAtom,
  UI,
} from "./components/UI";
import { AboutMe } from "./components/AboutMe";
import { CursorTrail } from "./components/CursorTrail";
import { LoadingScreen } from "./components/LoadingScreen";
import { AboutAccessModal } from "./components/AboutAccessModal";
import {
  isAboutUnlocked,
  markAboutUnlocked,
  verifyAboutPassword,
} from "./components/aboutAccess";

/** Vertical offset for the whole 3D scene (book + castle + ground). */
const SCENE_POSITION_Y = -0.4;
/** Scene scale when "Final Proj." is the active page. */
const FINAL_PROJ_SCENE_SCALE = 0.75;
/** Scene tilt on X when "Final Proj." is the active page (radians). */
const FINAL_PROJ_SCENE_ROTATION_X = -Math.PI / 4.5;

function SceneCanvas() {
  const [page] = useAtom(pageAtom);
  const isFinalProj = page === FINAL_PROJ_PAGE_INDEX;
  const sceneScale = isFinalProj ? FINAL_PROJ_SCENE_SCALE : 1;
  const sceneRotationX = isFinalProj ? FINAL_PROJ_SCENE_ROTATION_X : 0;

  return (
    <Canvas
      shadows
      camera={{
        position: [-0.5, 1, window.innerWidth > 800 ? 4 : 9],
        fov: 45,
      }}
    >
      <group
        position-y={SCENE_POSITION_Y}
        rotation-x={sceneRotationX}
        scale={sceneScale}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </group>
    </Canvas>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/about" element={<AboutMePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <CursorTrail />
    </BrowserRouter>
  );
}

function HomePage() {
  return (
    <>
      <UI />
      <AboutMe />
      <LoadingScreen />
      <SceneCanvas />
    </>
  );
}

function AboutMePage() {
  // Set showAboutMe to true when on /about route
  const [, setShowAboutMe] = useAtom(showAboutMeAtom);
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAboutUnlocked()) {
      setIsAuthorized(true);
      return;
    }
    setShowGate(true);
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    setShowAboutMe(true);
    return () => setShowAboutMe(false);
  }, [isAuthorized, setShowAboutMe]);

  return (
    <>
      <AboutAccessModal
        open={showGate}
        title="About Me"
        subtitle="Enter password to access this private chapter."
        errorMessage={errorMessage}
        submitting={isSubmitting}
        onSubmit={async (password) => {
          setIsSubmitting(true);
          const ok = await verifyAboutPassword(password);
          setIsSubmitting(false);
          if (ok) {
            markAboutUnlocked();
            setIsAuthorized(true);
            setShowGate(false);
            setErrorMessage("");
            return;
          }
          setErrorMessage("Incorrect password. Try again.");
        }}
        onCancel={() => {
          if (isSubmitting) return;
          navigate("/", { replace: true });
        }}
      />
      <UI />
      {isAuthorized ? <AboutMe /> : null}
      <LoadingScreen />
      <SceneCanvas />
    </>
  );
}

export default App;
