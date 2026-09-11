import * as THREE from "three";
import { RenderError } from "../utils/errors.js";

export const SHIP_THEMES = {
  arctic: {
    name: "Arctic Starlight",
    bodyColor: 0xeef1ff,
    bodyEmissive: 0x2a2f55,
    wingColor: 0xb9c4ff,
    wingEmissive: 0x3a2f6a,
    glowColor: 0x8fd6ff,
  },
  obsidian: {
    name: "Obsidian Void",
    bodyColor: 0x12141c,
    bodyEmissive: 0x4a1238,
    wingColor: 0x222638,
    wingEmissive: 0x6a1f5a,
    glowColor: 0xff3b94,
  },
  solar: {
    name: "Solar Phoenix",
    bodyColor: 0xffe4b5,
    bodyEmissive: 0x5a2d0c,
    wingColor: 0xffa500,
    wingEmissive: 0x6e2a00,
    glowColor: 0xff9922,
  },
  emerald: {
    name: "Emerald Genesis",
    bodyColor: 0xd4f8ea,
    bodyEmissive: 0x0c402d,
    wingColor: 0x5eead4,
    wingEmissive: 0x0f5b45,
    glowColor: 0x2ef8a0,
  },
};

/** Builds the ship's visual group: body, wings, engine glow, and local light. */
export function buildShip(glowTexture, initialThemeKey = "arctic") {
  if (!glowTexture) {
    throw new RenderError("buildShip requires a glow texture");
  }
  const theme = SHIP_THEMES[initialThemeKey] || SHIP_THEMES.arctic;
  const ship = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: theme.bodyColor,
    emissive: theme.bodyEmissive,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.8,
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.15, 4.4, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  ship.add(body);

  const wingMat = new THREE.MeshStandardMaterial({
    color: theme.wingColor,
    emissive: theme.wingEmissive,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.65,
  });
  const wingGeo = new THREE.BoxGeometry(3.4, 0.15, 1.4);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(1.55, 0, -0.4);
  wingL.rotation.z = 0.08;
  ship.add(wingL);

  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(-1.55, 0, -0.4);
  wingR.rotation.z = -0.08;
  ship.add(wingR);

  // Twin secondary winglets for sleek silhouette
  const wingletGeo = new THREE.BoxGeometry(0.8, 0.12, 0.9);
  const wingletL = new THREE.Mesh(wingletGeo, wingMat);
  wingletL.position.set(2.8, 0.25, -0.7);
  wingletL.rotation.z = 0.4;
  ship.add(wingletL);

  const wingletR = new THREE.Mesh(wingletGeo, wingMat);
  wingletR.position.set(-2.8, 0.25, -0.7);
  wingletR.rotation.z = -0.4;
  ship.add(wingletR);

  const glowMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: theme.glowColor,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.position.set(0, 0, -2.4);
  glow.scale.set(3.4, 3.4, 1);
  ship.add(glow);

  const shipLight = new THREE.PointLight(theme.glowColor, 1.2, 90, 2);
  shipLight.position.set(0, 0, -1);
  ship.add(shipLight);

  ship.userData = { bodyMat, wingMat, glowMat, shipLight, currentTheme: initialThemeKey };

  return ship;
}

/** Updates ship materials to a new visual theme */
export function setShipTheme(ship, themeKey) {
  if (!ship || !ship.userData) return;
  const theme = SHIP_THEMES[themeKey];
  if (!theme) return;

  const { bodyMat, wingMat, glowMat, shipLight } = ship.userData;
  if (bodyMat) {
    bodyMat.color.setHex(theme.bodyColor);
    bodyMat.emissive.setHex(theme.bodyEmissive);
  }
  if (wingMat) {
    wingMat.color.setHex(theme.wingColor);
    wingMat.emissive.setHex(theme.wingEmissive);
  }
  if (glowMat) {
    glowMat.color.setHex(theme.glowColor);
  }
  if (shipLight) {
    shipLight.color.setHex(theme.glowColor);
  }
  ship.userData.currentTheme = themeKey;
}

/** Applies a plain {x,y,z} position and {x,y,z} rotation onto the ship group. */
export function applyShipTransform(ship, position, rotation) {
  if (!ship) throw new RenderError("applyShipTransform requires a ship object");
  ship.position.set(position.x, position.y, position.z);
  ship.rotation.set(rotation.x, rotation.y, rotation.z);
}
