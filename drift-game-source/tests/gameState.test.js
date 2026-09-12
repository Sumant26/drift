import { describe, it, expect } from "vitest";
import { createInitialState, updateFlightState, DEFAULT_FLIGHT_CONFIG } from "../src/core/gameState.js";
import { createInputState } from "../src/input/inputManager.js";
import { ValidationError } from "../src/utils/errors.js";

describe("createInitialState", () => {
  it("starts at z=0 with base speed and zero offsets", () => {
    const state = createInitialState();
    expect(state.shipZ).toBe(0);
    expect(state.offsetX).toBe(0);
    expect(state.offsetY).toBe(0);
    expect(state.speed).toBe(DEFAULT_FLIGHT_CONFIG.baseSpeed);
  });
});

describe("updateFlightState", () => {
  it("does not mutate the input state (pure function)", () => {
    const state = createInitialState();
    const snapshot = JSON.parse(JSON.stringify(state));
    updateFlightState(state, createInputState(), 0.1);
    expect(state).toEqual(snapshot);
  });

  it("advances shipZ forward over time with no input", () => {
    let state = createInitialState();
    state = updateFlightState(state, createInputState(), 1);
    expect(state.shipZ).toBeGreaterThan(0);
  });

  it("increases speed toward boostSpeed when boost is held", () => {
    let state = createInitialState();
    const input = { ...createInputState(), boost: true };
    for (let i = 0; i < 200; i++) {
      state = updateFlightState(state, input, 0.05);
    }
    expect(state.speed).toBeGreaterThan(DEFAULT_FLIGHT_CONFIG.baseSpeed);
    expect(state.speed).toBeLessThanOrEqual(DEFAULT_FLIGHT_CONFIG.boostSpeed + 1e-6);
  });

  it("never lets offsetX exceed maxOffset even after sustained input", () => {
    let state = createInitialState();
    const input = { ...createInputState(), left: true };
    for (let i = 0; i < 500; i++) {
      state = updateFlightState(state, input, 0.1);
    }
    expect(state.offsetX).toBeLessThanOrEqual(DEFAULT_FLIGHT_CONFIG.maxOffset + 1e-6);
  });

  it("moves offsetX positive (+X in 3D world, screen left) when steering left", () => {
    let state = createInitialState();
    const input = { ...createInputState(), left: true };
    for (let i = 0; i < 50; i++) {
      state = updateFlightState(state, input, 0.05);
    }
    expect(state.offsetX).toBeGreaterThan(0);
  });

  it("moves offsetX negative (-X in 3D world, screen right) when steering right", () => {
    let state = createInitialState();
    const input = { ...createInputState(), right: true };
    for (let i = 0; i < 50; i++) {
      state = updateFlightState(state, input, 0.05);
    }
    expect(state.offsetX).toBeLessThan(0);
  });

  it("leaves state unchanged in shipZ progression when delta is 0", () => {
    const state = createInitialState();
    const next = updateFlightState(state, createInputState(), 0);
    expect(next.shipZ).toBe(state.shipZ);
  });

  it("throws on invalid state", () => {
    expect(() => updateFlightState(null, createInputState(), 0.1)).toThrow(ValidationError);
    expect(() => updateFlightState({ shipZ: "x" }, createInputState(), 0.1)).toThrow(ValidationError);
  });

  it("throws on invalid input", () => {
    const state = createInitialState();
    expect(() => updateFlightState(state, {}, 0.1)).toThrow(ValidationError);
    expect(() =>
      updateFlightState(state, { left: 1, right: false, up: false, down: false, boost: false }, 0.1)
    ).toThrow(ValidationError);
  });

  it("throws ValidationError for negative delta", () => {
    const state = createInitialState();
    expect(() => updateFlightState(state, createInputState(), -0.1)).toThrow(ValidationError);
  });

  it("enables drift mode with enhanced banking and wider max offset", () => {
    let state = createInitialState();
    const input = { ...createInputState(), left: true, drift: true };
    for (let i = 0; i < 500; i++) {
      state = updateFlightState(state, input, 0.05);
    }
    expect(state.isDrifting).toBe(true);
    expect(state.offsetX).toBeGreaterThan(DEFAULT_FLIGHT_CONFIG.maxOffset);
  });

  it("activates energy shield and drains shield energy when shield input held", () => {
    let state = createInitialState();
    expect(state.shieldEnergy).toBe(100);
    const input = { ...createInputState(), shield: true };
    state = updateFlightState(state, input, 1.0);
    expect(state.shieldActive).toBe(true);
    expect(state.shieldEnergy).toBeLessThan(100);
  });

  it("accumulates drift combo multiplier when drifting continuously", () => {
    let state = createInitialState();
    const input = { ...createInputState(), left: true, drift: true };
    for (let i = 0; i < 40; i++) {
      state = updateFlightState(state, input, 0.1);
    }
    expect(state.comboMultiplier).toBeGreaterThan(1.0);
    expect(state.driftScore).toBeGreaterThan(0);
  });
});
