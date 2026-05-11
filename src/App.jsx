import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import { Experience } from "./components/Experience";
import {
  FINAL_PROJ_PAGE_INDEX,
  pageAtom,
  showAboutMeAtom,
  UI,
} from "./components/UI";
import { AboutMe } from "./components/AboutMe";

/** Vertical offset for the whole 3D scene (book + castle + ground). */
const SCENE_POSITION_Y = -0.4;
/** Scene scale when "Final Proj." is the active page. */
const FINAL_PROJ_SCENE_SCALE = 0.6;
/** Scene tilt on X when "Final Proj." is the active page (radians). */
const FINAL_PROJ_SCENE_ROTATION_X = -Math.PI / 3;

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
    </BrowserRouter>
  );
}

function HomePage() {
  return (
    <>
      <UI />
      <AboutMe />
      <Loader />
      <SceneCanvas />
    </>
  );
}

function AboutMePage() {
  // Set showAboutMe to true when on /about route
  const [, setShowAboutMe] = useAtom(showAboutMeAtom);
  useEffect(() => {
    setShowAboutMe(true);
    return () => setShowAboutMe(false);
  }, [setShowAboutMe]);
  
  return (
    <>
      <UI />
      <AboutMe />
      <Loader />
      <SceneCanvas />
    </>
  );
}

export default App;
