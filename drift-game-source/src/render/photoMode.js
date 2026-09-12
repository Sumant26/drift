import * as THREE from "three";

export const PHOTO_FILTERS = [
  { id: "none", name: "Natural", css: "none" },
  { id: "cyberpunk", name: "Neon Cyberpunk", css: "contrast(1.3) saturate(1.7) hue-rotate(25deg)" },
  { id: "dreamy", name: "Ethereal Pastel", css: "contrast(1.1) brightness(1.15) saturate(1.4) blur(0.3px)" },
  { id: "noir", name: "Deep Space Noir", css: "contrast(1.6) grayscale(1) brightness(0.9)" },
  { id: "solar", name: "Solar Gold", css: "sepia(0.55) saturate(1.8) contrast(1.2) hue-rotate(-15deg)" },
];

/**
 * Zen Photo Mode: allows freezing flight, orbiting around ship/scenery,
 * applying aesthetic color grading filters, and capturing wallpaper snapshots.
 */
export class PhotoModeManager {
  constructor(camera, renderer, onExitCallback) {
    this.camera = camera;
    this.renderer = renderer;
    this.onExitCallback = onExitCallback;
    this.active = false;

    this.filterIndex = 0;
    this.orbitRadius = 22;
    this.theta = 0;
    this.phi = Math.PI * 0.45;
    this.targetCenter = new THREE.Vector3();

    this.isDragging = false;
    this.prevPointerX = 0;
    this.prevPointerY = 0;

    this.savedCamPos = new THREE.Vector3();
    this.savedCamRot = new THREE.Euler();
  }

  enter(shipPos) {
    this.active = true;
    this.targetCenter.set(shipPos.x, shipPos.y + 0.5, shipPos.z);
    this.savedCamPos.copy(this.camera.position);
    this.savedCamRot.copy(this.camera.rotation);

    // Initial position relative to ship
    this.theta = 0;
    this.phi = Math.PI * 0.45;
    this.orbitRadius = 24;
    this.updateCamera();
  }

  exit() {
    this.active = false;
    this.setFilter("none");
    if (typeof this.onExitCallback === "function") {
      this.onExitCallback();
    }
  }

  toggle(shipPos) {
    if (this.active) {
      this.exit();
    } else {
      this.enter(shipPos);
    }
    return this.active;
  }

  cycleFilter() {
    this.filterIndex = (this.filterIndex + 1) % PHOTO_FILTERS.length;
    const filter = PHOTO_FILTERS[this.filterIndex];
    this.setFilter(filter.id);
    return filter;
  }

  setFilter(filterId) {
    const filter = PHOTO_FILTERS.find((f) => f.id === filterId) || PHOTO_FILTERS[0];
    const canvas = this.renderer.domElement;
    if (canvas) {
      canvas.style.filter = filter.css;
    }
  }

  handlePointerDown(x, y) {
    if (!this.active) return;
    this.isDragging = true;
    this.prevPointerX = x;
    this.prevPointerY = y;
  }

  handlePointerMove(x, y) {
    if (!this.active || !this.isDragging) return;
    const deltaX = x - this.prevPointerX;
    const deltaY = y - this.prevPointerY;
    this.prevPointerX = x;
    this.prevPointerY = y;

    this.theta -= deltaX * 0.007;
    this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi + deltaY * 0.007));
    this.updateCamera();
  }

  handlePointerUp() {
    this.isDragging = false;
  }

  handleWheel(deltaY) {
    if (!this.active) return;
    this.orbitRadius = Math.max(8, Math.min(65, this.orbitRadius + deltaY * 0.03));
    this.updateCamera();
  }

  updateCamera() {
    const x = this.targetCenter.x + this.orbitRadius * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.targetCenter.y + this.orbitRadius * Math.cos(this.phi);
    const z = this.targetCenter.z + this.orbitRadius * Math.sin(this.phi) * Math.cos(this.theta);

    this.camera.position.set(x, y, z);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.targetCenter);
  }

  takeSnapshot() {
    try {
      const dataUrl = this.renderer.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `drift-space-snapshot-${Date.now()}.png`;
      a.click();
    } catch (err) {
      console.error("Screenshot capture failed:", err);
    }
  }
}
