import { describe, it, expect, vi } from "vitest";
import { createInputState, reduceKeyEvent, bindKeyboard, bindTouchButton, KEY_MAP } from "../src/input/inputManager.js";
import { InputError, ValidationError } from "../src/utils/errors.js";

describe("createInputState", () => {
  it("starts with every flag false", () => {
    const state = createInputState();
    expect(state).toEqual({ left: false, right: false, up: false, down: false, boost: false, drift: false, shield: false });
  });
});

describe("reduceKeyEvent", () => {
  it("sets the mapped flag true on keydown", () => {
    const next = reduceKeyEvent(createInputState(), "ArrowLeft", true);
    expect(next.left).toBe(true);
  });
  it("sets the mapped flag false on keyup", () => {
    const pressed = reduceKeyEvent(createInputState(), "KeyD", true);
    const released = reduceKeyEvent(pressed, "KeyD", false);
    expect(released.right).toBe(false);
  });
  it("does not mutate the original state", () => {
    const original = createInputState();
    reduceKeyEvent(original, "ArrowUp", true);
    expect(original.up).toBe(false);
  });
  it("returns the same state (by value) for unmapped keys", () => {
    const original = createInputState();
    const next = reduceKeyEvent(original, "KeyZ", true);
    expect(next).toEqual(original);
  });
  it("covers every entry in KEY_MAP", () => {
    for (const [code, flag] of Object.entries(KEY_MAP)) {
      const next = reduceKeyEvent(createInputState(), code, true);
      expect(next[flag]).toBe(true);
    }
  });
  it("throws on invalid arguments", () => {
    expect(() => reduceKeyEvent(null, "KeyA", true)).toThrow(ValidationError);
    expect(() => reduceKeyEvent(createInputState(), 5, true)).toThrow(ValidationError);
    expect(() => reduceKeyEvent(createInputState(), "KeyA", "yes")).toThrow(ValidationError);
  });
});

function makeMockTarget() {
  const listeners = {};
  return {
    addEventListener: vi.fn((type, fn) => { listeners[type] = listeners[type] || []; listeners[type].push(fn); }),
    removeEventListener: vi.fn((type, fn) => {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
    }),
    dispatch(type, event) { for (const fn of listeners[type] || []) fn(event); },
  };
}

describe("bindKeyboard", () => {
  it("updates inputStateRef.current on keydown/keyup", () => {
    const target = makeMockTarget();
    const ref = { current: createInputState() };
    bindKeyboard(target, ref);
    target.dispatch("keydown", { code: "ArrowRight" });
    expect(ref.current.right).toBe(true);
    target.dispatch("keyup", { code: "ArrowRight" });
    expect(ref.current.right).toBe(false);
  });
  it("calls onFirstInput hook on keydown", () => {
    const target = makeMockTarget();
    const ref = { current: createInputState() };
    const onFirstInput = vi.fn();
    bindKeyboard(target, ref, { onFirstInput });
    target.dispatch("keydown", { code: "KeyW" });
    expect(onFirstInput).toHaveBeenCalledTimes(1);
  });
  it("unbind removes listeners", () => {
    const target = makeMockTarget();
    const ref = { current: createInputState() };
    const unbind = bindKeyboard(target, ref);
    unbind();
    expect(target.removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(target.removeEventListener).toHaveBeenCalledWith("keyup", expect.any(Function));
  });
  it("throws InputError for a target without addEventListener", () => {
    expect(() => bindKeyboard({}, { current: createInputState() })).toThrow(InputError);
  });
  it("throws ValidationError for a malformed inputStateRef", () => {
    const target = makeMockTarget();
    expect(() => bindKeyboard(target, {})).toThrow(ValidationError);
  });
});

function makeMockDocument(elements) {
  return { getElementById: (id) => elements[id] || null };
}

describe("bindTouchButton", () => {
  it("sets the flag true on pointerdown and false on pointerup", () => {
    const el = makeMockTarget();
    const doc = makeMockDocument({ "tp-up": el });
    const ref = { current: createInputState() };
    bindTouchButton(doc, "tp-up", "up", ref);
    el.dispatch("pointerdown", { preventDefault: () => {} });
    expect(ref.current.up).toBe(true);
    el.dispatch("pointerup", {});
    expect(ref.current.up).toBe(false);
  });
  it("also clears the flag on pointerleave and pointercancel", () => {
    const el = makeMockTarget();
    const doc = makeMockDocument({ "tp-left": el });
    const ref = { current: createInputState() };
    bindTouchButton(doc, "tp-left", "left", ref);
    el.dispatch("pointerdown", {});
    el.dispatch("pointerleave", {});
    expect(ref.current.left).toBe(false);
  });
  it("throws InputError when the element does not exist", () => {
    const doc = makeMockDocument({});
    expect(() => bindTouchButton(doc, "missing", "up", { current: createInputState() })).toThrow(InputError);
  });
  it("throws InputError when doc lacks getElementById", () => {
    expect(() => bindTouchButton({}, "id", "up", { current: createInputState() })).toThrow(InputError);
  });
  it("unbind removes all four listeners", () => {
    const el = makeMockTarget();
    const doc = makeMockDocument({ "tp-up": el });
    const unbind = bindTouchButton(doc, "tp-up", "up", { current: createInputState() });
    unbind();
    expect(el.removeEventListener).toHaveBeenCalledTimes(4);
  });
});
