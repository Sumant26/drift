import { clamp, lerp, smoothTowards } from "./math.js";
import { pathX, pathY, pathDerivative } from "./path.js";
import { ValidationError } from "../utils/errors.js";

export const DEFAULT_FLIGHT_CONFIG = Object.freeze({
  maxOffset: 24,
  maxOffsetY: 16,
  baseSpeed: 30,
  boostSpeed: 62,
  offsetSmoothRate: 0.025,
  pitchSmoothRate: 0.045,
  speedSmoothRate: 0.03,
  bankSmoothRate: 0.008,
});

/** Returns a fresh, valid initial game state. */
export function createInitialState(config = DEFAULT_FLIGHT_CONFIG) {
  const initZ = 0;
  const basePathX = pathX(initZ);
  const basePathY = pathY(initZ);
  return {
    shipZ: initZ,
    offsetX: 0,
    offsetY: 0,
    speed: config.baseSpeed,
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: basePathX, y: basePathY, z: initZ },
    basePosition: { x: basePathX, y: basePathY, z: initZ },
    bob: 0,
    elapsed: 0,
    // Energy Shield System
    shieldActive: false,
    shieldEnergy: 100,
    // Drift Combo & Scoring System
    driftScore: 0,
    comboMultiplier: 1.0,
    comboTimer: 0,
    consecutiveDriftTime: 0,
    isDrifting: false,
  };
}

function assertValidState(state) {
  if (!state || typeof state !== "object") {
    throw new ValidationError("state must be an object");
  }
  for (const key of ["shipZ", "offsetX", "offsetY", "speed", "elapsed"]) {
    if (typeof state[key] !== "number" || !Number.isFinite(state[key])) {
      throw new ValidationError(`state.${key} must be a finite number`);
    }
  }
}

function assertValidInput(input) {
  if (!input || typeof input !== "object") {
    throw new ValidationError("input must be an object");
  }
  for (const key of ["left", "right", "up", "down", "boost"]) {
    if (typeof input[key] !== "boolean") {
      throw new ValidationError(`input.${key} must be a boolean`);
    }
  }
  if ("drift" in input && typeof input.drift !== "boolean") {
    throw new ValidationError("input.drift must be a boolean");
  }
}

/**
 * Advances the game state by `delta` seconds given the current input flags.
 * Pure function: does not mutate `state`, always returns a new object.
 * This is the single source of truth for flight physics/state transitions.
 */
export function updateFlightState(state, input, delta, config = DEFAULT_FLIGHT_CONFIG) {
  assertValidState(state);
  assertValidInput(input);
  if (typeof delta !== "number" || !Number.isFinite(delta) || delta < 0) {
    throw new ValidationError(`delta must be a non-negative finite number, got ${delta}`);
  }

  const isAutopilot = Boolean(input.autopilot);
  const isDrift = Boolean(input.drift);
  const wantsShield = Boolean(input.shield);

  // Three.js right-handed coordinate system facing +Z: +X is screen Left, -X is screen Right.
  // When pressing left (A / ArrowLeft), move towards +X (screen left).
  // When pressing right (D / ArrowRight), move towards -X (screen right).
  const rawInputX = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const rawInputY = (input.up ? 1 : 0) - (input.down ? 1 : 0);

  // In autopilot, automatically center and gently glide
  const inputX = isAutopilot ? (state.offsetX > 0.5 ? -0.3 : state.offsetX < -0.5 ? 0.3 : 0) : rawInputX;
  const inputY = isAutopilot ? (state.offsetY > 0.5 ? -0.3 : state.offsetY < -0.5 ? 0.3 : 0) : rawInputY;

  const currentMaxOffsetX = isDrift ? (config.maxOffset || 24) * 1.3 : config.maxOffset || 24;
  const currentMaxOffsetY = config.maxOffsetY || 16;
  const targetOffsetX = isAutopilot ? 0 : inputX * currentMaxOffsetX;
  const targetOffsetY = isAutopilot ? 0 : inputY * currentMaxOffsetY;

  const offsetRate = isDrift ? (config.offsetSmoothRate || 0.025) * 0.5 : config.offsetSmoothRate || 0.025;
  const pitchRate = config.pitchSmoothRate || 0.045;

  const offsetX = clamp(
    smoothTowards(state.offsetX, targetOffsetX, offsetRate, delta),
    -currentMaxOffsetX,
    currentMaxOffsetX
  );
  const offsetY = clamp(
    smoothTowards(state.offsetY, targetOffsetY, pitchRate, delta),
    -currentMaxOffsetY,
    currentMaxOffsetY
  );

  const targetSpeed = input.boost ? config.boostSpeed : config.baseSpeed;
  const speed = smoothTowards(state.speed, targetSpeed, config.speedSmoothRate, delta);

  const shipZ = state.shipZ + speed * delta;
  const elapsed = state.elapsed + delta;

  // Gentle, harmonic floating bob
  const bob = Math.sin(elapsed * 0.9) * 0.45 + Math.sin(elapsed * 1.7 + 1.2) * 0.2;

  const baseX = pathX(shipZ) + offsetX;
  const baseY = pathY(shipZ) + offsetY;

  const basePosition = {
    x: baseX,
    y: baseY,
    z: shipZ,
  };

  const position = {
    x: baseX,
    y: baseY + bob,
    z: shipZ,
  };

  const { dx, dy } = pathDerivative(shipZ);
  const yawFactor = isDrift ? 0.38 : 0.14;
  const bankFactor = isDrift ? 0.85 : 0.5;

  const rotation = {
    x: lerp(state.rotation.x, inputY * 0.18 - dy * 0.02, 1 - Math.pow(config.bankSmoothRate, delta)),
    y: lerp(state.rotation.y, inputX * yawFactor, 1 - Math.pow(config.bankSmoothRate, delta)),
    z: lerp(state.rotation.z, -inputX * bankFactor - dx * 0.01, 1 - Math.pow(config.bankSmoothRate, delta)),
  };

  const isDrifting = isDrift && Math.abs(rawInputX) > 0;

  // Energy Shield Logic
  let shieldEnergy = state.shieldEnergy !== undefined ? state.shieldEnergy : 100;
  const shieldActive = Boolean(wantsShield && shieldEnergy > 5);
  if (shieldActive) {
    shieldEnergy = Math.max(0, shieldEnergy - delta * 22);
  } else {
    shieldEnergy = Math.min(100, shieldEnergy + delta * 14);
  }

  // Drift Combo & Score Accumulation
  let consecutiveDriftTime = state.consecutiveDriftTime || 0;
  let comboMultiplier = state.comboMultiplier || 1.0;
  let comboTimer = state.comboTimer || 0;
  let driftScore = state.driftScore || 0;

  if (isDrifting) {
    consecutiveDriftTime += delta;
    comboMultiplier = Math.min(8.0, 1.0 + Math.floor(consecutiveDriftTime * 1.5) * 0.5);
    comboTimer = 2.5; // refresh combo window
    driftScore += Math.round(100 * comboMultiplier * delta);
  } else {
    consecutiveDriftTime = 0;
    if (comboTimer > 0) {
      comboTimer -= delta;
      if (comboTimer <= 0) {
        comboMultiplier = 1.0;
      }
    }
  }

  return {
    shipZ,
    offsetX,
    offsetY,
    speed,
    rotation,
    position,
    basePosition,
    bob,
    elapsed,
    isDrifting,
    shieldActive,
    shieldEnergy,
    driftScore,
    comboMultiplier,
    comboTimer,
    consecutiveDriftTime,
  };
}
