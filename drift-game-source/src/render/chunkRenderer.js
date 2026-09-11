import * as THREE from "three";
import { generateChunkData, DEFAULT_CHUNK_CONFIG } from "../core/chunkGenerator.js";
import { chunkIndexForZ, getChunksToLoad, getChunksToUnload } from "../core/chunkManager.js";
import { RenderError } from "../utils/errors.js";

const CRYSTAL_GEOMETRIES = [
  new THREE.IcosahedronGeometry(1, 0),
  new THREE.OctahedronGeometry(1, 0),
  new THREE.TetrahedronGeometry(1, 0),
];
const PLANET_GEOMETRY = new THREE.SphereGeometry(1, 24, 20);
const RING_GEOMETRY = new THREE.TorusGeometry(6.2, 0.35, 12, 36);
const PLANET_RING_GEOMETRY = new THREE.RingGeometry(1.6, 2.6, 32);
const STARGATE_FRAME_GEO = new THREE.TorusGeometry(16, 1.2, 8, 8);
const STARGATE_INNER_GEO = new THREE.TorusGeometry(14, 0.4, 12, 32);
const BLACK_HOLE_GEO = new THREE.SphereGeometry(1, 32, 24);
const ACCRETION_GEO = new THREE.RingGeometry(1.4, 3.8, 36);
const UFO_SAUCER_GEO = new THREE.CylinderGeometry(1.8, 2.8, 0.4, 16);
const UFO_DOME_GEO = new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
const BEACON_GEO = new THREE.OctahedronGeometry(1.2, 0);

function buildFaunaGroup(scale, hue, glowTexture) {
  const faunaGroup = new THREE.Group();
  const color = new THREE.Color().setHSL(hue, 0.75, 0.65);

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.85,
    roughness: 0.4,
  });

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.5, 5), mat);
  body.rotation.x = Math.PI / 2;
  faunaGroup.add(body);

  const wingGeo = new THREE.BoxGeometry(4.2, 0.1, 2.2);
  const wings = new THREE.Mesh(wingGeo, mat);
  wings.position.set(0, 0, -0.4);
  faunaGroup.add(wings);

  const auraMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aura = new THREE.Sprite(auraMat);
  aura.scale.set(8, 8, 1);
  faunaGroup.add(aura);

  faunaGroup.scale.setScalar(scale * 0.2);
  return faunaGroup;
}

function buildUfoGroup(scale, hue, glowTexture) {
  const ufoGroup = new THREE.Group();
  const ufoColor = new THREE.Color().setHSL(hue, 0.85, 0.65);

  // 1. Sleek metallic saucer hull
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xaec0dc,
    emissive: 0x18243c,
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.88,
  });
  const saucer = new THREE.Mesh(UFO_SAUCER_GEO, hullMat);
  ufoGroup.add(saucer);

  // 2. Translucent glowing bubble cockpit
  const domeMat = new THREE.MeshStandardMaterial({
    color: ufoColor,
    emissive: ufoColor,
    emissiveIntensity: 1.1,
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.92,
  });
  const dome = new THREE.Mesh(UFO_DOME_GEO, domeMat);
  dome.position.y = 0.2;
  ufoGroup.add(dome);

  // 3. Perimeter rotating photon orb lights
  const ringOrbsGroup = new THREE.Group();
  const orbGeo = new THREE.SphereGeometry(0.24, 8, 8);
  const orbCount = 8;
  for (let i = 0; i < orbCount; i++) {
    const angle = (i / orbCount) * Math.PI * 2;
    const orbHue = (hue + i * 0.125) % 1;
    const orbColor = new THREE.Color().setHSL(orbHue, 0.9, 0.7);
    const orbMat = new THREE.MeshBasicMaterial({ color: orbColor });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(Math.cos(angle) * 2.7, 0, Math.sin(angle) * 2.7);
    ringOrbsGroup.add(orb);
  }
  ringOrbsGroup.userData = { isOrbRing: true };
  ufoGroup.add(ringOrbsGroup);

  // 4. Downward soft glowing tractor beam
  const beamGeo = new THREE.CylinderGeometry(0.4, 3.2, 7.5, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: ufoColor,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const tractorBeam = new THREE.Mesh(beamGeo, beamMat);
  tractorBeam.position.y = -3.8;
  ufoGroup.add(tractorBeam);

  // 5. Glowing cockpit aura
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: ufoColor,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  aura.scale.set(7.5, 7.5, 1);
  ufoGroup.add(aura);

  ufoGroup.scale.setScalar(scale * 0.45);
  ufoGroup.userData = { isUfo: true, encountered: false };
  return ufoGroup;
}

