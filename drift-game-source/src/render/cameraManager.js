import * as THREE from "three";

export const CAMERA_MODES = {
  CHASE: "Chase View",
  COCKPIT: "Cockpit View",
  CINEMATIC: "Cinematic Orbit",
};

const MODE_KEYS = [CAMERA_MODES.CHASE, CAMERA_MODES.COCKPIT, CAMERA_MODES.CINEMATIC];

/**
 * Manages camera positioning, multiple perspectives, smooth damping, and dynamic FOV.
 * Eliminates micro-jitter and shakiness by decoupling trajectory tracking from visual vibrations.
 */
export class CameraManager {
  constructor(camera) {
    this.camera = camera;
    this.modeIndex = 0;
    this.currentMode = MODE_KEYS[0];

    this.currentLookAt = new THREE.Vector3(0, 3, 40);
    this.targetLookAt = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();

    this.orbitAngle = 0;
    this.baseFov = 62;
    this.boostFov = 72;
    this.targetFov = this.baseFov;

    // Smoothed bank angle
    this.currentBank = 0;
  }

  cycleMode() {
    this.modeIndex = (this.modeIndex + 1) % MODE_KEYS.length;
    this.currentMode = MODE_KEYS[this.modeIndex];
    return this.currentMode;
  }

  setMode(mode) {
    const idx = MODE_KEYS.indexOf(mode);
    if (idx !== -1) {
      this.modeIndex = idx;
      this.currentMode = mode;
    }
  }

  /**
   * Updates camera position, rotation, and FOV with buttery-smooth damping.
   */
  update(state, input, delta) {
    const base = state.basePosition || state.position;
    const pos = state.position;
    const isBoost = input.boost;
    const inputX = (input.left ? 1 : 0) - (input.right ? 1 : 0);

    // Dynamic FOV interpolation
    const destFov = isBoost ? this.boostFov : this.baseFov;
    this.camera.fov += (destFov - this.camera.fov) * Math.min(1, delta * 6);
    this.camera.updateProjectionMatrix();

    if (this.currentMode === CAMERA_MODES.CHASE) {
      // 1. Chase Cam: smoothed trailing perspective
      this.targetPos.set(base.x, base.y + 8.2, base.z - 24);
      this.targetLookAt.set(base.x, base.y + 2.8, base.z + 45);

      // Smooth position interpolation
      const posDamp = 1 - Math.pow(0.0006, delta);
      this.camera.position.lerp(this.targetPos, Math.min(1, posDamp));

      // Smooth look-at interpolation
      const lookDamp = 1 - Math.pow(0.0003, delta);
      this.currentLookAt.lerp(this.targetLookAt, Math.min(1, lookDamp));

      // Compute smooth banking up-vector
      const targetBank = -inputX * 0.14 - (state.rotation ? state.rotation.z * 0.15 : 0);
      this.currentBank += (targetBank - this.currentBank) * Math.min(1, delta * 8);

      this.camera.up.set(Math.sin(this.currentBank), Math.cos(this.currentBank), 0);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.currentMode === CAMERA_MODES.COCKPIT) {
      // 2. Cockpit Cam: first-person forward view
      this.targetPos.set(pos.x, pos.y + 0.4, pos.z + 0.8);
      this.targetLookAt.set(base.x, base.y + 0.4, base.z + 100);

      this.camera.position.copy(this.targetPos);
      this.currentLookAt.lerp(this.targetLookAt, Math.min(1, delta * 18));

      const targetBank = -inputX * 0.22;
      this.currentBank += (targetBank - this.currentBank) * Math.min(1, delta * 12);
      this.camera.up.set(Math.sin(this.currentBank), Math.cos(this.currentBank), 0);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.currentMode === CAMERA_MODES.CINEMATIC) {
      // 3. Cinematic Orbit Cam: smooth rotating drone view
      this.orbitAngle += delta * 0.35;
      const radius = 26;
      const camX = base.x + Math.sin(this.orbitAngle) * radius;
      const camY = base.y + 4.5 + Math.cos(this.orbitAngle * 0.6) * 3;
      const camZ = base.z - 12 + Math.cos(this.orbitAngle) * 14;

      this.targetPos.set(camX, camY, camZ);
      this.targetLookAt.set(pos.x, pos.y + 0.5, pos.z + 4);

      this.camera.position.lerp(this.targetPos, Math.min(1, delta * 5));
      this.currentLookAt.lerp(this.targetLookAt, Math.min(1, delta * 8));

      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(this.currentLookAt);
    }
  }
}
