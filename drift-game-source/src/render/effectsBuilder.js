import * as THREE from "three";
import { pathX, pathY } from "../core/path.js";

export const WARP_THEMES = Object.freeze({
  cyan: { id: "cyan", name: "Prism Cyan", color: 0x6ee7ff, hex: "#6ee7ff" },
  magenta: { id: "magenta", name: "Cyber Magenta", color: 0xff3b94, hex: "#ff3b94" },
  solar: { id: "solar", name: "Solar Amber", color: 0xffaa22, hex: "#ffaa22" },
  emerald: { id: "emerald", name: "Emerald Matrix", color: 0x2ef8a0, hex: "#2ef8a0" },
  amethyst: { id: "amethyst", name: "Deep Amethyst", color: 0xc084fc, hex: "#c084fc" },
  rainbow: {
    id: "rainbow",
    name: "Prism Rainbow",
    color: 0xffffff,
    hex: "linear-gradient(90deg, #ff4e50, #f9d423, #6ee7ff)",
    isRainbow: true,
  },
});

export const EXHAUST_TYPES = Object.freeze({
  ion: { id: "ion", name: "Ion Plasma", color: 0x6ee7ff, particleColor: 0x8fd6ff, size: 2.2 },
  solar: { id: "solar", name: "Solar Flare", color: 0xffaa22, particleColor: 0xff6600, size: 2.8 },
  void: { id: "void", name: "Void Stream", color: 0xc084fc, particleColor: 0xff3b94, size: 2.5 },
  emerald: { id: "emerald", name: "Emerald Photon", color: 0x2ef8a0, particleColor: 0x5eead4, size: 2.2 },
});

/**
 * Creates and manages dynamic visual effects:
 * - Volumetric Hyperspace Warp Tunnel
 * - Selectable Engine Exhaust Systems
 * - Hexagonal Energy Shield Deflector Bubble
 * - Dual Engine Thruster Ribbon Trails
 * - Space Drift Side Thruster Spark Particles
 * - Floating Cosmic Stardust Motes
 * - Customizable Warp Speed Streaks
 * - Aurora Flight Corridor Ribbon
 * - Streaking Sky Comets & Constellations
 */
export class EffectsManager {
  constructor(scene, glowTexture) {
    this.scene = scene;
    this.glowTexture = glowTexture;

    // Engine Trails & Exhaust Customizer
    this.currentExhaustKey = "ion";
    this.trailLength = 34;
    this.leftTrailPoints = [];
    this.rightTrailPoints = [];
    this.trailMesh = null;

    // Drift Sparks
    this.sparksCount = 120;
    this.sparksMesh = null;
    this.sparkData = [];

    // Stardust & Ion Rain
    this.stardust = null;
    this.stardustCount = 600;
    this.stardustRange = 120;

    this.ionRain = null;
    this.ionRainCount = 250;

    // Warp & Hyperspace Volumetric Tunnel
    this.warpLines = null;
    this.warpCount = 240;
    this.hyperspaceActive = false;
    this.hyperspaceTimer = 0;
    this.currentWarpThemeKey = "cyan";
    this.warpTunnelMesh = null;

    // Energy Shield Bubble
    this.shieldMesh = null;
    this.shieldHitIntensity = 0;

    // Aurora Ribbon
    this.ribbonSegments = 60;
    this.ribbonLength = 400;
    this.ribbonMesh = null;
    this.ribbonVisible = true;

    // Comet System
    this.cometMesh = null;
    this.cometPos = new THREE.Vector3();
    this.cometVelocity = new THREE.Vector3();
    this.cometActive = false;
    this.nextCometTime = 10;

    // Constellations
    this.constellationMesh = null;

    this.initTrails();
    this.initDriftSparks();
    this.initStardust();
    this.initIonRain();
    this.initWarpLines();
    this.initWarpTunnel();
    this.initEnergyShield();
    this.initAuroraRibbon();
    this.initComet();
    this.initConstellations();
  }

