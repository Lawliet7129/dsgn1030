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
/** Warm candlelight glow on hovered pages — a fairytale lit-by-window feel. */
const emissiveColor = new Color("#e4cfa3");
/** Muted warm gold for fore-edge / head / tail of the book block — "gilded leaf". */
const GILDED_EDGE_COLOR = new Color("#d6cdb3");
/** Storybook ivory tint for generic photo pages; multiplies with photo textures. */
const PAGE_PAPER_TINT = new Color("#e6e9f0");
/** Blank leaves after Exercise 1: gentle palette ivory base under constellation ink. */
const BLANK_LEAF_COLOR = new Color("#dde1ea");
const BLANK_LEAF_TEXTURE_PATH = "/textures/blank-white.png";

// --- Canvas-composited texture helpers -------------------------------------
// All textures below are generated once and shared across the book. They use
// only fallback-safe glyphs (✦, ·, MMXXVII…) so they look right whether or not
// Playfair Display has finished loading — the cover texture, which depends on
// crisp Playfair rendering, is deferred until `document.fonts.ready` inside
// the Page component instead of being created here at module load.

function drawStarPath(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  ctx.beginPath();
  ctx.moveTo(50, 4);
  ctx.lineTo(54, 46);
  ctx.lineTo(96, 50);
  ctx.lineTo(54, 54);
  ctx.lineTo(50, 96);
  ctx.lineTo(46, 54);
  ctx.lineTo(4, 50);
  ctx.lineTo(46, 46);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTextWithLetterSpacing(ctx, text, centerX, y, spacing) {
  const chars = text.split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = centerX - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x + widths[i] / 2, y);
    x += widths[i] + spacing;
  }
}

/** Custom storybook cover — navy plate, double inset border, Playfair title
 *  block with ornaments. Generated lazily (font-await) per Page mount. */
