/**
 * Gamepad API Manager for Drift.
 * Supports Xbox, PlayStation DualSense, and generic USB/Bluetooth controllers.
 * Provides analog thumbstick steering and configurable haptic vibration rumble.
 */
export class GamepadManager {
  constructor() {
    this.hasGamepad = false;
    this.deadzone = 0.15;
    this.rumbleIntensity = "high"; // "high" | "soft" | "off"
  }

  setRumbleIntensity(intensity) {
    if (["high", "soft", "off"].includes(intensity)) {
      this.rumbleIntensity = intensity;
    }
  }

  /**
   * Polls connected gamepads and merges analog/dpad input into inputState.
   */
  pollInput(inputState) {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      return inputState;
    }
    const gamepads = navigator.getGamepads();
    if (!gamepads) return inputState;

    let pad = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        pad = gamepads[i];
        break;
      }
    }
    if (!pad) {
      this.hasGamepad = false;
      return inputState;
    }
    this.hasGamepad = true;

    // Left Analog Stick
    const stickX = pad.axes[0] || 0;
    const stickY = pad.axes[1] || 0;

    // D-Pad buttons
    const dpadUp = pad.buttons[12]?.pressed;
    const dpadDown = pad.buttons[13]?.pressed;
    const dpadLeft = pad.buttons[14]?.pressed;
    const dpadRight = pad.buttons[15]?.pressed;

    // Buttons
    const btnBoost = pad.buttons[0]?.pressed || pad.buttons[7]?.pressed || (pad.buttons[7]?.value > 0.3);

    const isLeft = stickX < -this.deadzone || dpadLeft;
    const isRight = stickX > this.deadzone || dpadRight;
    const isUp = stickY < -this.deadzone || dpadUp;
    const isDown = stickY > this.deadzone || dpadDown;

    return {
      left: inputState.left || isLeft,
      right: inputState.right || isRight,
      up: inputState.up || isUp,
      down: inputState.down || isDown,
      boost: inputState.boost || btnBoost,
      autopilot: inputState.autopilot,
    };
  }

  /** Triggers haptic vibration pulse respecting rumble intensity setting */
  pulseHaptic(duration = 120, weakMagnitude = 0.4, strongMagnitude = 0.2) {
    if (this.rumbleIntensity === "off") return;
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    const scale = this.rumbleIntensity === "soft" ? 0.45 : 1.0;

    for (const pad of gamepads) {
      if (pad && pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === "function") {
        pad.vibrationActuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration,
          weakMagnitude: Math.min(1.0, weakMagnitude * scale),
          strongMagnitude: Math.min(1.0, strongMagnitude * scale),
        }).catch(() => {});
      }
    }
  }
}
