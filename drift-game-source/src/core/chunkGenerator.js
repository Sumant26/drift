import { mulberry32 } from "./math.js";
import { pathX, pathY } from "./path.js";
import { getBiomeForZ } from "./biomes.js";
import { ValidationError } from "../utils/errors.js";

export const DEFAULT_CHUNK_CONFIG = Object.freeze({
  chunkLength: 300,
  minCrystals: 12,
  maxCrystalBonus: 10,
  minCrystalRadius: 34,
  maxCrystalRadiusBonus: 75,
  nebulaChance: 0.65,
  planetEvery: 6,
  planetChance: 0.85,
  ringChance: 0.85,
  stargateEvery: 8,
  faunaEvery: 7,
  ufoEvery: 3,
  beaconEvery: 6,
});

function assertInt(value, name) {
  if (!Number.isInteger(value)) {
    throw new ValidationError(`${name} must be an integer, got ${value}`);
  }
}

/**
 * Generates deterministic scenery data for the chunk at `index`.
 * Same index + same config always produces the same output (pure function),
 * which makes chunk generation independently testable without a renderer.
 *
 * Returns: { index, zStart, zEnd, hue, crystals: [...], nebula, planet, rings: [...], stargate, singularity, fauna, comet, ufo, pulsar, beacon, biomeData }
 */