  setExhaustType(typeKey) {
    if (EXHAUST_TYPES[typeKey]) {
      this.currentExhaustKey = typeKey;
    }
  }

  setWarpTheme(themeKey) {
    if (WARP_THEMES[themeKey]) {
      this.currentWarpThemeKey = themeKey;
      if (this.warpLines && !WARP_THEMES[themeKey].isRainbow) {
        this.warpLines.material.color.setHex(WARP_THEMES[themeKey].color);
      }
      if (this.warpTunnelMesh && !WARP_THEMES[themeKey].isRainbow) {
        this.warpTunnelMesh.material.color.setHex(WARP_THEMES[themeKey].color);
      }
    }
  }

  initWarpTunnel() {
    const geo = new THREE.CylinderGeometry(24, 24, 220, 24, 16, true);
    geo.rotateX(Math.PI / 2); // align along Z

    const mat = new THREE.MeshBasicMaterial({
      color: 0x6ee7ff,
      wireframe: true,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.warpTunnelMesh = new THREE.Mesh(geo, mat);
    this.warpTunnelMesh.frustumCulled = false;
    this.scene.add(this.warpTunnelMesh);
  }

  initEnergyShield() {
    const geo = new THREE.IcosahedronGeometry(3.6, 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.shieldMesh = new THREE.Mesh(geo, mat);
    this.shieldMesh.frustumCulled = false;
    this.scene.add(this.shieldMesh);
  }

  triggerShieldHit() {
    this.shieldHitIntensity = 1.0;
  }

  initDriftSparks() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.sparksCount * 3);
    const colors = new Float32Array(this.sparksCount * 3);

    for (let i = 0; i < this.sparksCount; i++) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = -1000;
      positions[i * 3 + 2] = 0;

      colors[i * 3 + 0] = 1.0;
      colors[i * 3 + 1] = 0.7;
      colors[i * 3 + 2] = 0.2;

      this.sparkData.push({
        x: 0,
        y: -1000,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
      });
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: this.glowTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sparksMesh = new THREE.Points(geo, mat);
    this.sparksMesh.frustumCulled = false;
    this.scene.add(this.sparksMesh);
  }

  initTrails() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.trailLength * 2 * 3);
    const colors = new Float32Array(this.trailLength * 2 * 3);

