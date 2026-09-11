import { ValidationError } from "../utils/errors.js";

export const BIOMES = Object.freeze([
  {
    id: "opal-nebula",
    name: "Violet Opal Nebula",
    subtitle: "Crystalline dust clouds and ancient amethyst formations",
    baseHue: 0.78, // Violet / Magenta
    ambientColor: 0x221338,
    skyColor: 0x070412,
    fogDensity: 0.003,
    starColor: 0xd6c2ff,
    trailColor: 0xa87ffb,
    crystalHueOffset: 0.08,
  },
  {
    id: "solar-expanse",
    name: "Solar Flare Expanse",
    subtitle: "Warm amber lanes orbiting distant newborn stars",
    baseHue: 0.11, // Amber / Gold
    ambientColor: 0x3d230e,
    skyColor: 0x110703,
    fogDensity: 0.0028,
    starColor: 0xffe2b3,
    trailColor: 0xffaa44,
    crystalHueOffset: 0.06,
  },
  {
    id: "abyssal-rift",
    name: "Abyssal Void Rift",
    subtitle: "Deep cobalt silence illuminated by neon cyan pulsars",
    baseHue: 0.58, // Deep Azure / Cyan
    ambientColor: 0x0a1e36,
    skyColor: 0x020713,
    fogDensity: 0.0034,
    starColor: 0xaee6ff,
    trailColor: 0x38e1ff,
    crystalHueOffset: 0.05,
  },
  {
    id: "emerald-genesis",
    name: "Emerald Genesis Ring",
    subtitle: "Vibrant auroras weaving through celestial archways",
    baseHue: 0.42, // Jade / Emerald
    ambientColor: 0x0d2e24,
    skyColor: 0x020f0a,
    fogDensity: 0.0029,
    starColor: 0xc1ffea,
    trailColor: 0x3dffa8,
    crystalHueOffset: 0.07,
  },
  {
    id: "supernova-core",
    name: "Supernova Core",
    subtitle: "Luminous crimson remnants of a shattered supergiant",
    baseHue: 0.96, // Rose Crimson / Coral
    ambientColor: 0x3a121d,
    skyColor: 0x120307,
    fogDensity: 0.0031,
    starColor: 0xffccd4,
    trailColor: 0xff4d79,
    crystalHueOffset: 0.06,
  },
]);

export const SECTOR_LENGTH = 450; // light-years per sector

/**
 * Returns the active biome and sector index for a given travel distance Z.
 * Pure deterministic function.
 */
export function getBiomeForZ(shipZ, sectorLength = SECTOR_LENGTH) {
  if (typeof shipZ !== "number" || !Number.isFinite(shipZ)) {
    throw new ValidationError(`shipZ must be a finite number, got ${shipZ}`);
  }
  if (typeof sectorLength !== "number" || !Number.isFinite(sectorLength) || sectorLength <= 0) {
    throw new ValidationError(`sectorLength must be a positive finite number, got ${sectorLength}`);
  }

  const normalizedZ = Math.max(0, shipZ);
  const sectorIndex = Math.floor(normalizedZ / sectorLength);
  const biomeIndex = sectorIndex % BIOMES.length;
  const progress = (normalizedZ % sectorLength) / sectorLength;
  const nextBiomeIndex = (biomeIndex + 1) % BIOMES.length;

  return {
    sectorIndex: sectorIndex + 1,
    biome: BIOMES[biomeIndex],
    nextBiome: BIOMES[nextBiomeIndex],
    progress,
  };
}