export function generateChunkData(index, config = DEFAULT_CHUNK_CONFIG) {
  assertInt(index, "index");
  if (!config || typeof config !== "object") {
    throw new ValidationError("config must be an object");
  }
  const cfg = { ...DEFAULT_CHUNK_CONFIG, ...config };
  if (cfg.chunkLength <= 0) {
    throw new ValidationError(`chunkLength must be positive, got ${cfg.chunkLength}`);
  }

  const rand = mulberry32(index * 7919 + 13);
  const zStart = index * cfg.chunkLength;
  const zEnd = zStart + cfg.chunkLength;

  const biomeData = getBiomeForZ(Math.max(0, zStart));
  const hue = (biomeData.biome.baseHue + (index % 10) * 0.015) % 1;

  const crystalCount = cfg.minCrystals + Math.floor(rand() * cfg.maxCrystalBonus);
  const crystals = [];
  for (let i = 0; i < crystalCount; i++) {
    const z = zStart + rand() * cfg.chunkLength;
    const angle = rand() * Math.PI * 2;
    const radius = cfg.minCrystalRadius + rand() * cfg.maxCrystalRadiusBonus;
    crystals.push({
      x: pathX(z) + Math.cos(angle) * radius,
      y: pathY(z) + Math.sin(angle) * radius * 0.6,
      z,
      hueOffset: (rand() - 0.5) * 0.04,
      lightnessOffset: (rand() - 0.5) * 0.15,
      emissiveIntensity: 0.35 + rand() * 0.4,
      scale: 2 + rand() * 6.5,
      scaleYMultiplier: 1 + rand() * 1.6,
      rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
      geometryVariant: Math.floor(rand() * 3),
    });
  }

  let nebula = null;
  if (rand() < cfg.nebulaChance) {
    const zMid = zStart + cfg.chunkLength * 0.5;
    nebula = {
      x: pathX(zMid) + (rand() - 0.5) * 180,
      y: pathY(zMid) + (rand() - 0.5) * 120,
      z: zMid,
      scale: 160 + rand() * 260,
    };
  }

  let planet = null;
  if (index % cfg.planetEvery === 0 && rand() < cfg.planetChance) {
    const zMid = zStart + cfg.chunkLength * 0.5;
    const side = rand() > 0.5 ? 1 : -1;
    planet = {
      x: pathX(zMid) + side * (320 + rand() * 320),
      y: pathY(zMid) + (rand() - 0.5) * 220,
      z: zMid,
      hue: rand(),
      scale: 55 + rand() * 130,
      hasRings: rand() > 0.4,
    };
  }

  // Resonance rings along corridor
  const rings = [];
  if (index > 0 && rand() < cfg.ringChance) {
    const ringZ = zStart + cfg.chunkLength * (0.3 + rand() * 0.4);
    rings.push({
      id: `ring-${index}`,
      x: pathX(ringZ) + (rand() - 0.5) * 10,
      y: pathY(ringZ) + (rand() - 0.5) * 8,
      z: ringZ,
      radius: 6.5,
      hue: (hue + 0.1) % 1,
    });
  }

  // Ancient Megastructure Stargates
  let stargate = null;
  if (index > 0 && index % cfg.stargateEvery === 0) {
    const gateZ = zStart + cfg.chunkLength * 0.5;
    stargate = {
      id: `stargate-${index}`,
      x: pathX(gateZ),
      y: pathY(gateZ),
      z: gateZ,
      radius: 16,
      hue: (hue + 0.5) % 1,
    };
  }

  // Gravitational Singularity
  let singularity = null;
  if (index > 0 && index % 14 === 0 && biomeData.biome.id === "abyssal-rift") {
    const sZ = zStart + cfg.chunkLength * 0.5;
    const side = rand() > 0.5 ? 1 : -1;
    singularity = {
      id: `singularity-${index}`,
      x: pathX(sZ) + side * (260 + rand() * 140),
      y: pathY(sZ) + (rand() - 0.5) * 80,
      z: sZ,
      radius: 38,
    };
  }

  // Astral Space Fauna
  let fauna = null;
  if (index > 0 && index % cfg.faunaEvery === 3) {
    const fZ = zStart + cfg.chunkLength * 0.5;
    const side = rand() > 0.5 ? 1 : -1;
    fauna = {
      id: `fauna-${index}`,
      x: pathX(fZ) + side * (180 + rand() * 140),
      y: pathY(fZ) + (rand() - 0.5) * 90,
      z: fZ,
      scale: 32 + rand() * 24,
      hue: (hue + 0.25) % 1,
    };
  }

  // Friendly Flying Saucers / UFOs
  const ufos = [];
  if (index > 0 && (index % cfg.ufoEvery === 0 || index % cfg.ufoEvery === 2)) {
    const ufoCount = 1 + (rand() > 0.45 ? 1 : 0);
    for (let u = 0; u < ufoCount; u++) {
      const uZ = zStart + cfg.chunkLength * (0.2 + u * 0.35 + rand() * 0.2);
      const side = u === 0 ? (rand() > 0.5 ? 1 : -1) : rand() > 0.5 ? -1 : 1;
      ufos.push({
        id: `ufo-${index}-${u}`,
        x: pathX(uZ) + side * (24 + rand() * 40),
        y: pathY(uZ) + 6 + rand() * 16,
        z: uZ,
        hue: (hue + 0.35 + u * 0.2) % 1,
        scale: 5.2 + rand() * 2.0,
      });
    }
  }
  const ufo = ufos.length > 0 ? ufos[0] : null;

  // Rotating Pulsar / Neutron Star in deep space
  let pulsar = null;
  if (index > 0 && index % 11 === 0) {
    const pZ = zStart + cfg.chunkLength * 0.5;
    pulsar = {
      id: `pulsar-${index}`,
      x: pathX(pZ) + (rand() > 0.5 ? 380 : -380),
      y: pathY(pZ) + 160 + rand() * 120,
      z: pZ + 200,
      hue: 0.55, // Ice blue pulsar
    };
  }

  // Ancient Harmonic Space Beacon
  let beacon = null;
  if (index > 0 && index % cfg.beaconEvery === 4) {
    const bZ = zStart + cfg.chunkLength * 0.5;
    beacon = {
      id: `beacon-${index}`,
      x: pathX(bZ) + (rand() > 0.5 ? 18 : -18),
      y: pathY(bZ) + 6,
      z: bZ,
      hue: (hue + 0.6) % 1,
    };
  }

  // Sky Comet
  let comet = null;
  if (rand() < 0.45) {
    const cZ = zStart + rand() * cfg.chunkLength;
    comet = {
      x: pathX(cZ) + (rand() - 0.5) * 500,
      y: pathY(cZ) + 120 + rand() * 200,
      z: cZ + 150,
      length: 80 + rand() * 120,
    };
  }

  // Floating Cosmic Asteroid Fields (Sparse, atmospheric celestial obstacles)
  const asteroids = [];
  if (index > 0 && rand() < 0.28) {
    const asteroidCount = 1 + Math.floor(rand() * 2);
    for (let a = 0; a < asteroidCount; a++) {
      const aZ = zStart + cfg.chunkLength * (0.25 + a * 0.45 + (rand() - 0.5) * 0.1);
      const angle = rand() * Math.PI * 2;
      const offsetDist = 8 + rand() * 16;
      asteroids.push({
        id: `asteroid-${index}-${a}`,
        x: pathX(aZ) + Math.cos(angle) * offsetDist,
        y: pathY(aZ) + Math.sin(angle) * (offsetDist * 0.7),
        z: aZ,
        radius: 2.4 + rand() * 2.8,
        rotSpeed: { x: (rand() - 0.5) * 1.2, y: (rand() - 0.5) * 1.2, z: (rand() - 0.5) * 1.2 },
        variant: Math.floor(rand() * 3),
      });
    }
  }

  return {
    index,
    zStart,
    zEnd,
    hue,
    crystals,
    nebula,
    planet,
    rings,
    stargate,
    singularity,
    fauna,
    ufo,
    ufos,
    pulsar,
    beacon,
    comet,
    asteroids,
    biomeData,
  };
}
