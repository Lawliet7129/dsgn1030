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

/** Top inset for pj1-1 (About Me back) only — changing this does not affect pj1-2.
 *  Bumped slightly to leave room for the chapter running-head. */
const PJ1_ABOUT_ME_BACK_TOP_MARGIN_RATIO = 0.18;
/** Top inset for pj1-2 (Exercise 1 / leaf 2 front) only — set equal to the About Me value when you want them to match.
 *  Bumped up (lower number) so the large image clears the chapter inset border at the bottom. */
const PJ1_DSGN_1030_FRONT_TOP_MARGIN_RATIO = 0.48;

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
 *  Optional `circularOverlayImg`: pj1-3 on Exercise 1 front — drawn on top, circular, slightly right.
 *  Optional `chapterFrameOpts`: if present, the storybook chapter frame is overlaid
 *    on top of the photo composition (used by every interior pj1 page). */
function createPj1TopThirdCanvasTextureFromImage(
  img,
  topMarginRatio,
  captionLines,
  circularOverlayImg,
  chapterFrameOpts
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
    // Shifted down (was 0.27) so the circular overlay clears the chapter
    // running-head at the top of the page.
    const centerY = canvasH * 0.32;
    drawImageCircularCover(
      ctx,
      circularOverlayImg,
      centerX,
      centerY,
      circleRadius
    );
  }

  // Storybook chapter frame on top of the photo composition.
  if (chapterFrameOpts) {
    drawChapterFrame(ctx, canvasW, canvasH, chapterFrameOpts);
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

/** Render `text` with extra spacing between characters. Honors the caller's
 *  current `ctx.textAlign` ("left", "center", or "right") so the same helper
 *  works for any anchoring. Restores `textAlign` to whatever the caller set. */
function drawTextWithLetterSpacing(ctx, text, anchorX, y, spacing) {
  const align = ctx.textAlign;
  const chars = text.split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let startX;
  if (align === "center") startX = anchorX - total / 2;
  else if (align === "right") startX = anchorX - total;
  else startX = anchorX;
  ctx.textAlign = "left";
  let cur = startX;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cur, y);
    cur += widths[i] + spacing;
  }
  ctx.textAlign = align;
}

/** Standardized chapter framing for every interior page of the book.
 *  Two modes:
 *   - "title": large centered top header (✦ + CHAPTER LABEL + rule) plus a
 *     full footer (rule + ✦ + closing line). Used for chapter title pages.
 *   - "interior": minimal running head — just chapter label (top-left) and
 *     subtitle (top-right). No central content, so it never collides with
 *     existing image/caption layouts on the pj1 / twilight pages.
 *  Both modes always draw the double inset border so every page reads as
 *  belonging to the same hardcover book.
 *  `inkOnLight` flips ink color: navy ink on light pages (default), or light
 *  ink on dark/photo pages. */
function drawChapterFrame(ctx, W, H, opts) {
  const {
    mode = "title",
    chapterLabel = "",
    subtitle = "",
    closingLine = "",
    inkOnLight = true,
  } = opts || {};
  const inkAlpha = (a) =>
    inkOnLight
      ? `rgba(46, 60, 95, ${a})`
      : `rgba(200, 204, 215, ${a})`;
  const fontFamily =
    '"Playfair Display", Georgia, "Times New Roman", serif';

  // Double inset border (shared across both modes).
  ctx.strokeStyle = inkAlpha(0.45);
  ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.07, H * 0.055, W * 0.86, H * 0.89);
  ctx.lineWidth = 1;
  ctx.strokeStyle = inkAlpha(0.25);
  ctx.strokeRect(W * 0.085, H * 0.07, W * 0.83, H * 0.86);

  ctx.textBaseline = "middle";

  if (mode === "interior") {
    // Running head — top-left chapter, top-right subtitle.
    ctx.fillStyle = inkAlpha(0.6);
    ctx.font = `italic 400 ${Math.round(W * 0.02)}px ${fontFamily}`;
    if (chapterLabel) {
      ctx.textAlign = "left";
      drawTextWithLetterSpacing(
        ctx,
        chapterLabel,
        W * 0.1,
        H * 0.077,
        W * 0.012
      );
    }
    if (subtitle) {
      ctx.textAlign = "right";
      drawTextWithLetterSpacing(
        ctx,
        subtitle,
        W * 0.9,
        H * 0.077,
        W * 0.012
      );
    }
    return;
  }

  // === Title mode === (chapter title pages, blank chapter plates)
  ctx.textAlign = "center";
  ctx.fillStyle = inkAlpha(0.75);
  ctx.font = `italic 400 ${Math.round(W * 0.034)}px ${fontFamily}`;
  ctx.fillText("·  ✦  ·", W / 2, H * 0.085);

  if (chapterLabel) {
    ctx.fillStyle = inkAlpha(0.65);
    ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
    drawTextWithLetterSpacing(
      ctx,
      chapterLabel,
      W / 2,
      H * 0.115,
      W * 0.018
    );
  }

  ctx.strokeStyle = inkAlpha(0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.42, H * 0.14);
  ctx.lineTo(W * 0.58, H * 0.14);
  ctx.stroke();

  // Footer
  ctx.strokeStyle = inkAlpha(0.3);
  ctx.beginPath();
  ctx.moveTo(W * 0.42, H * 0.85);
  ctx.lineTo(W * 0.58, H * 0.85);
  ctx.stroke();

  ctx.fillStyle = inkAlpha(0.65);
  ctx.font = `italic 400 ${Math.round(W * 0.024)}px ${fontFamily}`;
  ctx.fillText("·  ✦  ·", W / 2, H * 0.88);

  if (closingLine) {
    ctx.fillStyle = inkAlpha(0.55);
    ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
    ctx.fillText(closingLine, W / 2, H * 0.91);
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

/** Simple Disney-ish castle silhouette filled in the caller's current
 *  `ctx.fillStyle`. Three towers (left, central spire, right) connected by
 *  short walls. Used as a faint watermark on the inside cover canvas. */
function drawCastleSilhouette(ctx, x, y, w) {
  const h = w;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.72);
  ctx.lineTo(w * 0.16, h * 0.72);
  ctx.lineTo(w * 0.16, h * 0.48);
  ctx.lineTo(w * 0.245, h * 0.32);
  ctx.lineTo(w * 0.33, h * 0.48);
  ctx.lineTo(w * 0.33, h * 0.72);
  ctx.lineTo(w * 0.38, h * 0.72);
  ctx.lineTo(w * 0.38, h * 0.58);
  ctx.lineTo(w * 0.42, h * 0.58);
  ctx.lineTo(w * 0.42, h * 0.26);
  ctx.lineTo(w * 0.5, h * 0.06);
  ctx.lineTo(w * 0.58, h * 0.26);
  ctx.lineTo(w * 0.58, h * 0.58);
  ctx.lineTo(w * 0.62, h * 0.58);
  ctx.lineTo(w * 0.62, h * 0.72);
  ctx.lineTo(w * 0.67, h * 0.72);
  ctx.lineTo(w * 0.67, h * 0.48);
  ctx.lineTo(w * 0.755, h * 0.32);
  ctx.lineTo(w * 0.84, h * 0.48);
  ctx.lineTo(w * 0.84, h * 0.72);
  ctx.lineTo(w, h * 0.72);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Small star above the central spire
  drawStarPath(ctx, w * 0.5, h * 0.015, w * 0.07);
  ctx.restore();
}

