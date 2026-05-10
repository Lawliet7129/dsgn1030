import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import { showAboutMeAtom } from './UI';
import straightpokerModel from '../assets/straightpoker.glb?url';

export function Straightpoker({ ...props }) {
  const group = useRef();
  const [showAboutMe] = useAtom(showAboutMeAtom);
  const location = useLocation();
  // Import GLB from src/assets
  const { scene, animations } = useGLTF(straightpokerModel);
  const { actions } = useAnimations(animations, group);

  // Show when About Me navigation button is clicked (only on home page, not when navigating to /about)
  // Only show on home page to avoid conflicts with AboutMe page component
  const shouldShow = showAboutMe && location.pathname === '/';
  


  // Play animation when page is active
  useEffect(() => {
    if (shouldShow && actions) {
      // Play all animations
      Object.values(actions).forEach((action) => {
        if (action) {
          action.reset().fadeIn(0.5).play();
        }
      });
    } else if (actions) {
      // Stop all animations when not showing
      Object.values(actions).forEach((action) => {
        if (action) {
          action.fadeOut(0.5);
        }
      });
    }
  }, [shouldShow, actions]);

  // Ensure group visibility is updated
  useEffect(() => {
    if (group.current) {
      group.current.visible = shouldShow;
    }
  }, [shouldShow]);

  // Always render the group, but control visibility
  // This ensures the component stays mounted and can react to state changes
  if (!scene) {
    return null; // Only return null if scene isn't loaded yet
  }
  
  // Debug logging
  useEffect(() => {
    console.log('🎴 Straightpoker - showAboutMe:', showAboutMe, 'pathname:', location.pathname, 'shouldShow:', shouldShow);
  }, [showAboutMe, location.pathname, shouldShow]);
  
  // Always render the scene, just control visibility
  return (
    <group ref={group} {...props} dispose={null} visible={shouldShow}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(straightpokerModel);