function buildPulsarGroup(glowTexture) {
  const pulsarGroup = new THREE.Group();
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const core = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 16), coreMat);
  pulsarGroup.add(core);

  // Glowing Core Aura
  const coreAura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x7feaff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  coreAura.scale.set(65, 65, 1);
  pulsarGroup.add(coreAura);

  // Magnetic Field Torus Rings
  const torusGeo = new THREE.TorusGeometry(32, 1.2, 8, 32);
  const torusMat = new THREE.MeshBasicMaterial({
    color: 0x5be7ff,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const magRing1 = new THREE.Mesh(torusGeo, torusMat);
  magRing1.rotation.x = Math.PI * 0.5;
  const magRing2 = new THREE.Mesh(torusGeo, torusMat);
  magRing2.rotation.y = Math.PI * 0.5;
  pulsarGroup.add(magRing1);
  pulsarGroup.add(magRing2);

  // Dual Relativistic Jet Plasma Beams
  const beamGeo = new THREE.CylinderGeometry(3.5, 45, 520, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x6ee7ff,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam1 = new THREE.Mesh(beamGeo, beamMat);
  beam1.position.y = 260;
  const beam2 = new THREE.Mesh(beamGeo, beamMat);
  beam2.position.y = -260;
  pulsarGroup.add(beam1);
  pulsarGroup.add(beam2);

  pulsarGroup.userData = { isPulsar: true, encountered: false };
  return pulsarGroup;
}

function buildBeaconGroup(scale, hue, glowTexture) {
  const beaconGroup = new THREE.Group();
  const beaconColor = new THREE.Color().setHSL(hue, 0.85, 0.7);

  const bMat = new THREE.MeshStandardMaterial({
    color: beaconColor,
    emissive: beaconColor,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.85,
  });
  const beacon = new THREE.Mesh(BEACON_GEO, bMat);
  beacon.scale.set(2.8, 6.0, 2.8);
  beaconGroup.add(beacon);

  // Orbiting Resonant Nodes
  const orbitGroup = new THREE.Group();
  const nodeGeo = new THREE.OctahedronGeometry(0.6, 0);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.set(Math.cos(angle) * 5.2, (i - 1) * 1.5, Math.sin(angle) * 5.2);
    orbitGroup.add(node);
  }
  orbitGroup.userData = { isBeaconOrbit: true };
  beaconGroup.add(orbitGroup);

  // Radiant Aura
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: beaconColor,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  aura.scale.set(18, 18, 1);
  beaconGroup.add(aura);

  beaconGroup.userData = { isBeacon: true, encountered: false };
  return beaconGroup;
}

function buildChunkGroup(chunkData, glowTexture) {
  const group = new THREE.Group();
  const palette = new THREE.Color().setHSL(chunkData.hue, 0.65, 0.62);

  // Crystals
  for (const crystal of chunkData.crystals) {
    const color = palette.clone().offsetHSL(crystal.hueOffset, 0, crystal.lightnessOffset);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: palette,
      emissiveIntensity: crystal.emissiveIntensity,
      roughness: 0.35,
      metalness: 0.45,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(CRYSTAL_GEOMETRIES[crystal.geometryVariant], material);
    mesh.position.set(crystal.x, crystal.y, crystal.z);
    mesh.scale.set(crystal.scale, crystal.scale * crystal.scaleYMultiplier, crystal.scale);
    mesh.rotation.set(...crystal.rotation);
    group.add(mesh);
  }

  // Breathing Nebula Cloud
  if (chunkData.nebula) {
    const material = new THREE.SpriteMaterial({
      map: glowTexture,
      color: palette,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(chunkData.nebula.x, chunkData.nebula.y, chunkData.nebula.z);
    sprite.scale.set(chunkData.nebula.scale, chunkData.nebula.scale, 1);
    sprite.userData = { isNebula: true, baseOpacity: 0.32, baseScale: chunkData.nebula.scale };
    group.add(sprite);
  }

  // Distant Planet
  if (chunkData.planet) {
    const planetGroup = new THREE.Group();
    const color = new THREE.Color().setHSL(chunkData.planet.hue, 0.6, 0.58);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.22,
      roughness: 0.75,
      metalness: 0.2,
    });
    const planet = new THREE.Mesh(PLANET_GEOMETRY, material);
    planetGroup.add(planet);

    if (chunkData.planet.hasRings) {
      const ringMat = new THREE.MeshStandardMaterial({
        color: color.clone().offsetHSL(0.08, 0, 0.1),
        emissive: color,
        emissiveIntensity: 0.15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const pRing = new THREE.Mesh(PLANET_RING_GEOMETRY, ringMat);
      pRing.rotation.x = Math.PI * 0.4;
      planetGroup.add(pRing);
    }

    planetGroup.position.set(chunkData.planet.x, chunkData.planet.y, chunkData.planet.z);
    planetGroup.scale.setScalar(chunkData.planet.scale);
    group.add(planetGroup);
  }

  // Resonance Rings
  if (chunkData.rings && chunkData.rings.length > 0) {
    for (const r of chunkData.rings) {
      const ringColor = new THREE.Color().setHSL(r.hue, 0.75, 0.65);
      const ringMat = new THREE.MeshStandardMaterial({
        color: ringColor,
        emissive: ringColor,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8,
      });
      const ringMesh = new THREE.Mesh(RING_GEOMETRY, ringMat);
      ringMesh.position.set(r.x, r.y, r.z);
      ringMesh.userData = { isRing: true, id: r.id, radius: r.radius, collected: false, initialZ: r.z };
      group.add(ringMesh);

      const glowMat = new THREE.SpriteMaterial({
        map: glowTexture,
        color: ringColor,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(glowMat);
      sprite.position.set(r.x, r.y, r.z);
      sprite.scale.set(16, 16, 1);
      group.add(sprite);
    }
  }

  // Ancient Megastructure Stargates
  if (chunkData.stargate) {
    const gateGroup = new THREE.Group();
    const gateColor = new THREE.Color().setHSL(chunkData.stargate.hue, 0.8, 0.68);
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x1a2238,
      emissive: gateColor,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.9,
    });
    const outerFrame = new THREE.Mesh(STARGATE_FRAME_GEO, gateMat);
    const innerRing = new THREE.Mesh(STARGATE_INNER_GEO, gateMat);
    gateGroup.add(outerFrame);
    gateGroup.add(innerRing);

    const gateAura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: gateColor,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    gateAura.scale.set(42, 42, 1);
    gateGroup.add(gateAura);

    gateGroup.position.set(chunkData.stargate.x, chunkData.stargate.y, chunkData.stargate.z);
    gateGroup.userData = { isStargate: true, id: chunkData.stargate.id, passed: false };
    group.add(gateGroup);
  }

  // Gravitational Singularity / Black Hole
  if (chunkData.singularity) {
    const holeGroup = new THREE.Group();
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const coreMesh = new THREE.Mesh(BLACK_HOLE_GEO, coreMat);
    holeGroup.add(coreMesh);

    const diskColor = new THREE.Color(0x38e1ff);
    const diskMat = new THREE.MeshStandardMaterial({
      color: diskColor,
      emissive: diskColor,
      emissiveIntensity: 1.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const disk = new THREE.Mesh(ACCRETION_GEO, diskMat);
    disk.rotation.x = Math.PI * 0.35;
    holeGroup.add(disk);

    holeGroup.position.set(chunkData.singularity.x, chunkData.singularity.y, chunkData.singularity.z);
    holeGroup.scale.setScalar(chunkData.singularity.radius);
    group.add(holeGroup);
  }

  // Astral Space Fauna (Space Manta)
  if (chunkData.fauna) {
    const fauna = buildFaunaGroup(chunkData.fauna.scale, chunkData.fauna.hue, glowTexture);
    fauna.position.set(chunkData.fauna.x, chunkData.fauna.y, chunkData.fauna.z);
    group.add(fauna);
  }

  // Friendly Flying Saucers / UFOs
  const ufoList = chunkData.ufos || (chunkData.ufo ? [chunkData.ufo] : []);
  for (const u of ufoList) {
    const ufo = buildUfoGroup(u.scale, u.hue, glowTexture);
    ufo.position.set(u.x, u.y, u.z);
    ufo.userData.id = u.id;
    group.add(ufo);
  }

  // Rotating Pulsar
  if (chunkData.pulsar) {
    const pulsar = buildPulsarGroup(glowTexture);
    pulsar.position.set(chunkData.pulsar.x, chunkData.pulsar.y, chunkData.pulsar.z);
    group.add(pulsar);
  }

  // Ancient Harmonic Space Beacon
  if (chunkData.beacon) {
    const beacon = buildBeaconGroup(1, chunkData.beacon.hue, glowTexture);
    beacon.position.set(chunkData.beacon.x, chunkData.beacon.y, chunkData.beacon.z);
    beacon.userData.id = chunkData.beacon.id;
    group.add(beacon);
  }

  return group;
}

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

export class ChunkRenderer {
  constructor(scene, glowTexture, config = DEFAULT_CHUNK_CONFIG) {
    if (!scene) throw new RenderError("ChunkRenderer requires a THREE.Scene");
    if (!glowTexture) throw new RenderError("ChunkRenderer requires a glow texture");
    this.scene = scene;
    this.glowTexture = glowTexture;
    this.config = config;
    this.loaded = new Map();
    this.collectedRings = new Set();
    this.passedStargates = new Set();
    this.encounteredUfos = new Set();
    this.encounteredBeacons = new Set();
    this.encounteredPulsars = new Set();
  }

  update(shipZ, elapsed = 0) {
    const currentIndex = chunkIndexForZ(shipZ, this.config.chunkLength);
    const loadedIndices = new Set(this.loaded.keys());

    for (const index of getChunksToLoad(currentIndex, loadedIndices)) {
      const data = generateChunkData(index, this.config);
      const group = buildChunkGroup(data, this.glowTexture);
      this.scene.add(group);
      this.loaded.set(index, group);
    }

    for (const index of getChunksToUnload(currentIndex, loadedIndices)) {
      const group = this.loaded.get(index);
      if (group) {
        this.scene.remove(group);
        disposeGroup(group);
        this.loaded.delete(index);
      }
    }

    // Dynamic animations: breathing nebulae, rotating UFOs, orbiting Beacon nodes, and Pulsar relativistic beams
    for (const [idx, group] of this.loaded.entries()) {
      for (const child of group.children) {
        if (child.userData) {
          if (child.userData.isNebula && child.material) {
            const pulse = Math.sin(elapsed * 0.7 + idx * 1.5) * 0.08;
            child.material.opacity = child.userData.baseOpacity + pulse;
          }
          if (child.userData.isUfo) {
            child.rotation.y += 0.025;
            child.position.y += Math.sin(elapsed * 2.2 + idx * 1.3) * 0.035;
            for (const sub of child.children) {
              if (sub.userData && sub.userData.isOrbRing) {
                sub.rotation.y += 0.06;
              }
            }
          }
          if (child.userData.isBeacon) {
            child.rotation.y += 0.015;
            for (const sub of child.children) {
              if (sub.userData && sub.userData.isBeaconOrbit) {
                sub.rotation.y += 0.04;
              }
            }
          }
          if (child.userData.isPulsar) {
            child.rotation.z += 0.06;
            child.rotation.x += 0.03;
          }
        }
      }
    }
  }

  checkRingCollisions(shipPos, onCollect) {
    for (const group of this.loaded.values()) {
      for (const child of group.children) {
        if (child.userData && child.userData.isRing && !child.userData.collected) {
          const dz = Math.abs(shipPos.z - child.position.z);
          if (dz < 4.0) {
            const dx = shipPos.x - child.position.x;
            const dy = shipPos.y - child.position.y;
            const dist2D = Math.sqrt(dx * dx + dy * dy);
            if (dist2D <= child.userData.radius + 1.2) {
              child.userData.collected = true;
              this.collectedRings.add(child.userData.id);
              child.scale.set(1.6, 1.6, 1.6);
              if (typeof onCollect === "function") onCollect(child.position);
            }
          }
        }
      }
    }
  }

  checkStargateCollisions(shipPos, onPass) {
    for (const group of this.loaded.values()) {
      for (const child of group.children) {
        if (child.userData && child.userData.isStargate && !child.userData.passed) {
          const dz = Math.abs(shipPos.z - child.position.z);
          if (dz < 6.0) {
            const dx = shipPos.x - child.position.x;
            const dy = shipPos.y - child.position.y;
            const dist2D = Math.sqrt(dx * dx + dy * dy);
            if (dist2D <= 20) {
              child.userData.passed = true;
              this.passedStargates.add(child.userData.id);
              if (typeof onPass === "function") onPass(child.position);
            }
          }
        }
      }
    }
  }

  checkUfoEncounters(shipPos, onEncounter) {
    for (const group of this.loaded.values()) {
      for (const child of group.children) {
        if (child.userData && child.userData.isUfo && !child.userData.encountered) {
          const dz = Math.abs(shipPos.z - child.position.z);
          if (dz < 16.0) {
            const dx = shipPos.x - child.position.x;
            const dy = shipPos.y - child.position.y;
            const dist2D = Math.sqrt(dx * dx + dy * dy);
            if (dist2D <= 35) {
              child.userData.encountered = true;
              if (child.userData.id) this.encounteredUfos.add(child.userData.id);
              if (typeof onEncounter === "function") onEncounter(child.position);
            }
          }
        }
      }
    }
  }

  checkBeaconEncounters(shipPos, onEncounter) {
    for (const group of this.loaded.values()) {
      for (const child of group.children) {
        if (child.userData && child.userData.isBeacon && !child.userData.encountered) {
          const dz = Math.abs(shipPos.z - child.position.z);
          if (dz < 14.0) {
            const dx = shipPos.x - child.position.x;
            const dy = shipPos.y - child.position.y;
            const dist2D = Math.sqrt(dx * dx + dy * dy);
            if (dist2D <= 28) {
              child.userData.encountered = true;
              if (child.userData.id) this.encounteredBeacons.add(child.userData.id);
              if (typeof onEncounter === "function") onEncounter(child.position);
            }
          }
        }
      }
    }
  }

  checkPulsarEncounters(shipPos, onEncounter) {
    for (const group of this.loaded.values()) {
      for (const child of group.children) {
        if (child.userData && child.userData.isPulsar && !child.userData.encountered) {
          const dz = Math.abs(shipPos.z - child.position.z);
          if (dz < 60.0) {
            const dx = shipPos.x - child.position.x;
            const dy = shipPos.y - child.position.y;
            const dist2D = Math.sqrt(dx * dx + dy * dy);
            if (dist2D <= 450) {
              child.userData.encountered = true;
              if (child.userData.id) this.encounteredPulsars.add(child.userData.id);
              if (typeof onEncounter === "function") onEncounter(child.position);
            }
          }
        }
      }
    }
  }

  clear() {
    for (const group of this.loaded.values()) {
      this.scene.remove(group);
      disposeGroup(group);
    }
    this.loaded.clear();
    this.collectedRings.clear();
    this.passedStargates.clear();
    this.encounteredUfos.clear();
    this.encounteredBeacons.clear();
    this.encounteredPulsars.clear();
  }
}