/** Inside cover (leaf 0 back) — a "Dramatis Personae" typographic plate that
 *  replaces the old black-and-white Bailey.png photo. Same spirit as the
 *  reference (asymmetric collage of interests at varied scales), but recast
 *  in Playfair, palette navy & light, with a castle silhouette in place of
 *  the Greek bust. */
function createCoverBackCanvasTexture() {
  const W = 1024;
  const H = Math.round((W * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Navy ground + soft center-lit vignette so the title block carries the eye.
  ctx.fillStyle = "#2e3c5f";
  ctx.fillRect(0, 0, W, H);
  const vignette = ctx.createRadialGradient(
    W / 2,
    H * 0.45,
    W * 0.2,
    W / 2,
    H * 0.5,
    W * 0.95
  );
  vignette.addColorStop(0, "rgba(60, 76, 119, 0)");
  vignette.addColorStop(1, "rgba(15, 22, 42, 0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Double inset border to match the cover (so the two pages read as a pair).
  ctx.strokeStyle = "rgba(200, 204, 215, 0.55)";
  ctx.lineWidth = 2;
  const ox = W * 0.07;
  const oy = H * 0.055;
  ctx.strokeRect(ox, oy, W - ox * 2, H - oy * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(200, 204, 215, 0.35)";
  ctx.strokeRect(W * 0.085, H * 0.07, W * 0.83, H * 0.86);

  // Castle silhouette watermark (where the reference image has the statue).
  ctx.fillStyle = "rgba(200, 204, 215, 0.14)";
  drawCastleSilhouette(ctx, W * 0.65, H * 0.17, W * 0.27);

  const fontFamily = '"Playfair Display", Georgia, "Times New Roman", serif';

  // === HEADER ===
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(200, 204, 215, 0.85)";
  ctx.font = `italic 400 ${Math.round(W * 0.034)}px ${fontFamily}`;
  ctx.fillText("·  ✦  ·", W / 2, H * 0.1);

  ctx.fillStyle = "rgba(200, 204, 215, 0.7)";
  ctx.font = `italic 400 ${Math.round(W * 0.021)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "DRAMATIS PERSONAE",
    W / 2,
    H * 0.127,
    W * 0.018
  );

  ctx.strokeStyle = "rgba(200, 204, 215, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.42, H * 0.147);
  ctx.lineTo(W * 0.58, H * 0.147);
  ctx.stroke();

  // === TITLE BLOCK (upper-left) ===
  ctx.fillStyle = "#c8ccd7";
  ctx.textAlign = "left";
  ctx.font = `italic 500 ${Math.round(W * 0.115)}px ${fontFamily}`;
  ctx.fillText("Bailey", W * 0.1, H * 0.225);
  ctx.fillText("Koo", W * 0.1, H * 0.305);

  ctx.fillStyle = "rgba(200, 204, 215, 0.92)";
  ctx.font = `400 ${Math.round(W * 0.034)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "UNIVERSITY  OF",
    W * 0.1,
    H * 0.36,
    W * 0.005
  );
  drawTextWithLetterSpacing(
    ctx,
    "PENNSYLVANIA",
    W * 0.1,
    H * 0.38,
    W * 0.005
  );

  ctx.fillStyle = "rgba(200, 204, 215, 0.75)";
  ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
  ctx.fillText("Class of 2027", W * 0.1, H * 0.405);

  // Editorial credits — incoming role + past internships.
  ctx.fillStyle = "rgba(200, 204, 215, 0.92)";
  ctx.font = `italic 400 ${Math.round(W * 0.023)}px ${fontFamily}`;
  ctx.fillText(
    "Incoming · Quantitative Research Developer",
    W * 0.1,
    H * 0.428
  );

  ctx.fillStyle = "rgba(200, 204, 215, 0.65)";
  ctx.font = `italic 400 ${Math.round(W * 0.021)}px ${fontFamily}`;
  ctx.fillText("previously · Palantir · Daangn", W * 0.1, H * 0.453);

  ctx.strokeStyle = "rgba(200, 204, 215, 0.3)";
  ctx.beginPath();
  ctx.moveTo(W * 0.1, H * 0.477);
  ctx.lineTo(W * 0.32, H * 0.477);
  ctx.stroke();

  // === LEFT COLUMN: Practice ===
  ctx.fillStyle = "rgba(200, 204, 215, 0.6)";
  ctx.textAlign = "left";
  ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "·  PRACTICE  ·",
    W * 0.1,
    H * 0.498,
    W * 0.012
  );

  ctx.fillStyle = "#c8ccd7";
  ctx.font = `italic 500 ${Math.round(W * 0.058)}px ${fontFamily}`;
  ctx.fillText("Computer", W * 0.1, H * 0.543);
  ctx.fillText("Science", W * 0.1, H * 0.583);

  ctx.fillStyle = "rgba(200, 204, 215, 0.78)";
  ctx.font = `italic 400 ${Math.round(W * 0.024)}px ${fontFamily}`;
  ctx.fillText("Three.js · Computer Graphics", W * 0.1, H * 0.618);
  ctx.fillText("Full-Stack Engineering", W * 0.1, H * 0.643);

  // Decorative formulas
  ctx.fillStyle = "rgba(200, 204, 215, 0.42)";
  ctx.font = `italic 400 ${Math.round(W * 0.023)}px ${fontFamily}`;
  ctx.fillText("y = 2 − x³", W * 0.1, H * 0.683);
  ctx.fillText("π(x) ~ x ⁄ ln x", W * 0.1, H * 0.71);

  ctx.fillStyle = "#c8ccd7";
  ctx.font = `italic 500 ${Math.round(W * 0.04)}px ${fontFamily}`;
  ctx.fillText("Quantitative", W * 0.1, H * 0.753);
  ctx.fillText("Research", W * 0.1, H * 0.788);

  ctx.fillStyle = "rgba(200, 204, 215, 0.7)";
  ctx.font = `italic 400 ${Math.round(W * 0.021)}px ${fontFamily}`;
  ctx.fillText("Trading · Strategy", W * 0.1, H * 0.813);

  // === RIGHT COLUMN: Pursuits ===
  ctx.fillStyle = "rgba(200, 204, 215, 0.6)";
  ctx.textAlign = "right";
  ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "·  PURSUITS  ·",
    W * 0.9,
    H * 0.498,
    W * 0.012
  );

  // "Mathematics" — large italic, the right column's flourish word.
  ctx.fillStyle = "#c8ccd7";
  ctx.font = `italic 500 ${Math.round(W * 0.078)}px ${fontFamily}`;
  ctx.fillText("Mathematics", W * 0.9, H * 0.555);

  ctx.fillStyle = "rgba(200, 204, 215, 0.78)";
  ctx.font = `italic 400 ${Math.round(W * 0.026)}px ${fontFamily}`;
  ctx.fillText("Analytic Number Theory", W * 0.9, H * 0.598);
  ctx.fillText("Elliptic Curves", W * 0.9, H * 0.625);
  ctx.fillText("Prime Number Theorem", W * 0.9, H * 0.652);

  // === Pastimes (right column) ===
  ctx.fillStyle = "rgba(200, 204, 215, 0.6)";
  ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "·  PASTIMES  ·",
    W * 0.9,
    H * 0.706,
    W * 0.012
  );

  // "Splendor" — the right column's flair word (matches reference's scale move).
  ctx.fillStyle = "#c8ccd7";
  ctx.font = `italic 500 ${Math.round(W * 0.09)}px ${fontFamily}`;
  ctx.fillText("Splendor", W * 0.9, H * 0.763);

  ctx.fillStyle = "rgba(200, 204, 215, 0.88)";
  ctx.font = `italic 400 ${Math.round(W * 0.042)}px ${fontFamily}`;
  ctx.fillText("Chess", W * 0.9, H * 0.813);

  // === Thesis tag — cross-disciplinary keywords spanning both columns ===
  ctx.fillStyle = "rgba(200, 204, 215, 0.7)";
  ctx.textAlign = "center";
  ctx.font = `italic 400 ${Math.round(W * 0.026)}px ${fontFamily}`;
  drawTextWithLetterSpacing(
    ctx,
    "THEORY  ·  ALGORITHM  ·  ML",
    W / 2,
    H * 0.85,
    W * 0.014
  );

  // === FOOTER ===
  ctx.strokeStyle = "rgba(200, 204, 215, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.42, H * 0.882);
  ctx.lineTo(W * 0.58, H * 0.882);
  ctx.stroke();

  ctx.fillStyle = "rgba(200, 204, 215, 0.75)";
  ctx.textAlign = "center";
  ctx.font = `italic 400 ${Math.round(W * 0.024)}px ${fontFamily}`;
  ctx.fillText("·  ✦  ·", W / 2, H * 0.905);

  ctx.fillStyle = "rgba(200, 204, 215, 0.6)";
  ctx.font = `italic 400 ${Math.round(W * 0.02)}px ${fontFamily}`;
  ctx.fillText(
    "Once upon a time, in West Philadelphia.",
    W / 2,
    H * 0.925
  );

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
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
 *  feel like illustrated storybook plates.
 *  Optional `chapterFrameOpts` overlays the shared storybook chapter frame
 *  (running head + border) on top of the washed photo. */
function createTwilightPhotoTexture(imgEl, chapterFrameOpts) {
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

  if (chapterFrameOpts) {
    drawChapterFrame(ctx, w, h, chapterFrameOpts);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Generic storybook photo plate — a centered photograph with an optional
 *  circular inset thumbnail, twilight wash for tonal cohesion with the rest
 *  of the book, a Playfair italic caption block below the photo, hairline
 *  plate borders around the image, and the standard chapter frame on top.
 *  Used for the Chapter IV (Project 3 — Chess) spread. */
function createPhotoPlateTexture(opts) {
  const {
    img,
    overlayImg = null,
    overlayCenter = { x: 0.78, y: 0.78 },
    overlayRadiusScale = 0.55,
    captionLines = [],
    chapterFrameOpts = null,
    topMarginRatio = 0.18,
    maxImageWidthRatio = 0.78,
    maxImageHeightRatio = 0.55,
    twilightWashAlpha = 0.2,
  } = opts || {};
  if (!img?.complete || !(img.naturalWidth || img.width)) return null;

  const W = 1024;
  const H = Math.round((W * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Light palette ground + soft radial halo so the page feels like paper,
  // not a flat fill.
  ctx.fillStyle = "#c8ccd7";
  ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(
    W * 0.5,
    H * 0.45,
    W * 0.1,
    W * 0.5,
    H * 0.5,
    W * 0.85
  );
  halo.addColorStop(0, "rgba(255, 255, 255, 0.45)");
  halo.addColorStop(1, "rgba(46, 60, 95, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Contain-fit the photo into a generous storybook plate.
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const maxW = W * maxImageWidthRatio;
  const maxH = H * maxImageHeightRatio;
  const scale = Math.min(maxW / iw, maxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (W - dw) / 2;
  const dy = H * topMarginRatio;

  ctx.drawImage(img, dx, dy, dw, dh);

  // Twilight wash clipped to the photo so the surrounding paper stays light.
  if (twilightWashAlpha > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(46, 60, 95, ${twilightWashAlpha})`;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.globalCompositeOperation = "source-over";
    // Inner-corner vignette for storybook plate depth.
    const vg = ctx.createRadialGradient(
      dx + dw / 2,
      dy + dh / 2,
      Math.min(dw, dh) * 0.32,
      dx + dw / 2,
      dy + dh / 2,
      Math.max(dw, dh) * 0.7
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(20, 28, 50, 0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.restore();
  }

  // Double hairline plate frame around the photo.
  ctx.strokeStyle = "rgba(46, 60, 95, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(dx, dy, dw, dh);
  ctx.strokeStyle = "rgba(46, 60, 95, 0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(dx + 6, dy + 6, dw - 12, dh - 12);

  // Optional circular inset (e.g. chess1 thumbnail beside chess3 hero).
  if (
    overlayImg?.complete &&
    (overlayImg.naturalWidth || overlayImg.width)
  ) {
    const cx = W * overlayCenter.x;
    const cy = H * overlayCenter.y;
    const radius =
      ABOUT_ME_PORTRAIT_CIRCLE_RADIUS *
      overlayRadiusScale *
      (W / 1024);
    drawImageCircularCover(ctx, overlayImg, cx, cy, radius);

    // Subtle navy wash inside the overlay to match the plate's twilight.
    if (twilightWashAlpha > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(46, 60, 95, ${twilightWashAlpha})`;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }

    // Double concentric ring around the overlay, echoing the About-Me portrait frame.
    ctx.strokeStyle = "rgba(46, 60, 95, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(46, 60, 95, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Caption — Playfair italic, centered under the photo.
  if (captionLines.length) {
    const fontFamily =
      '"Playfair Display", Georgia, "Times New Roman", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const fontSize = Math.round(W * 0.04);
    ctx.font = `italic 500 ${fontSize}px ${fontFamily}`;
    const lineHeight = Math.round(fontSize * 1.18);
    let textY = dy + dh + H * 0.04;
    captionLines.forEach((line, idx) => {
      ctx.fillStyle = `rgba(46, 60, 95, ${idx === 0 ? 0.82 : 0.6})`;
      ctx.fillText(line, W / 2, textY);
      textY += lineHeight;
    });
  }

  // Storybook chapter frame on top of everything.
  if (chapterFrameOpts) {
    drawChapterFrame(ctx, W, H, chapterFrameOpts);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Per-leaf storybook plate for the blank leaves after Exercise 1.
 *  Each plate uses the shared chapter frame (title mode), drifts a few
 *  constellation marks behind it, and centers a large italic subtitle plus a
 *  poetic placeholder line — turning the previously-empty pages into proper
 *  chapter title plates. `finale = true` flips the page to a navy ground for
 *  the very last page of the book, mirroring the front cover.            */
function createBlankChapterTexture(opts) {
  const {
    chapterLabel = "",
    subtitle = "",
    placeholder = "",
    closingLine = "",
    finale = false,
    seed = 13,
  } = opts || {};
  const W = 1024;
  const H = Math.round((W * PAGE_HEIGHT) / PAGE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Ground: light palette for normal chapter plates, navy for the finale.
  ctx.fillStyle = finale ? "#2e3c5f" : "#dde1ea";
  ctx.fillRect(0, 0, W, H);

  // Soft palette halo to keep the page from reading as a flat fill.
  const halo = ctx.createRadialGradient(
    W * 0.5,
    H * 0.5,
    W * 0.1,
    W * 0.5,
    H * 0.5,
    W * 0.85
  );
  if (finale) {
    halo.addColorStop(0, "rgba(148, 159, 182, 0.18)");
    halo.addColorStop(1, "rgba(46, 60, 95, 0)");
  } else {
    halo.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    halo.addColorStop(1, "rgba(46, 60, 95, 0)");
  }
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Deterministic constellation scatter — varies per chapter via seed.
  let rng = (seed * 2654435761) >>> 0;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return ((rng >>> 0) & 0xffffff) / 0xffffff;
  };

  const dotInk = finale ? "rgba(200, 204, 215," : "rgba(46, 60, 95,";
  // Scatter ~22 small dots within the inner frame.
  for (let i = 0; i < 22; i++) {
    const x = W * 0.12 + rand() * W * 0.76;
    const y = H * 0.16 + rand() * H * 0.68;
    const r = 1.1 + rand() * 1.8;
    const a = finale ? 0.22 + rand() * 0.25 : 0.16 + rand() * 0.22;
    ctx.fillStyle = `${dotInk} ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A handful of small sparkle stars.
  for (let i = 0; i < 4; i++) {
    const x = W * 0.15 + rand() * W * 0.7;
    const y = H * 0.18 + rand() * H * 0.6;
    const size = 9 + rand() * 7;
    const a = finale ? 0.55 : 0.4;
    ctx.fillStyle = `${dotInk} ${a})`;
    drawStarPath(ctx, x, y, size);
  }

  // Storybook chapter frame (title mode) over the constellation scatter.
  drawChapterFrame(ctx, W, H, {
    mode: "title",
    chapterLabel,
    closingLine,
    inkOnLight: !finale,
  });

  const fontFamily = '"Playfair Display", Georgia, "Times New Roman", serif';
  const inkAlpha = (a) =>
    finale ? `rgba(200, 204, 215, ${a})` : `rgba(46, 60, 95, ${a})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Large display subtitle (e.g. "Incomplete.", "Inconsistency.").
  // Supports explicit line breaks via "\n" for two-line chapter titles.
  if (subtitle) {
    ctx.fillStyle = inkAlpha(0.85);
    const subtitleSize = Math.round(W * 0.082);
    ctx.font = `italic 500 ${subtitleSize}px ${fontFamily}`;
    const subtitleLines = String(subtitle).split("\n");
    const lineHeight = subtitleSize * 0.96;
    const startY = H * 0.4 - ((subtitleLines.length - 1) * lineHeight) / 2;
    subtitleLines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, startY + idx * lineHeight);
    });
  }

  // Centered display star anchor between subtitle and placeholder.
  ctx.fillStyle = inkAlpha(finale ? 0.5 : 0.4);
  drawStarPath(ctx, W / 2, H * 0.52, 26);

  // Placeholder/poetic line
  if (placeholder) {
    ctx.fillStyle = inkAlpha(0.62);
    ctx.font = `italic 400 ${Math.round(W * 0.034)}px ${fontFamily}`;
    ctx.fillText(placeholder, W / 2, H * 0.62);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Per-blank-leaf chapter configuration — each leaf side gets its own title
 *  card. Indexed by Page.number, with .front / .back for the two faces.    */
const BLANK_CHAPTER_CONFIG = {
  3: {
    front: {
      chapterLabel: "CHAPTER THE THIRD",
      subtitle: "Project 1:\niPhone Modeling",
      placeholder: "Modeling from Reference",
      closingLine: "March 1 2026",
      seed: 31,
    },
    back: {
      chapterLabel: "CHAPTER THE FOURTH",
      subtitle: "Project 3:\nChess",
      placeholder: "— pieces of glass, pieces of mind —",
      closingLine: "in which strategy meets glass.",
      seed: 41,
    },
  },
  4: {
    front: {
      chapterLabel: "CHAPTER THE FOURTH",
      subtitle: "Project 3:\nChess",
      placeholder: "— pieces of glass, pieces of mind —",
      closingLine: "in which strategy meets glass.",
      seed: 42,
    },
    back: {
      chapterLabel: "CHAPTER THE FIFTH",
      subtitle: "Final Proj.",
      placeholder: "— the castle, in twilight —",
      closingLine: "in which the kingdom rises.",
      seed: 51,
    },
  },
  5: {
    front: {
      chapterLabel: "CHAPTER THE FIFTH",
      subtitle: "Final Proj.",
      placeholder: "— the castle, in twilight —",
      closingLine: "in which the kingdom rises.",
      seed: 52,
    },
    back: {
      chapterLabel: "FIN.",
      subtitle: "Fin.",
      placeholder: "— and they lived happily, in twilight —",
      closingLine: "thank you, for reading along.",
      finale: true,
      seed: 99,
    },
  },
};

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
  } else if (index === 3 || index === 4) {
    // Chapter IV (Project 3 — Chess) spread spans leaf 3 back + leaf 4 front.
    // Both leaves preload the same three source images so either Page mount
    // can composite immediately without a second network round-trip.
    useTexture.preload(`/textures/chess1.jpg`);
    useTexture.preload(`/textures/chess2.jpg`);
    useTexture.preload(`/textures/chess3.jpg`);
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
  // Chapter IV (Project 3 — Chess) spans leaf 3 back + leaf 4 front. Both
  // leaves load the same three source photos so each Page can composite the
  // face it owns from a shared image cache.
  const isChessSpreadPage = number === 3 || number === 4;

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
    : isChessSpreadPage
    ? [
        "/textures/chess1.jpg",
        "/textures/chess2.jpg",
        "/textures/chess3.jpg",
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
  const [coverBackTexture, setCoverBackTexture] = useState(null);
  const [blankFrontTexture, setBlankFrontTexture] = useState(null);
  const [blankBackTexture, setBlankBackTexture] = useState(null);
  // Chess spread (Chapter IV — Project 3). On leaf 3 we composite the back
  // face; on leaf 4 we composite the front face. Both share the same source
  // image trio (chess1/chess2/chess3) loaded into picture / picture2 / picture3.
  const [chessPlateTexture, setChessPlateTexture] = useState(null);
  // Live <video> stack for the back of leaf 2 (Project 1 iPhone reel).
  // We keep the <video> + an off-DOM <canvas> as refs, and expose a
  // CanvasTexture in state. useFrame redraws the canvas with the latest
  // video frame (cover-fit) while the page is opened.
  const videoElRef = useRef(null);
  const videoCanvasRef = useRef(null);
  const videoReadyRef = useRef(false);
  const [videoBackTexture, setVideoBackTexture] = useState(null);

  // Generate the storybook cover + its "Dramatis Personae" inside page once
  // Playfair Display has loaded. Both rely on crisp serif rendering, so we
  // wait for `document.fonts.ready` to avoid the Georgia fallback flash.
  useEffect(() => {
    if (!isPage0Back) return;
    let cancelled = false;
    const generate = () => {
      if (cancelled) return;
      const front = createCoverCanvasTexture();
      const back = createCoverBackCanvasTexture();
      setCoverTexture((prev) => {
        prev?.dispose?.();
        return front;
      });
      setCoverBackTexture((prev) => {
        prev?.dispose?.();
        return back;
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
      setCoverBackTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isPage0Back]);

  // Blank leaves after Exercise 1 — each side becomes its own storybook
  // chapter title plate ("Incomplete.", "Inconsistency.", "Final Proj.",
  // and the finale FIN page on the very last face). Generated lazily once
  // Playfair Display is ready so the chapter typesetting is crisp.
  useEffect(() => {
    if (!isBlankLeafAfterExercise1) return;
    const config = BLANK_CHAPTER_CONFIG[number];
    if (!config) return;
    let cancelled = false;
    const generate = () => {
      if (cancelled) return;
      const front = createBlankChapterTexture(config.front);
      const back = createBlankChapterTexture(config.back);
      setBlankFrontTexture((prev) => {
        prev?.dispose?.();
        return front;
      });
      setBlankBackTexture((prev) => {
        prev?.dispose?.();
        return back;
      });
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(generate);
    } else {
      generate();
    }
    return () => {
      cancelled = true;
      setBlankFrontTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
      setBlankBackTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isBlankLeafAfterExercise1, number]);

  // Chess spread plates — Chapter IV / Project 3.
  //
  //  leaf 3 back  (verso) ── chess2.jpg as a top-down "the board, in plan."
  //  leaf 4 front (recto) ── chess3.jpg hero shot with chess1.jpg circular
  //                          inset, captioned "a duel of glass."
  //
  // Both faces share the chess1 / chess2 / chess3 textures preloaded into
  // picture / picture2 / picture3 for this leaf, so the composite can happen
  // immediately once the page mounts and Playfair is ready.
  useEffect(() => {
    if (!isChessSpreadPage) return;
    if (!picture || !picture2 || !picture3) return;
    let cancelled = false;

    const compose = () => {
      if (cancelled) return;
      const chess1 = picture.image;
      const chess2 = picture2.image;
      const chess3 = picture3.image;
      if (!chess1?.complete || !chess2?.complete || !chess3?.complete) return;

      let tex;
      if (number === 3) {
        // Leaf 3 back: chess2 as the surveyor's map plate.
        tex = createPhotoPlateTexture({
          img: chess2,
          captionLines: [
            "PROJECT 2: Recursive Chessboard"
          ],
          chapterFrameOpts: {
            mode: "interior",
            chapterLabel: "CHAPTER IV",
            subtitle: "PROJECT 2: Recursive Chessboard",
          },
          topMarginRatio: 0.2,
          maxImageWidthRatio: 0.72,
          maxImageHeightRatio: 0.58,
          twilightWashAlpha: 0.18,
        });
      } else if (number === 4) {
        // Leaf 4 front: chess3 hero close-up + chess1 circular inset
        // positioned in the lower-right plate area like a portal.
        tex = createPhotoPlateTexture({
          img: chess3,
          overlayImg: chess1,
          overlayCenter: { x: 0.78, y: 0.8 },
          overlayRadiusScale: 0.55,
          captionLines: [
            "Environmental Renders with Arnold",
            "Mar 29 2026",
          ],
          chapterFrameOpts: {
            mode: "interior",
            chapterLabel: "CHAPTER IV",
            subtitle: "PROJECT 3",
          },
          topMarginRatio: 0.18,
          maxImageWidthRatio: 0.78,
          maxImageHeightRatio: 0.5,
          twilightWashAlpha: 0.22,
        });
      }

      if (!tex) return;
      setChessPlateTexture((prev) => {
        prev?.dispose?.();
        return tex;
      });
    };

    const whenReady = () => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(compose);
      } else {
        compose();
      }
    };

    // Compose now if all three images are decoded, otherwise wait on the
    // slowest one. Three.js's useTexture sets `complete` once the underlying
    // HTMLImageElement has decoded.
    const imgs = [picture.image, picture2.image, picture3.image];
    const pending = imgs.filter((im) => im && !im.complete);
    if (pending.length === 0) {
      whenReady();
    } else {
      pending.forEach((im) => {
        im.addEventListener("load", whenReady, { once: true });
      });
    }

    return () => {
      cancelled = true;
      imgs.forEach((im) => {
        if (im) im.removeEventListener("load", whenReady);
      });
      setChessPlateTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isChessSpreadPage, number, picture, picture2, picture3]);

  // Twilight wash for Exercise 1's back photo (DSC00983.jpg). Composes the
  // photo cover-fit on a light base, multiplies a navy overlay, applies a
  // soft vignette, then overlays the shared chapter frame (running head for
  // Chapter the Third — Incomplete., the verso facing the next chapter).
  //
  // We wait for `document.fonts.ready` so the Playfair-typeset running head
  // does not flash in the Georgia fallback.
  useEffect(() => {
    if (!isDsgn1030Page || !picture2) return;
    let cancelled = false;
    function composeBack() {
      if (cancelled) return;
      const tex = createTwilightPhotoTexture(picture2.image, {
        mode: "interior",
        chapterLabel: "CHAPTER III",
        subtitle: "INCOMPLETE.",
        inkOnLight: false,
      });
      if (!tex) return;
      setDsgn1030BackTexture((prev) => {
        prev?.dispose?.();
        return tex;
      });
    }
    function whenReady() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(composeBack);
      } else {
        composeBack();
      }
    }
    if (picture2.image?.complete) {
      whenReady();
    } else if (picture2.image) {
      picture2.image.onload = whenReady;
    }
    return () => {
      cancelled = true;
      if (picture2.image) picture2.image.onload = null;
      setDsgn1030BackTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isDsgn1030Page, picture2]);
  
  // About Me front — "Chapter the First" portrait plate. Composites the
  // circular selfportrait onto a 1024 × (1024 × H/W) canvas (matches page
  // aspect, so the crop is a true circle), wraps it in a double-ring frame
  // with four cardinal star ornaments, applies a subtle navy multiply wash
  // for tonal cohesion with the book, and adds Playfair header/caption/footer.
  useEffect(() => {
    if (!isAboutMePage || !picture) return;

    const W = 1024;
    const H = Math.round((W * PAGE_HEIGHT) / PAGE_WIDTH);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    function compose() {
      const img = picture.image;
      if (!img?.complete || !(img.naturalWidth || img.width)) return;
      const fontFamily =
        '"Playfair Display", Georgia, "Times New Roman", serif';

      // Light palette ground
      ctx.fillStyle = "#c8ccd7";
      ctx.fillRect(0, 0, W, H);

      // Soft radial halo behind the portrait — barely visible, adds depth.
      const halo = ctx.createRadialGradient(
        W / 2,
        H * 0.41,
        W * 0.1,
        W / 2,
        H * 0.41,
        W * 0.55
      );
      halo.addColorStop(0, "rgba(200, 204, 215, 0)");
      halo.addColorStop(1, "rgba(46, 60, 95, 0.07)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      // Double inset border (matches other pages' frame system).
      ctx.strokeStyle = "rgba(46, 60, 95, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(W * 0.07, H * 0.055, W * 0.86, H * 0.89);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(46, 60, 95, 0.25)";
      ctx.strokeRect(W * 0.085, H * 0.07, W * 0.83, H * 0.86);

      // === Header ===
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(46, 60, 95, 0.75)";
      ctx.font = `italic 400 ${Math.round(W * 0.034)}px ${fontFamily}`;
      ctx.fillText("·  ✦  ·", W / 2, H * 0.085);

      ctx.fillStyle = "rgba(46, 60, 95, 0.65)";
      ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
      drawTextWithLetterSpacing(
        ctx,
        "CHAPTER THE FIRST",
        W / 2,
        H * 0.115,
        W * 0.018
      );

      ctx.strokeStyle = "rgba(46, 60, 95, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.42, H * 0.14);
      ctx.lineTo(W * 0.58, H * 0.14);
      ctx.stroke();

      // === Portrait — double ring frame, circular crop, twilight wash ===
      const circleRadius = 290;
      const centerX = W / 2;
      const centerY = H * 0.41;

      ctx.strokeStyle = "rgba(46, 60, 95, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius + 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(46, 60, 95, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius + 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.clip();

      const imgAspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
      let dw;
      let dh;
      if (imgAspect > 1) {
        dh = circleRadius * 2;
        dw = dh * imgAspect;
      } else {
        dw = circleRadius * 2;
        dh = dw / imgAspect;
      }
      const dx = centerX - dw / 2;
      const dy = centerY - dh / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // Subtle cool/navy multiply wash so the B&W portrait reads as part of
      // the navy palette rather than a foreign element.
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(46, 60, 95, 0.2)";
      ctx.fillRect(dx, dy, dw, dh);
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // Four cardinal sparkles around the ring.
      ctx.fillStyle = "rgba(46, 60, 95, 0.55)";
      const starR = 18;
      const dist = circleRadius + 38;
      drawStarPath(ctx, centerX, centerY - dist, starR);
      drawStarPath(ctx, centerX, centerY + dist, starR);
      drawStarPath(ctx, centerX - dist, centerY, starR);
      drawStarPath(ctx, centerX + dist, centerY, starR);

      // === Caption ===
      ctx.fillStyle = "#2e3c5f";
      ctx.textAlign = "center";
      ctx.font = `italic 500 ${Math.round(W * 0.07)}px ${fontFamily}`;
      ctx.fillText("Bailey Koo", W / 2, H * 0.7);

      ctx.strokeStyle = "rgba(46, 60, 95, 0.3)";
      ctx.beginPath();
      ctx.moveTo(W * 0.43, H * 0.735);
      ctx.lineTo(W * 0.57, H * 0.735);
      ctx.stroke();

      ctx.fillStyle = "rgba(46, 60, 95, 0.7)";
      ctx.font = `italic 400 ${Math.round(W * 0.026)}px ${fontFamily}`;
      ctx.fillText("the storyteller", W / 2, H * 0.77);

      // === Footer ===
      ctx.strokeStyle = "rgba(46, 60, 95, 0.3)";
      ctx.beginPath();
      ctx.moveTo(W * 0.42, H * 0.85);
      ctx.lineTo(W * 0.58, H * 0.85);
      ctx.stroke();

      ctx.fillStyle = "rgba(46, 60, 95, 0.65)";
      ctx.font = `italic 400 ${Math.round(W * 0.024)}px ${fontFamily}`;
      ctx.fillText("·  ✦  ·", W / 2, H * 0.88);

      ctx.fillStyle = "rgba(46, 60, 95, 0.55)";
      ctx.font = `italic 400 ${Math.round(W * 0.022)}px ${fontFamily}`;
      ctx.fillText("in which I am introduced.", W / 2, H * 0.91);

      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
      setCircularTexture((prev) => {
        prev?.dispose?.();
        return texture;
      });
    }

    if (picture.image?.complete) {
      compose();
    } else if (picture.image) {
      picture.image.onload = compose;
    }
    // Re-compose once Playfair has finished loading so the header/caption
    // upgrade from Georgia fallback to crisp Playfair.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (picture.image?.complete) compose();
      });
    }

    return () => {
      if (picture.image) picture.image.onload = null;
      setCircularTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isAboutMePage, picture]);

  // About Me back: pj1-1 (margin: PJ1_ABOUT_ME_BACK_TOP_MARGIN_RATIO only).
  // This page is the verso of Chapter the Second (Exercise 1) — the user sees
  // it on the left when they open to Exercise 1 in the nav. So it carries a
  // running head pointing to Chapter II.
  useEffect(() => {
    if (!isAboutMePage || !picture2) return;
    let cancelled = false;

    function composeAboutMeBack() {
      if (cancelled) return;
      const texture = createPj1TopThirdCanvasTextureFromImage(
        picture2.image,
        PJ1_ABOUT_ME_BACK_TOP_MARGIN_RATIO,
        ["In-Class Exercise:", "Basic Table Scene"],
        undefined,
        {
          mode: "interior",
          chapterLabel: "CHAPTER II",
          subtitle: "EXERCISE 1",
        }
      );
      if (!texture) return;
      setAboutMeBackTexture((prev) => {
        prev?.dispose?.();
        return texture;
      });
    }

    function whenReady() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(composeAboutMeBack);
      } else {
        composeAboutMeBack();
      }
    }

    if (picture2.image?.complete) {
      whenReady();
    } else if (picture2.image) {
      picture2.image.onload = whenReady;
    }

    return () => {
      cancelled = true;
      if (picture2.image) picture2.image.onload = null;
      setAboutMeBackTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isAboutMePage, picture2]);

  // Exercise 1 front: pj1-2 composited + pj1-3 circular overlay on top.
  // This is the recto of Chapter the Second — its running head matches the
  // verso (leaf 1 back / pj1-1) so the open spread reads as one chapter.
  useEffect(() => {
    if (!isDsgn1030Page || !picture || !picture3) return;
    let cancelled = false;

    function composeDsgnFront() {
      if (cancelled) return;
      const base = picture.image;
      const overlay = picture3.image;
      if (!base?.complete || !base.width) return;
      if (!overlay?.complete || !(overlay.naturalWidth || overlay.width))
        return;

      const texture = createPj1TopThirdCanvasTextureFromImage(
        base,
        PJ1_DSGN_1030_FRONT_TOP_MARGIN_RATIO,
        undefined,
        overlay,
        {
          mode: "interior",
          chapterLabel: "CHAPTER II",
          subtitle: "EXERCISE 1",
        }
      );
      if (!texture) return;
      setDsgn1030FrontTexture((prev) => {
        prev?.dispose?.();
        return texture;
      });
    }

    function whenReady() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(composeDsgnFront);
      } else {
        composeDsgnFront();
      }
    }

    whenReady();
    if (picture.image) picture.image.onload = whenReady;
    if (picture3.image) picture3.image.onload = whenReady;

    return () => {
      cancelled = true;
      if (picture.image) picture.image.onload = null;
      if (picture3.image) picture3.image.onload = null;
      setDsgn1030FrontTexture((prev) => {
        prev?.dispose?.();
        return null;
      });
    };
  }, [isDsgn1030Page, picture, picture3]);

  // Project 1 iPhone reel — replaces the back face of leaf 2 with a live
  // <video> element drawn cover-fit into an off-screen canvas every frame.
  // The video is muted + looped so the browser allows programmatic playback,
  // and decoding pauses when the page is closed so we don't burn frames on
  // an invisible texture.
  useEffect(() => {
    if (!isDsgn1030Page) return;

    const W = 1024;
    const H = Math.round((W * PAGE_HEIGHT) / PAGE_WIDTH);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0f1f";
    ctx.fillRect(0, 0, W, H);
    videoCanvasRef.current = canvas;

    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;

    const video = document.createElement("video");
    video.src = "/textures/Project1iPhone.mp4";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    videoElRef.current = video;

    const onReady = () => {
      videoReadyRef.current = true;
      // Paint the first frame immediately so the page doesn't flash from
      // the previous twilight texture into black before useFrame ticks.
      if (video.videoWidth && video.videoHeight) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = Math.max(W / vw, H / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (W - dw) / 2;
        const dy = (H - dh) / 2;
        ctx.fillStyle = "#0a0f1f";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(video, dx, dy, dw, dh);
        tex.needsUpdate = true;
      }
      setVideoBackTexture(tex);
    };
    video.addEventListener("loadeddata", onReady);
    if (video.readyState >= 2) onReady();

    return () => {
      videoReadyRef.current = false;
      video.removeEventListener("loadeddata", onReady);
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {
        /* ignore */
      }
      videoElRef.current = null;
      videoCanvasRef.current = null;
      tex.dispose();
      setVideoBackTexture(null);
    };
  }, [isDsgn1030Page]);

  // Play/pause the iPhone reel based on whether leaf 2 is currently flipped
  // open (its back face visible). Pausing stops the decode loop and frees
  // GPU/CPU when the page is out of view.
  useEffect(() => {
    if (!isDsgn1030Page) return;
    const video = videoElRef.current;
    if (!video) return;
    if (opened) {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
  }, [opened, isDsgn1030Page, videoBackTexture]);

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
      // until Playfair has loaded), back shows the "Dramatis Personae" plate
      // (or Bailey.png until our canvas is composited).
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map = coverTexture || picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map = coverBackTexture || picture2;
    } else if (isDsgn1030Page) {
      // Push the latest video frame into the back-face canvas while the
      // page is opened. Drawn cover-fit so the iPhone reel keeps its
      // native aspect ratio regardless of the page's portrait shape.
      if (
        opened &&
        videoBackTexture &&
        videoReadyRef.current &&
        videoElRef.current &&
        videoCanvasRef.current
      ) {
        const video = videoElRef.current;
        const canvas = videoCanvasRef.current;
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) {
          const scale = Math.max(W / vw, H / vh);
          const dw = vw * scale;
          const dh = vh * scale;
          const dx = (W - dw) / 2;
          const dy = (H - dh) / 2;
          ctx.fillStyle = "#0a0f1f";
          ctx.fillRect(0, 0, W, H);
          ctx.drawImage(video, dx, dy, dw, dh);
          videoBackTexture.needsUpdate = true;
        }
      }

      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map =
        dsgn1030FrontTexture || picture;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map =
        videoBackTexture || dsgn1030BackTexture || picture2;
    } else if (isBlankLeafAfterExercise1) {
      // Per-leaf chapter title plates ("Project 2 · iPhone", "Project 3 ·
      // Chess", "Final Proj." and the navy FIN finale). Falls back to the
      // shared constellation endpaper until Playfair has loaded and the
      // per-leaf canvas finishes compositing.
      //
      // On the chess spread (Chapter IV / Project 3), the chess photo plate
      // takes precedence over the blank chapter plate for the face that
      // actually carries the spread artwork:
      //   • leaf 3 (number === 3): chess plate on the BACK face
      //   • leaf 4 (number === 4): chess plate on the FRONT face
      const chessOnFront = number === 4 ? chessPlateTexture : null;
      const chessOnBack = number === 3 ? chessPlateTexture : null;
      skinnedMeshRef.current.material[4].color = whiteColor;
      skinnedMeshRef.current.material[4].map =
        chessOnFront || blankFrontTexture || CONSTELLATION_ENDPAPER_TEXTURE;
      skinnedMeshRef.current.material[5].color = whiteColor;
      skinnedMeshRef.current.material[5].map =
        chessOnBack || blankBackTexture || CONSTELLATION_ENDPAPER_TEXTURE;
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
