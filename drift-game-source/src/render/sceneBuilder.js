import * as THREE from "three";
import { RenderError } from "../utils/errors.js";
import { makeRadialTexture } from "./textures.js";

export const BG_COLOR = 0x06040f;

/**
 * Creates the renderer, scene, camera, and lighting with Binary Twin Suns.
 */
export function buildScene(doc, width, height) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
  } catch (err) {
    throw new RenderError(`WebGL is not available in this browser: ${err.message}`);
  }
  if (!renderer.getContext()) {
    throw new RenderError("WebGL context could not be created");
  }

  renderer.setPixelRatio(Math.min(doc.defaultView?.devicePixelRatio ?? 1, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.FogExp2(BG_COLOR, 0.003);

  const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 3000);
  camera.position.set(0, 9, -24);

  const hemiLight = new THREE.HemisphereLight(0x8fa0ff, 0x1a0630, 0.7);
  scene.add(hemiLight);

  // Binary Sun 1 (Primary luminous sun)
  const sun1 = new THREE.DirectionalLight(0xfff4e0, 0.85);
  sun1.position.set(90, 140, -50);
  scene.add(sun1);

  // Binary Sun 2 (Secondary cooler amber/cyan companion star)
  const sun2 = new THREE.DirectionalLight(0xa5c4ff, 0.45);
  sun2.position.set(-110, 80, -90);
  scene.add(sun2);

  const ambientLight = new THREE.AmbientLight(0x404070, 0.35);
  scene.add(ambientLight);

  const glowTexture = makeRadialTexture(doc);

  // Distant glowing sun sprites in skybox
  const sunSpriteMat1 = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffe6b0,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sunSprite1 = new THREE.Sprite(sunSpriteMat1);
  sunSprite1.scale.set(120, 120, 1);
  sunSprite1.position.set(450, 700, -250);
  scene.add(sunSprite1);

  const sunSpriteMat2 = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x90c0ff,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sunSprite2 = new THREE.Sprite(sunSpriteMat2);
  sunSprite2.scale.set(80, 80, 1);
  sunSprite2.position.set(-550, 400, -450);
  scene.add(sunSprite2);

  const starfield = buildStarfield(scene, camera, glowTexture);
  scene.add(camera);

  return { renderer, scene, camera, glowTexture, hemiLight, sun1, sun2, sunSprite1, sunSprite2, starfield };
}

/** Updates scene background, fog, and binary sun orbital lighting */
export function updateAtmosphere(scene, hemiLight, biome, delta, _elapsed = 0) {
  if (!scene || !biome) return;
  const targetBg = new THREE.Color(biome.skyColor);
  const targetAmbient = new THREE.Color(biome.ambientColor);

  scene.background.lerp(targetBg, Math.min(1, delta * 1.5));
  if (scene.fog) {
    scene.fog.color.lerp(targetBg, Math.min(1, delta * 1.5));
    scene.fog.density += (biome.fogDensity - scene.fog.density) * Math.min(1, delta * 1.5);
  }
  if (hemiLight) {
    hemiLight.groundColor.lerp(targetAmbient, Math.min(1, delta * 1.5));
  }
}

/** Builds a starfield attached to the camera */
function buildStarfield(scene, camera, glowTexture, starCount = 3400) {
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const baseColor = new THREE.Color(0xffffff);
  const tintColor = new THREE.Color(0xaec8ff);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 1900;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1900;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1900;

    const col = Math.random() > 0.35 ? baseColor : tintColor;
    colors[i * 3 + 0] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 1.7,
    sizeAttenuation: true,
    map: glowTexture,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(geometry, material);
  camera.add(stars);
  return stars;
}

/** Handles window resize by updating camera aspect and renderer size. */
export function resizeScene(renderer, camera, width, height) {
  if (width <= 0 || height <= 0) {
    throw new RenderError(`Invalid resize dimensions: ${width}x${height}`);
  }
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
