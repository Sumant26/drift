/**
 * Base error for all game-specific failures. Lets calling code distinguish
 * "expected, handled" game errors from arbitrary runtime bugs.
 */
export class GameError extends Error {
  constructor(message) {
    super(message);
    this.name = "GameError";
  }
}

/** Thrown for invalid arguments passed into pure logic functions. */
export class ValidationError extends GameError {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Thrown when WebGL / rendering setup fails. */
export class RenderError extends GameError {
  constructor(message) {
    super(message);
    this.name = "RenderError";
  }
}

/** Thrown when input binding fails (e.g. missing DOM element). */
export class InputError extends GameError {
  constructor(message) {
    super(message);
    this.name = "InputError";
  }
}
