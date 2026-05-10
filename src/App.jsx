import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import { Experience } from "./components/Experience";
import { UI, showAboutMeAtom } from "./components/UI";
import { AboutMe } from "./components/AboutMe";

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
      <Canvas shadows camera={{
          position: [-0.5, 1, window.innerWidth > 800 ? 4 : 9],
          fov: 45,
        }}>
        <group position-y={0}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </group>
      </Canvas>
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
      <Canvas shadows camera={{
          position: [-0.5, 1, window.innerWidth > 800 ? 4 : 9],
          fov: 45,
        }}>
        <group position-y={0}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </group>
      </Canvas>
    </>
  );
}

export default App;