    for (let i = 0; i < this.trailLength * 2; i++) {
      const alpha = 1 - Math.floor(i / 2) / this.trailLength;
      colors[i * 3 + 0] = 0.5 * alpha;
      colors[i * 3 + 1] = 0.85 * alpha;
      colors[i * 3 + 2] = 1.0 * alpha;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      linewidth: 2,
      depthWrite: false,
    });

    this.trailMesh = new THREE.LineSegments(geo, mat);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);
  }

  initStardust() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.stardustCount * 3);
    for (let i = 0; i < this.stardustCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * this.stardustRange;
      positions[i * 3 + 1] = (Math.random() - 0.5) * (this.stardustRange * 0.7);
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.stardustRange;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x9edbff,
      size: 1.8,
      map: this.glowTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.stardust = new THREE.Points(geo, mat);
    this.scene.add(this.stardust);
  }

  initIonRain() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.ionRainCount * 6);
    for (let i = 0; i < this.ionRainCount; i++) {
      const x = (Math.random() - 0.5) * 140;
      const y = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 140;
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y - 4.5;
      positions[i * 6 + 5] = z;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0x6be5ff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ionRain = new THREE.LineSegments(geo, mat);
    this.scene.add(this.ionRain);
  }

  initWarpLines() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.warpCount * 6);
    for (let i = 0; i < this.warpCount; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 100;
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + 14;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0x7de6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.warpLines = new THREE.LineSegments(geo, mat);
    this.scene.add(this.warpLines);
  }

  initAuroraRibbon() {
    const vertexCount = (this.ribbonSegments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices = [];

    for (let i = 0; i < this.ribbonSegments; i++) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v2, v1, v3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ribbonMesh = new THREE.Mesh(geo, mat);
    this.ribbonMesh.frustumCulled = false;
    this.scene.add(this.ribbonMesh);
  }

  initConstellations() {
    const starNodes = [
      new THREE.Vector3(120, 220, 450),
      new THREE.Vector3(160, 260, 490),
      new THREE.Vector3(160, 260, 490),
      new THREE.Vector3(220, 240, 520),
      new THREE.Vector3(220, 240, 520),
      new THREE.Vector3(190, 190, 470),
      new THREE.Vector3(190, 190, 470),
      new THREE.Vector3(120, 220, 450),
      new THREE.Vector3(-180, 240, 500),
      new THREE.Vector3(-240, 270, 530),
      new THREE.Vector3(-240, 270, 530),
      new THREE.Vector3(-210, 310, 570),
      new THREE.Vector3(-210, 310, 570),
      new THREE.Vector3(-150, 280, 540),
    ];
    const positions = new Float32Array(starNodes.length * 3);
    for (let i = 0; i < starNodes.length; i++) {
      positions[i * 3 + 0] = starNodes[i].x;
      positions[i * 3 + 1] = starNodes[i].y;
      positions[i * 3 + 2] = starNodes[i].z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0x9dc9ff,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.constellationMesh = new THREE.LineSegments(geo, mat);
    this.scene.add(this.constellationMesh);
  }

  initComet() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(16 * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0x8feaff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.cometMesh = new THREE.Line(geo, mat);
    this.cometMesh.visible = false;
    this.scene.add(this.cometMesh);
  }

  toggleAuroraRibbon() {
    this.ribbonVisible = !this.ribbonVisible;
    if (this.ribbonMesh) this.ribbonMesh.visible = this.ribbonVisible;
    return this.ribbonVisible;
  }

  triggerHyperspaceJump() {
    this.hyperspaceActive = true;
    this.hyperspaceTimer = 3.2;
  }

  update(ship, state, isBoost, trailColorHex = 0x8fd6ff, delta = 0.016) {
    const shipPos = state.position;

    // 1. Engine Trail & Exhaust Selection
    const exhaust = EXHAUST_TYPES[this.currentExhaustKey] || EXHAUST_TYPES.ion;
    const activeTrailHex = exhaust.color || trailColorHex;

    const leftLocal = new THREE.Vector3(1.2, 0, -1.8);
    const rightLocal = new THREE.Vector3(-1.2, 0, -1.8);
    leftLocal.applyMatrix4(ship.matrixWorld);
    rightLocal.applyMatrix4(ship.matrixWorld);

    this.leftTrailPoints.unshift(leftLocal);
    this.rightTrailPoints.unshift(rightLocal);

    if (this.leftTrailPoints.length > this.trailLength) {
      this.leftTrailPoints.pop();
      this.rightTrailPoints.pop();
    }

    const posAttr = this.trailMesh.geometry.attributes.position;
    const colAttr = this.trailMesh.geometry.attributes.color;
    const colObj = new THREE.Color(activeTrailHex);

    for (let i = 0; i < this.leftTrailPoints.length - 1; i++) {
      const p1 = this.leftTrailPoints[i];
      const p2 = this.leftTrailPoints[i + 1];
      const pr1 = this.rightTrailPoints[i];
      const pr2 = this.rightTrailPoints[i + 1];

      const idxL = i * 4;
      posAttr.setXYZ(idxL + 0, p1.x, p1.y, p1.z);
      posAttr.setXYZ(idxL + 1, p2.x, p2.y, p2.z);
      posAttr.setXYZ(idxL + 2, pr1.x, pr1.y, pr1.z);
      posAttr.setXYZ(idxL + 3, pr2.x, pr2.y, pr2.z);

      const fade = 1 - i / this.trailLength;
      const intensity = (isBoost ? 1.6 : 0.85) * fade;
      colAttr.setXYZ(idxL + 0, colObj.r * intensity, colObj.g * intensity, colObj.b * intensity);
      colAttr.setXYZ(idxL + 1, colObj.r * intensity, colObj.g * intensity, colObj.b * intensity);
      colAttr.setXYZ(idxL + 2, colObj.r * intensity, colObj.g * intensity, colObj.b * intensity);
      colAttr.setXYZ(idxL + 3, colObj.r * intensity, colObj.g * intensity, colObj.b * intensity);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // 2. Volumetric Warp Tunnel Update
    if (this.warpTunnelMesh) {
      this.warpTunnelMesh.position.set(shipPos.x, shipPos.y, shipPos.z + 80);
      this.warpTunnelMesh.rotation.z += delta * (this.hyperspaceActive ? 3.5 : 0.5);
      const targetTunnelOpacity = this.hyperspaceActive ? 0.85 : 0;
      this.warpTunnelMesh.material.opacity +=
        (targetTunnelOpacity - this.warpTunnelMesh.material.opacity) * Math.min(1, delta * 8);
      this.warpTunnelMesh.visible = this.warpTunnelMesh.material.opacity > 0.01;
    }

    // 3. Energy Shield Bubble Update
    if (this.shieldMesh) {
      this.shieldMesh.position.set(shipPos.x, shipPos.y, shipPos.z);
      this.shieldMesh.rotation.y += delta * 1.5;
      this.shieldMesh.rotation.x += delta * 0.8;

      if (this.shieldHitIntensity > 0) {
        this.shieldHitIntensity = Math.max(0, this.shieldHitIntensity - delta * 3.5);
      }

      const targetShieldOpacity = state.shieldActive ? 0.75 + this.shieldHitIntensity * 0.25 : 0;
      this.shieldMesh.material.opacity +=
        (targetShieldOpacity - this.shieldMesh.material.opacity) * Math.min(1, delta * 12);
      this.shieldMesh.visible = this.shieldMesh.material.opacity > 0.01;

      const scale = 1.0 + this.shieldHitIntensity * 0.35 + Math.sin(state.elapsed * 6) * 0.04;
      this.shieldMesh.scale.set(scale, scale, scale);
    }

    // 4. Space Drift Side Thruster Sparks
    if (this.sparksMesh) {
      const spPositions = this.sparksMesh.geometry.attributes.position;
      const spColors = this.sparksMesh.geometry.attributes.color;
      const isDrifting = Boolean(state.isDrifting);

      // Spawn new sparks when drifting
      if (isDrifting) {
        const spawnCount = 4;
        const driftSign = state.rotation && state.rotation.z > 0 ? 1 : -1;
        for (let s = 0; s < spawnCount; s++) {
          const idx = Math.floor(Math.random() * this.sparksCount);
          const p = this.sparkData[idx];
          p.life = 0.5 + Math.random() * 0.4;
          p.maxLife = p.life;
          p.x = shipPos.x + driftSign * 1.5 + (Math.random() - 0.5) * 0.4;
          p.y = shipPos.y - 0.2 + (Math.random() - 0.5) * 0.4;
          p.z = shipPos.z - 1.2 + (Math.random() - 0.5) * 0.4;

          p.vx = driftSign * (6 + Math.random() * 8);
          p.vy = (Math.random() - 0.5) * 4;
          p.vz = -10 - Math.random() * 15;
        }
      }

      for (let i = 0; i < this.sparksCount; i++) {
        const p = this.sparkData[i];
        if (p.life > 0) {
          p.life -= delta;
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;

          spPositions.setXYZ(i, p.x, p.y, p.z);
          const alpha = Math.max(0, p.life / p.maxLife);
          spColors.setXYZ(i, 1.0 * alpha, (0.5 + Math.random() * 0.4) * alpha, 0.2 * alpha);
        } else {
          spPositions.setXYZ(i, 0, -1000, 0);
        }
      }
      spPositions.needsUpdate = true;
      spColors.needsUpdate = true;
    }

    // 5. Stardust update
    const dustPositions = this.stardust.geometry.attributes.position;
    const halfRange = this.stardustRange * 0.5;

    for (let i = 0; i < this.stardustCount; i++) {
      let x = dustPositions.getX(i);
      let y = dustPositions.getY(i);
      let z = dustPositions.getZ(i);

      if (z < shipPos.z - halfRange) z += this.stardustRange;
      if (z > shipPos.z + halfRange) z -= this.stardustRange;
      if (x < shipPos.x - halfRange) x += this.stardustRange;
      if (x > shipPos.x + halfRange) x -= this.stardustRange;
      if (y < shipPos.y - halfRange) y += this.stardustRange;
      if (y > shipPos.y + halfRange) y -= this.stardustRange;

      dustPositions.setXYZ(i, x, y, z);
    }
    dustPositions.needsUpdate = true;

    // 6. Ion Rain update
    if (this.ionRain) {
      const rainPos = this.ionRain.geometry.attributes.position;
      const rainRange = 140;
      const halfRain = rainRange * 0.5;
      for (let i = 0; i < this.ionRainCount; i++) {
        let x = rainPos.getX(i * 2);
        let y = rainPos.getY(i * 2) - delta * 35;
        let z = rainPos.getZ(i * 2);

        if (y < shipPos.y - 30) y = shipPos.y + 40;
        if (z < shipPos.z - halfRain) z += rainRange;
        if (z > shipPos.z + halfRain) z -= rainRange;
        if (x < shipPos.x - halfRain) x += rainRange;
        if (x > shipPos.x + halfRain) x -= rainRange;

        rainPos.setXYZ(i * 2 + 0, x, y, z);
        rainPos.setXYZ(i * 2 + 1, x, y - 4.5, z);
      }
      this.ionRain.geometry.attributes.position.needsUpdate = true;
    }

    // 7. Warp Lines
    if (this.hyperspaceTimer > 0) {
      this.hyperspaceTimer -= delta;
      if (this.hyperspaceTimer <= 0) this.hyperspaceActive = false;
    }

    const currentWarpTheme = WARP_THEMES[this.currentWarpThemeKey] || WARP_THEMES.cyan;
    if (currentWarpTheme.isRainbow && this.warpLines) {
      const rainbowHue = (state.elapsed * 0.3) % 1;
      this.warpLines.material.color.setHSL(rainbowHue, 0.9, 0.7);
    }

    const targetWarpOpacity = this.hyperspaceActive || isBoost ? (this.hyperspaceActive ? 1.0 : 0.85) : 0;
    this.warpLines.material.opacity += (targetWarpOpacity - this.warpLines.material.opacity) * 0.14;

    if (this.warpLines.material.opacity > 0.01) {
      const warpPos = this.warpLines.geometry.attributes.position;
      const length = this.hyperspaceActive ? 65 : isBoost ? 30 : 12;
      for (let i = 0; i < this.warpCount; i++) {
        let z = warpPos.getZ(i * 2);
        if (z < shipPos.z - 30) {
          const x = shipPos.x + (Math.random() - 0.5) * 80;
          const y = shipPos.y + (Math.random() - 0.5) * 60;
          z = shipPos.z + 60 + Math.random() * 60;
          warpPos.setXYZ(i * 2 + 0, x, y, z);
          warpPos.setXYZ(i * 2 + 1, x, y, z + length);
        } else {
          warpPos.setZ(i * 2 + 1, z + length);
        }
      }
      warpPos.needsUpdate = true;
    }

    // 8. Aurora Flight Ribbon
    if (this.ribbonVisible && this.ribbonMesh) {
      const ribPos = this.ribbonMesh.geometry.attributes.position;
      const ribCol = this.ribbonMesh.geometry.attributes.color;
      const stepZ = this.ribbonLength / this.ribbonSegments;
      const ribbonWidth = 2.4;

      for (let i = 0; i <= this.ribbonSegments; i++) {
        const z = shipPos.z - 10 + i * stepZ;
        const cx = pathX(z);
        const cy = pathY(z) - 0.8;

        ribPos.setXYZ(i * 2 + 0, cx - ribbonWidth, cy, z);
        ribPos.setXYZ(i * 2 + 1, cx + ribbonWidth, cy, z);

        const fade = (i / this.ribbonSegments) * 0.8;
        ribCol.setXYZ(i * 2 + 0, colObj.r * fade, colObj.g * fade, colObj.b * fade);
        ribCol.setXYZ(i * 2 + 1, colObj.r * fade, colObj.g * fade, colObj.b * fade);
      }
      ribPos.needsUpdate = true;
      ribCol.needsUpdate = true;
    }

    // 9. Constellation following forward
    if (this.constellationMesh) {
      this.constellationMesh.position.z = shipPos.z;
    }

    // 10. Streaking Comet
    this.updateComet(shipPos, delta);
  }

  updateComet(shipPos, delta) {
    if (!this.cometActive) {
      this.nextCometTime -= delta;
      if (this.nextCometTime <= 0) {
        this.cometActive = true;
        this.cometPos.set(
          shipPos.x + (Math.random() - 0.5) * 600,
          shipPos.y + 180 + Math.random() * 150,
          shipPos.z + 350
        );
        this.cometVelocity.set((Math.random() - 0.5) * 120, -40 - Math.random() * 30, -80 - Math.random() * 60);
        this.cometMesh.visible = true;
      }
    } else {
      this.cometPos.addScaledVector(this.cometVelocity, delta);
      const cPos = this.cometMesh.geometry.attributes.position;
      for (let i = 0; i < 16; i++) {
        const trailOffset = this.cometVelocity.clone().multiplyScalar(-i * 0.04);
        cPos.setXYZ(
          i,
          this.cometPos.x + trailOffset.x,
          this.cometPos.y + trailOffset.y,
          this.cometPos.z + trailOffset.z
        );
      }
      cPos.needsUpdate = true;

      if (this.cometPos.z < shipPos.z - 100) {
        this.cometActive = false;
        this.cometMesh.visible = false;
        this.nextCometTime = 12 + Math.random() * 18;
      }
    }
  }

  dispose() {
    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.geometry.dispose();
      this.trailMesh.material.dispose();
    }
    if (this.sparksMesh) {
      this.scene.remove(this.sparksMesh);
      this.sparksMesh.geometry.dispose();
      this.sparksMesh.material.dispose();
    }
    if (this.stardust) {
      this.scene.remove(this.stardust);
      this.stardust.geometry.dispose();
      this.stardust.material.dispose();
    }
    if (this.ionRain) {
      this.scene.remove(this.ionRain);
      this.ionRain.geometry.dispose();
      this.ionRain.material.dispose();
    }
    if (this.warpLines) {
      this.scene.remove(this.warpLines);
      this.warpLines.geometry.dispose();
      this.warpLines.material.dispose();
    }
    if (this.warpTunnelMesh) {
      this.scene.remove(this.warpTunnelMesh);
      this.warpTunnelMesh.geometry.dispose();
      this.warpTunnelMesh.material.dispose();
    }
    if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
      this.shieldMesh.geometry.dispose();
      this.shieldMesh.material.dispose();
    }
    if (this.ribbonMesh) {
      this.scene.remove(this.ribbonMesh);
      this.ribbonMesh.geometry.dispose();
      this.ribbonMesh.material.dispose();
    }
    if (this.constellationMesh) {
      this.scene.remove(this.constellationMesh);
      this.constellationMesh.geometry.dispose();
      this.constellationMesh.material.dispose();
    }
    if (this.cometMesh) {
      this.scene.remove(this.cometMesh);
      this.cometMesh.geometry.dispose();
      this.cometMesh.material.dispose();
    }
  }
}
