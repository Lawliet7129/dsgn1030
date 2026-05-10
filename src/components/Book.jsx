import { useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bone,
  BoxGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom, pages, showAboutMeAtom } from "./UI";

const easingFactor = 0.5; // Controls the speed of the easing
const easingFactorFold = 0.3; // Controls the speed of the easing
const insideCurveStrength = 0.18; // Controls the strength of the curve
const outsideCurveStrength = 0.05; // Controls the strength of the curve
const turningCurveStrength = 0.09; // Controls the strength of the curve

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; // 4:3 aspect ratio
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
  // ALL VERTICES
  vertex.fromBufferAttribute(position, i); // get the vertex
  const x = vertex.x; // get the x position of the vertex

  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)); // calculate the skin index
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH; // calculate the skin weight

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0); // set the skin indexes
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0); // set the skin weights
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");
const emissiveColor = new Color("blueviolet");

const pageMaterials = [
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: "#111",
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
];

pages.forEach((page, index) => {
  // Skip preloading textures for pages with solid colors
  // Page 0 back uses Bailey.png, page 1 front uses selfportrait.jpg
  if (index === 0) {
    // Cover page: preload front (cover) and Bailey.png for back
    useTexture.preload(`/textures/${page.front}.jpg`);
    useTexture.preload(`/textures/Bailey.png`);
  } else if (index === 1) {
    // About Me page: preload selfportrait.jpg for front, and back texture
    useTexture.preload(`/textures/selfportrait.jpg`);
    useTexture.preload(`/textures/${page.back}.jpg`);
  } else {
    // Other pages: preload both
    useTexture.preload(`/textures/${page.front}.jpg`);
    useTexture.preload(`/textures/${page.back}.jpg`);
  }
});