function createCoverCanvasTexture() {
  const canvasW = 1024;
  const canvasH = Math.round((canvasW * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#2e3c5f";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Deep radial vignette so the title block feels lit from center.
  const vignette = ctx.createRadialGradient(
    canvasW / 2,
    canvasH / 2,
    canvasW * 0.2,
    canvasW / 2,
    canvasH / 2,
    canvasW * 0.85
  );
  vignette.addColorStop(0, "rgba(60, 76, 119, 0)");
  vignette.addColorStop(1, "rgba(15, 22, 42, 0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Double inset border (outer thick, inner hairline).
  const borderStroke = "rgba(200, 204, 215, 0.62)";
  ctx.strokeStyle = borderStroke;
  ctx.lineWidth = 2;
  const ox = canvasW * 0.07;
  const oy = canvasH * 0.055;
  ctx.strokeRect(ox, oy, canvasW - ox * 2, canvasH - oy * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(200, 204, 215, 0.45)";
  const ix = canvasW * 0.085;
  const iy = canvasH * 0.07;
  ctx.strokeRect(ix, iy, canvasW - ix * 2, canvasH - iy * 2);

  const fontFamily = '"Playfair Display", Georgia, "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Top ornament
  ctx.fillStyle = "rgba(200, 204, 215, 0.85)";
  ctx.font = `italic 400 ${Math.round(canvasW * 0.036)}px ${fontFamily}`;
  ctx.fillText("·  ✦  ·", canvasW / 2, canvasH * 0.2);

  // Title — Playfair small caps, palette light, wide tracking.
  ctx.fillStyle = "#c8ccd7";
  ctx.font = `500 ${Math.round(canvasW * 0.108)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "BAILEY  KOO",
    canvasW / 2,
    canvasH * 0.42,
    canvasW * 0.02
  );

  // Hairline rule under the title.
  ctx.strokeStyle = "rgba(200, 204, 215, 0.55)";
  ctx.lineWidth = 1;
  const ruleY = canvasH * 0.485;
  const ruleHalf = canvasW * 0.18;
  ctx.beginPath();
  ctx.moveTo(canvasW / 2 - ruleHalf, ruleY);
  ctx.lineTo(canvasW / 2 + ruleHalf, ruleY);
  ctx.stroke();

  // Italic subtitle
  ctx.fillStyle = "rgba(200, 204, 215, 0.92)";
  ctx.font = `italic 400 ${Math.round(canvasW * 0.062)}px ${fontFamily}`;
  ctx.fillText("DSGN 1030", canvasW / 2, canvasH * 0.555);

  // Small caps tagline
  ctx.fillStyle = "rgba(200, 204, 215, 0.7)";
  ctx.font = `italic 400 ${Math.round(canvasW * 0.038)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "IN THREE CHAPTERS",
    canvasW / 2,
    canvasH * 0.615,
    canvasW * 0.012
  );

  // Bottom ornament
  ctx.fillStyle = "rgba(200, 204, 215, 0.7)";
  ctx.font = `italic 400 ${Math.round(canvasW * 0.034)}px ${fontFamily}`;
  ctx.fillText("·  ✦  ·", canvasW / 2, canvasH * 0.83);

  // Year mark in roman numerals
  ctx.fillStyle = "rgba(200, 204, 215, 0.55)";
  ctx.font = `italic 400 ${Math.round(canvasW * 0.026)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "MMXXVII",
    canvasW / 2,
    canvasH * 0.88,
    canvasW * 0.02
  );

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Spine pinstripe — palette navy with horizontal hairline rules and a
 *  centered ornament. Tall thin canvas so UVs map cleanly onto each page's
 *  -x face; stacked pages line up into a continuous "ribbed hardcover" look. */
function createSpinePinstripeTexture() {
  const w = 32;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2e3c5f";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(200, 204, 215, 0.3)";
  ctx.lineWidth = 1;
  const stripeRatios = [0.16, 0.34, 0.5, 0.66, 0.84];
  for (const r of stripeRatios) {
    const y = Math.round(h * r);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Constellation endpaper — soft scattered navy dots, a few small star marks,
 *  hairline connecting lines, and a centered ornament. Replaces the flat
 *  blank-leaf fill so pages 3–4 read as decorative endpapers. */
function createConstellationEndpaperTexture() {
  const w = 1024;
  const h = Math.round((w * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#dde1ea";
  ctx.fillRect(0, 0, w, h);

  // Deterministic PRNG so the constellation doesn't reshuffle on re-renders.
  let rng = 17;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return (rng & 0xffffff) / 0xffffff;
  };

  // Scattered small dots (the "stars" of the constellation).
  ctx.fillStyle = "rgba(46, 60, 95, 0.2)";
  const dots = [];
  for (let i = 0; i < 28; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 1.4 + rand() * 1.8;
    dots.push({ x, y });
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hairline strokes between a handful of dots — actual constellation lines.
  ctx.strokeStyle = "rgba(46, 60, 95, 0.13)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    const a = dots[Math.floor(rand() * dots.length)];
    const b = dots[Math.floor(rand() * dots.length)];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // A few prominent sparkle stars on top.
  ctx.fillStyle = "rgba(46, 60, 95, 0.22)";
  for (let i = 0; i < 5; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = 12 + rand() * 10;
    drawStarPath(ctx, x, y, size);
  }

  // Centered ornament so the page reads as a designed plate, not noise.
  ctx.fillStyle = "rgba(46, 60, 95, 0.3)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `italic 400 ${Math.round(
    w * 0.03
  )}px "Playfair Display", Georgia, serif`;
  ctx.fillText("·  ✦  ·", w / 2, h * 0.5);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Twilight wash for photo pages: photo cover-fit on a light palette base,
 *  multiplied with a navy overlay and a soft corner vignette so raw jpgs
 *  feel like illustrated storybook plates. */
function createTwilightPhotoTexture(imgEl) {
  if (!imgEl?.complete || !(imgEl.naturalWidth || imgEl.width)) return null;
  const w = 1024;
  const h = Math.round((w * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#c8ccd7";
  ctx.fillRect(0, 0, w, h);

  const iw = imgEl.naturalWidth || imgEl.width;
  const ih = imgEl.naturalHeight || imgEl.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(imgEl, dx, dy, dw, dh);

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(46, 60, 95, 0.3)";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  const vignette = ctx.createRadialGradient(
    w / 2,
    h / 2,
    w * 0.28,
    w / 2,
    h / 2,
    w * 0.78
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(20, 28, 50, 0.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const SPINE_PINSTRIPE_TEXTURE = createSpinePinstripeTexture();
const CONSTELLATION_ENDPAPER_TEXTURE = createConstellationEndpaperTexture();

const pageMaterials = [
  // +x (fore edge) — gilded warm leaf
  new MeshStandardMaterial({
    color: GILDED_EDGE_COLOR,
    roughness: 0.55,
  }),
  // -x (spine) — palette navy with hairline pinstripes
  new MeshStandardMaterial({
    color: whiteColor,
    map: SPINE_PINSTRIPE_TEXTURE,
    roughness: 0.4,
  }),
  // +y (head) — gilded
  new MeshStandardMaterial({
    color: GILDED_EDGE_COLOR,
    roughness: 0.55,
  }),
  // -y (tail) — gilded
  new MeshStandardMaterial({
    color: GILDED_EDGE_COLOR,
    roughness: 0.55,
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
  const [dsgn1030BackTexture, setDsgn1030BackTexture] = useState(null);
  const [coverTexture, setCoverTexture] = useState(null);

  // Generate the storybook cover once Playfair Display has loaded — keeps the
  // title block crisp instead of rendering against the Georgia fallback.
  useEffect(() => {
    if (!isPage0Back) return;
    let cancelled = false;
    const generate = () => {
      if (cancelled) return;
      const tex = createCoverCanvasTexture();
      setCoverTexture((prev) => {
        prev?.dispose?.();
        return tex;
      });
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(generate);
    } else {
      generate();
    }
    return () => {
      cancelled = true;
      setCoverTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isPage0Back]);

  // Twilight wash for Exercise 1's back photo (DSC00983.jpg). Composes the
  // photo cover-fit on a light base, multiplies a navy overlay, and applies a
  // soft vignette so the page reads as an illustrated plate.
  useEffect(() => {
    if (!isDsgn1030Page || !picture2) return;
    function composeBack() {
      const tex = createTwilightPhotoTexture(picture2.image);
      if (!tex) return;
      setDsgn1030BackTexture((prev) => {
        prev?.dispose?.();
        return tex;
      });
    }
    if (picture2.image?.complete) {
      composeBack();
    } else if (picture2.image) {
      picture2.image.onload = composeBack;
    }
    return () => {
      if (picture2.image) picture2.image.onload = null;
      setDsgn1030BackTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isDsgn1030Page, picture2]);
  
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
      // Page 0: front shows custom storybook cover canvas (or book-cover.jpg
      // until Playfair has loaded and our cover is composited), back is Bailey.png
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = coverTexture || picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map = picture2;
    } else if (isDsgn1030Page) {
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map =
        dsgn1030FrontTexture || picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map =
        dsgn1030BackTexture || picture2;
    } else if (isBlankLeafAfterExercise1) {
      // Endpapers: light palette ground + scattered constellation marks.
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = CONSTELLATION_ENDPAPER_TEXTURE;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map = CONSTELLATION_ENDPAPER_TEXTURE;
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
