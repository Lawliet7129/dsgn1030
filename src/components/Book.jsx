import { useCursor, useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import {
  castleRevealTriggerAtom,
  FINAL_PROJ_PAGE_INDEX,
  pageAtom,
  pages,
  showAboutMeAtom,
} from "./UI";
/** ms to wait after the page settles before treating the flip motion as ended. */
const FLIP_SETTLE_DELAY_MS = 450;
const DISNEY_CASTLE_GLB_PATH = "/disneycastle-draco.glb";

useGLTF.preload(DISNEY_CASTLE_GLB_PATH, true);

function DisneyCastle(props) {
  const { nodes, materials } = useGLTF(DISNEY_CASTLE_GLB_PATH, true);
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0.geometry}
        material={materials["M_|polySurface36_aiStandardSurface19SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_1.geometry}
        material={materials["M_|polySurface36_aiStandardSurface14SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_2.geometry}
        material={materials["M_|polySurface36_aiStandardSurface15SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_3.geometry}
        material={materials["M_|polySurface36_aiStandardSurface18SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_4.geometry}
        material={materials["M_|polySurface36_aiStandardSurface22SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_5.geometry}
        material={materials["M_|polySurface36_aiStandardSurface20SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_6.geometry}
        material={materials["M_|polySurface36_aiStandardSurface24SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_7.geometry}
        material={materials["M_|polySurface36_aiStandardSurface21SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_8.geometry}
        material={materials["M_|polySurface36_aiStandardSurface23SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_9.geometry}
        material={materials["M_|polySurface36_aiStandardSurface16SG"]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.mesh_0_10.geometry}
        material={materials["M_|polySurface36_aiStandardSurface17SG"]}
      />
    </group>
  );
}

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

/** Top inset for pj1-1 (About Me back) only — changing this does not affect pj1-2. */
const PJ1_ABOUT_ME_BACK_TOP_MARGIN_RATIO = 0.15;
/** Top inset for pj1-2 (Exercise 1 / leaf 2 front) only — set equal to the About Me value when you want them to match. */
const PJ1_DSGN_1030_FRONT_TOP_MARGIN_RATIO = 0.53;

/** Portrait circle on About Me uses radius 350 on a 1024-wide canvas; pj1-3 overlay uses this × scale. */
const ABOUT_ME_PORTRAIT_CIRCLE_RADIUS = 350;
const PJ13_OVERLAY_RADIUS_SCALE = 0.75;

/** Circular crop + cover-fit (same math as About Me selfportrait). */
function drawImageCircularCover(ctx, img, centerX, centerY, circleRadius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
  ctx.clip();
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const imgAspect = iw / ih;
  let drawWidth;
  let drawHeight;
  let drawX;
  let drawY;
  if (imgAspect > 1) {
    drawHeight = circleRadius * 2;
    drawWidth = drawHeight * imgAspect;
    drawX = centerX - drawWidth / 2;
    drawY = centerY - drawHeight / 2;
  } else {
    drawWidth = circleRadius * 2;
    drawHeight = drawWidth / imgAspect;
    drawX = centerX - drawWidth / 2;
    drawY = centerY - drawHeight / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

/** Shared scale/placement for PJ1 compositing; margin is controlled per-page via `topMarginRatio`.
 *  Optional `captionLines`: centered under the image, one line each (About Me back only).
 *  Optional `circularOverlayImg`: pj1-3 on Exercise 1 front — drawn on top, circular, slightly right. */
function createPj1TopThirdCanvasTextureFromImage(
  img,
  topMarginRatio,
  captionLines,
  circularOverlayImg
) {
  if (!img?.complete || !img.width) return null;
  const canvasW = 1024;
  const canvasH = Math.round((canvasW * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c8ccd7";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const regionH = canvasH / 3;
  const fitScale = Math.min(canvasW / iw, regionH / ih);
  const scale = fitScale * 1.5;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (canvasW - dw) / 2;
  const topMargin = Math.round(canvasH * topMarginRatio);
  const dy = (regionH - dh) / 2 + topMargin;
  ctx.drawImage(img, dx, dy, dw, dh);

  if (captionLines?.length) {
    const pad = Math.round(canvasH * 0.042);
    let fontSize = Math.round(canvasW * 0.07);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#2e3c5f";
    const maxW = canvasW * 0.9;
    // Storybook serif italic to match the fairytale tone
    const fontFamily = '"Playfair Display", Georgia, "Times New Roman", serif';

    const fitsAtSize = (size) => {
      ctx.font = `italic 500 ${size}px ${fontFamily}`;
      return captionLines.every(
        (line) => ctx.measureText(line).width <= maxW
      );
    };
    while (fontSize > 14 && !fitsAtSize(fontSize)) {
      fontSize -= 1;
    }
    ctx.font = `italic 500 ${fontSize}px ${fontFamily}`;
    const lineHeight = Math.round(fontSize * 1.12);
    let textY = dy + dh + pad;
    for (const line of captionLines) {
      ctx.fillText(line, canvasW / 2, textY);
      textY += lineHeight;
    }
  }

  if (
    circularOverlayImg &&
    circularOverlayImg.complete &&
    (circularOverlayImg.naturalWidth || circularOverlayImg.width)
  ) {
    const refCanvasW = 1024;
    const circleRadius =
      ABOUT_ME_PORTRAIT_CIRCLE_RADIUS *
      PJ13_OVERLAY_RADIUS_SCALE *
      (canvasW / refCanvasW);
    const centerX = canvasW * 0.7;
    const centerY = canvasH * 0.27;
    drawImageCircularCover(
      ctx,
      circularOverlayImg,
      centerX,
      centerY,
      circleRadius
    );
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

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
/** Subtle navy highlight glow when hovering pages (palette: #3c4c77). */
const emissiveColor = new Color("#3c4c77");
/** Storybook ivory tint for page paper; multiplies subtly with photo textures. */
const PAGE_PAPER_TINT = new Color("#e6e9f0");
/** Blank leaves after Exercise 1: gentle palette ivory (kept cohesive with paper). */
const BLANK_LEAF_COLOR = new Color("#dde1ea");
const BLANK_LEAF_TEXTURE_PATH = "/textures/blank-white.png";

const pageMaterials = [
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: "#2e3c5f",
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
  new MeshStandardMaterial({
    color: whiteColor,
  }),
];

pages.forEach((page, index) => {
  // Page 0 back Bailey.png; page 1 selfportrait + pj1-1 back; page 2 pj1-2 + back + pj1-3; index>2 blank
  if (index === 0) {
    useTexture.preload(`/textures/${page.front}.jpg`);
    useTexture.preload(`/textures/Bailey.png`);
  } else if (index === 1) {
    useTexture.preload(`/textures/selfportrait.jpg`);
    useTexture.preload(`/textures/pj1-1.png`);
  } else if (index === 2) {
    useTexture.preload(`/textures/pj1-2.png`);
    useTexture.preload(`/textures/${page.back}.jpg`);
    useTexture.preload(`/textures/pj1-3.png`);
  } else if (index > 2) {
    useTexture.preload(BLANK_LEAF_TEXTURE_PATH);
  } else {
    useTexture.preload(`/textures/${page.front}.jpg`);
    useTexture.preload(`/textures/${page.back}.jpg`);
  }
});

const Page = ({ number, front, back, page, opened, bookClosed, ...props }) => {
  // About Me page is page 1 - front uses selfportrait.jpg (circular crop), back uses pj1-1.png
  const isAboutMePage = number === 1;
  // Page 0's back uses Bailey.png
  const isPage0Back = number === 0;
  // Leaf 2 (Exercise 1): front pj1-2 base + pj1-3 circular overlay; back is photo jpg
  const isDsgn1030Page = number === 2;
  const isBlankLeafAfterExercise1 = number > 2;

  const texturePaths = isPage0Back
    ? [`/textures/${front}.jpg`, "/textures/Bailey.png"]
    : isAboutMePage
    ? ["/textures/selfportrait.jpg", "/textures/pj1-1.png"]
    : isDsgn1030Page
    ? [
        "/textures/pj1-2.png",
        `/textures/${back}.jpg`,
        "/textures/pj1-3.png",
      ]
    : isBlankLeafAfterExercise1
    ? [BLANK_LEAF_TEXTURE_PATH, BLANK_LEAF_TEXTURE_PATH]
    : [`/textures/${front}.jpg`, `/textures/${back}.jpg`];

  const textures = useTexture(texturePaths);
  const picture = textures[0];
  const picture2 = textures[1];
  const picture3 = textures[2];
  const [circularTexture, setCircularTexture] = useState(null);
  const [aboutMeBackTexture, setAboutMeBackTexture] = useState(null);
  const [dsgn1030FrontTexture, setDsgn1030FrontTexture] = useState(null);
  
  // Create circular cropped texture for page 1's front
  useEffect(() => {
    if (isAboutMePage && picture) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      // Fill with palette light cool gray
      ctx.fillStyle = '#c8ccd7';
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Wait for image to load
      if (picture.image && picture.image.complete) {
        createCircularCrop();
      } else if (picture.image) {
        picture.image.onload = createCircularCrop;
      }
      
      function createCircularCrop() {
        // Clear and redraw background
        ctx.fillStyle = '#c8ccd7';
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

  // About Me back: pj1-1 (margin: PJ1_ABOUT_ME_BACK_TOP_MARGIN_RATIO only)
  useEffect(() => {
    if (!isAboutMePage || !picture2) return;

    function composeAboutMeBack() {
      const texture = createPj1TopThirdCanvasTextureFromImage(
        picture2.image,
        PJ1_ABOUT_ME_BACK_TOP_MARGIN_RATIO,
        ["In-Class Exercise:", "Basic Table Scene"]
      );
      if (!texture) return;
      setAboutMeBackTexture((prev) => {
        prev?.dispose?.();
        return texture;
      });
    }

    if (picture2.image?.complete) {
      composeAboutMeBack();
    } else if (picture2.image) {
      picture2.image.onload = composeAboutMeBack;
    }

    return () => {
      if (picture2.image) picture2.image.onload = null;
      setAboutMeBackTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isAboutMePage, picture2]);

  // Exercise 1 front: pj1-2 composited + pj1-3 circular overlay on top
  useEffect(() => {
    if (!isDsgn1030Page || !picture || !picture3) return;

    function composeDsgnFront() {
      const base = picture.image;
      const overlay = picture3.image;
      if (!base?.complete || !base.width) return;
      if (!overlay?.complete || !(overlay.naturalWidth || overlay.width))
        return;

      const texture = createPj1TopThirdCanvasTextureFromImage(
        base,
        PJ1_DSGN_1030_FRONT_TOP_MARGIN_RATIO,
        undefined,
        overlay
      );
      if (!texture) return;
      setDsgn1030FrontTexture((prev) => {
        prev?.dispose?.();
        return texture;
      });
    }

    composeDsgnFront();
    const run = () => composeDsgnFront();
    if (picture.image) picture.image.onload = run;
    if (picture3.image) picture3.image.onload = run;

    return () => {
      if (picture.image) picture.image.onload = null;
      if (picture3.image) picture3.image.onload = null;
      setDsgn1030FrontTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isDsgn1030Page, picture, picture3]);

  if (picture && picture2) {
    picture.colorSpace = picture2.colorSpace = SRGBColorSpace;
  }
  if (picture3) {
    picture3.colorSpace = SRGBColorSpace;
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
        // Page 0 back uses Bailey.png; page 1 back uses pj1-1.png; others use picture2
        color: whiteColor,
        map: picture2,
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
    if (isAboutMePage) {
      // Page 1 (About Me): front uses circular cropped selfportrait.jpg, back uses composited pj1-1.png
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = circularTexture || picture; // Use circular texture if available
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map =
        aboutMeBackTexture || picture2;
    } else if (isPage0Back) {
      // Page 0: front shows cover, back uses Bailey.png
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map = picture2;
    } else if (isDsgn1030Page) {
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map =
        dsgn1030FrontTexture || picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map = picture2;
    } else if (isBlankLeafAfterExercise1) {
      skinnedMeshRef.current.material[4].color = BLANK_LEAF_COLOR;
      skinnedMeshRef.current.material[4].map = null;
      skinnedMeshRef.current.material[5].color = BLANK_LEAF_COLOR;
      skinnedMeshRef.current.material[5].map = null;
    } else {
      // Generic photo pages — apply gentle ivory wash so stray photos stay in palette
      skinnedMeshRef.current.material[4].color = PAGE_PAPER_TINT;
      skinnedMeshRef.current.material[4].map = picture;
      skinnedMeshRef.current.material[5].color = PAGE_PAPER_TINT;
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
  const [showCastle, setShowCastle] = useState(false);
  const [, setCastleRevealTrigger] = useAtom(castleRevealTriggerAtom);

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

  // Show castle once flipping settles on Final Proj.; hide instantly when leaving
  useEffect(() => {
    const onFinalProj = page === FINAL_PROJ_PAGE_INDEX;
    if (!onFinalProj || delayedPage !== page) {
      setShowCastle(false);
      return;
    }
    const timer = setTimeout(
      () => setShowCastle(true),
      FLIP_SETTLE_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [page, delayedPage]);

  // Fire the sparkle flourish overlay each time the castle transitions hidden→shown.
  useEffect(() => {
    if (showCastle) {
      setCastleRevealTrigger((n) => n + 1);
    }
  }, [showCastle, setCastleRevealTrigger]);

  const isFinalProjPage = page === FINAL_PROJ_PAGE_INDEX;

  return (
    <group {...props}>
      <group position-y={isFinalProjPage ? -1 : 0}>
        <group rotation-y={-Math.PI / 2}>
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
        {showCastle && (
          <Suspense fallback={null}>
            <DisneyCastle
              position={[0, 0, 0.5]}
              rotation={[Math.PI / 2, -Math.PI / 2, 0]}
              scale={0.15}
            />
          </Suspense>
        )}
      </group>
    </group>
  );
};
