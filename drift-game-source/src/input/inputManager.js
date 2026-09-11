import { InputError, ValidationError } from "../utils/errors.js";

/** Maps physical key codes to logical input flags. */
export const KEY_MAP = Object.freeze({
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ShiftLeft: "boost", ShiftRight: "boost",
  Space: "drift",
});

export function createInputState() {
  return { left: false, right: false, up: false, down: false, boost: false, drift: false };
}

/**
 * Pure reducer: given the current input state and a key event (code + isDown),
 * returns a new input state. Unknown key codes return the state unchanged.
 */
export function reduceKeyEvent(inputState, code, isDown) {
  if (!inputState || typeof inputState !== "object") {
    throw new ValidationError("inputState must be an object");
  }
  if (typeof code !== "string") {
    throw new ValidationError(`code must be a string, got ${typeof code}`);
  }
  if (typeof isDown !== "boolean") {
    throw new ValidationError(`isDown must be a boolean, got ${typeof isDown}`);
  }
  const flag = KEY_MAP[code];
  if (!flag) return inputState;
  return { ...inputState, [flag]: isDown };
}

/**
 * Binds keyboard listeners that mutate `inputStateRef.current` via the pure
 * reducer above. Returns an unbind function. Throws InputError if `target`
 * doesn't support addEventListener (e.g. running outside a browser).
 */
export function bindKeyboard(target, inputStateRef, hooks = {}) {
  if (!target || typeof target.addEventListener !== "function") {
    throw new InputError("bindKeyboard requires a target with addEventListener (e.g. window)");
  }
  if (!inputStateRef || typeof inputStateRef !== "object" || !("current" in inputStateRef)) {
    throw new ValidationError("inputStateRef must be an object with a 'current' property");
  }

  const onKeyDown = (e) => {
    inputStateRef.current = reduceKeyEvent(inputStateRef.current, e.code, true);
    if (typeof hooks.onFirstInput === "function") hooks.onFirstInput();
  };
  const onKeyUp = (e) => {
    inputStateRef.current = reduceKeyEvent(inputStateRef.current, e.code, false);
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return function unbind() {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
  };
}

/**
 * Binds pointer events on a touch/mouse button element to a single input flag.
 * Throws InputError if the element cannot be found in `doc`, instead of
 * silently failing (which would leave a control permanently unresponsive).
 */
export function bindTouchButton(doc, elementId, flag, inputStateRef, hooks = {}) {
  if (!doc || typeof doc.getElementById !== "function") {
    throw new InputError("bindTouchButton requires a document with getElementById");
  }
  const el = doc.getElementById(elementId);
  if (!el) {
    throw new InputError(`bindTouchButton: no element found with id "${elementId}"`);
  }
  if (!inputStateRef || typeof inputStateRef !== "object" || !("current" in inputStateRef)) {
    throw new ValidationError("inputStateRef must be an object with a 'current' property");
  }

  const setFlag = (isDown) => (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    inputStateRef.current = { ...inputStateRef.current, [flag]: isDown };
    if (isDown && typeof hooks.onFirstInput === "function") hooks.onFirstInput();
  };
  const down = setFlag(true);
  const up = setFlag(false);

  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointerleave", up);
  el.addEventListener("pointercancel", up);

  return function unbind() {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointerleave", up);
    el.removeEventListener("pointercancel", up);
  };
}