const Page = ({ number, front, back, page, opened, bookClosed, ...props }) => {
  // About Me page is page 1 - front uses selfportrait.jpg (circular crop), back uses solid color
  const isAboutMePage = number === 1;
  // Page 0's back uses Bailey.png
  const isPage0Back = number === 0;
  
  // For page 0, use Bailey.png for back instead of the normal back texture
  // For page 1 (About Me), load selfportrait.jpg for front (will be processed into circular crop)
  const texturePaths = isPage0Back
    ? [`/textures/${front}.jpg`, "/textures/Bailey.png"]
    : isAboutMePage
    ? ["/textures/selfportrait.jpg", `/textures/${back}.jpg`]
    : [`/textures/${front}.jpg`, `/textures/${back}.jpg`];
  
  const [picture, picture2] = useTexture(texturePaths);
  const [circularTexture, setCircularTexture] = useState(null);
  
  // Create circular cropped texture for page 1's front
  useEffect(() => {
    if (isAboutMePage && picture) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      // Fill with background color (#f6f6f4)
      ctx.fillStyle = '#f6f6f4';
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Wait for image to load
      if (picture.image && picture.image.complete) {
        createCircularCrop();
      } else if (picture.image) {
        picture.image.onload = createCircularCrop;
      }
      
      function createCircularCrop() {
        // Clear and redraw background
        ctx.fillStyle = '#f6f6f4';
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Calculate circle size and position (centered)
        const circleRadius = 350; // Adjust size as needed
        const centerX = 512; // Center of 1024x1024 canvas
        const centerY = 512;
        
        // Create circular clipping path
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        ctx.clip();
        
        // Calculate source image dimensions to maintain aspect ratio
        const img = picture.image;
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > 1) {
          // Image is wider than tall
          drawHeight = circleRadius * 2;
          drawWidth = drawHeight * imgAspect;
          drawX = centerX - drawWidth / 2;
          drawY = centerY - drawHeight / 2;
        } else {
          // Image is taller than wide
          drawWidth = circleRadius * 2;
          drawHeight = drawWidth / imgAspect;
          drawX = centerX - drawWidth / 2;
          drawY = centerY - drawHeight / 2;
        }
        
        // Draw the image
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        
        // Create texture
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        setCircularTexture(texture);
      }
    }
  }, [isAboutMePage, picture]);
  
  if (picture && picture2) {
    picture.colorSpace = picture2.colorSpace = SRGBColorSpace;
  }
  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);

  const skinnedMeshRef = useRef();

  const manualSkinnedMesh = useMemo(() => {
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone); // attach the new bone to the previous bone
      }
    }
    const skeleton = new Skeleton(bones);

    // About Me page background color (#f6f6f4)
    const aboutMeColor = new Color("#f6f6f4");
    
    const materials = [
      ...pageMaterials,
      new MeshStandardMaterial({
        // Page 1 front uses selfportrait.jpg, other pages use their front texture
        color: whiteColor,
        map: picture, // Will be updated in useFrame for page 1
        roughness: 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshStandardMaterial({
        // Page 0 back uses Bailey.png, page 1 back uses solid color
        color: isAboutMePage ? aboutMeColor : whiteColor,
        map: isAboutMePage ? null : picture2, // Will be set in useFrame
        roughness: 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ];
    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, []);

  // useHelper(skinnedMeshRef, SkeletonHelper, "red");

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return;
    }

    // Update materials for About Me page and page 0's back
    const aboutMeColor = new Color("#f6f6f4");
    if (isAboutMePage) {
      // Page 1 (About Me): front uses circular cropped selfportrait.jpg, back uses solid color
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = circularTexture || picture; // Use circular texture if available
      skinnedMeshRef.current.material[5].color = aboutMeColor;
      skinnedMeshRef.current.material[5].map = null;
    } else if (isPage0Back) {
      // Page 0: front shows cover, back uses Bailey.png
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map = picture2;
    } else {
      // Other pages: normal textures
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map = picture2;
    }

    const emissiveIntensity = highlighted ? 0.22 : 0;
    skinnedMeshRef.current.material[4].emissiveIntensity =
      skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        skinnedMeshRef.current.material[4].emissiveIntensity,
        emissiveIntensity,
        0.1
      );

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation;
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }
      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        easingFactor,
        delta
      );

      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        easingFactorFold,
        delta
      );
    }
  });

  const [_, setPage] = useAtom(pageAtom);
  const [, setShowAboutMe] = useAtom(showAboutMeAtom);
  const [highlighted, setHighlighted] = useState(false);
  const navigate = useNavigate();
  useCursor(highlighted);

  return (
    <>
      <group
        {...props}
        ref={group}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHighlighted(true);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHighlighted(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          
          // Check if click is on page 0's back text area
          if (isPage0Back && !opened && e.intersections && e.intersections.length > 0) {
            const intersection = e.intersections[0];
            if (intersection.uv) {
              const uv = intersection.uv;
              // Text is positioned at img2X + 50, img2Y + 50 in texture space
              // img2X = 1024 - 1024 - 30 = -30, so textX ≈ 20 (normalized: 20/1024 ≈ 0.02)
              // img2Y = 1024 * 0.7 - 410 ≈ 307, so textY ≈ 357 (normalized: 357/1024 ≈ 0.35)
              // UV coordinates: Y is inverted (0 = bottom, 1 = top), so UV.y = 1 - 0.35 = 0.65
              // Text "ABOUT ME." is approximately 200px wide, 50px tall
              // Text area: x: 0.01 to 0.25, y: 0.55 to 0.75 (inverted Y)
              if (uv.x >= 0.01 && uv.x <= 0.25 && uv.y >= 0.55 && uv.y <= 0.75) {
                navigate('/about');
                return;
              }
            }
          }
          
          const targetPage = opened ? number : number + 1;
          // Allow all book page navigation
          // Always hide About Me when clicking book pages (it only shows via navigation button)
          setPage(targetPage);
          setShowAboutMe(false);
          setHighlighted(false);
        }}
      >
        <primitive
          object={manualSkinnedMesh}
          ref={skinnedMeshRef}
          position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
        />
      </group>
    </>
  );
};

export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) {
          return delayedPage;
        } else {
          timeout = setTimeout(
            () => {
              goToPage();
            },
            Math.abs(page - delayedPage) > 2 ? 50 : 150
          );
          if (page > delayedPage) {
            return delayedPage + 1;
          }
          if (page < delayedPage) {
            return delayedPage - 1;
          }
        }
      });
    };
    goToPage();
    return () => {
      clearTimeout(timeout);
    };
  }, [page]);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {[...pages].map((pageData, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={index}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === pages.length}
          {...pageData}
        />
      ))}
    </group>
  );
};
