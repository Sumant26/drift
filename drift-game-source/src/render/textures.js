import * as THREE from "three";
import { RenderError } from "../utils/errors.js";

/**
 * Builds a soft radial-gradient texture used for star points, engine glow,
 * and nebula sprites. Requires a `document`-like object with createElement.
 */
export function makeRadialTexture(doc, innerColor = "rgba(255,255,255,1)", outerColor = "rgba(255,255,255,0)") {
  if (!doc || typeof doc.createElement !== "function") {
    throw new RenderError("makeRadialTexture requires a document with createElement");
  }
  const size = 128;
  const canvas = doc.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new RenderError("Failed to acquire 2D canvas context for texture generation");
  }
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.4, innerColor);
  gradient.addColorStop(1, outerColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
