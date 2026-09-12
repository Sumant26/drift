import * as THREE from "three";
import { createInitialState, updateFlightState, DEFAULT_FLIGHT_CONFIG } from "./core/gameState.js";
import { createInputState, bindKeyboard, bindTouchButton } from "./input/inputManager.js";
import { GamepadManager } from "./input/gamepadManager.js";
import { buildScene, resizeScene, updateAtmosphere } from "./render/sceneBuilder.js";
import { buildShip, applyShipTransform, setShipTheme, SHIP_THEMES } from "./render/shipBuilder.js";
import { ChunkRenderer } from "./render/chunkRenderer.js";
import { CameraManager, CAMERA_MODES } from "./render/cameraManager.js";
import { EffectsManager } from "./render/effectsBuilder.js";
import { PhotoModeManager } from "./render/photoMode.js";
import { SoundManager } from "./audio/soundManager.js";
import { getBiomeForZ, BIOMES, SECTOR_LENGTH } from "./core/biomes.js";
import { loadCodex, saveCodex, recordSectorDiscovery, recordAnomalyDiscovery } from "./core/codex.js";
import { DEFAULT_CHUNK_CONFIG } from "./core/chunkGenerator.js";
import { GameError } from "./utils/errors.js";

const MAX_DELTA = 0.1;

function showFatalError(message) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
    "background:#06040f;color:#d8dcff;font-family:sans-serif;padding:24px;text-align:center;z-index:999;";
  el.textContent = message;
  document.body.appendChild(el);
}

export function startGame() {
  let renderer, scene, camera, glowTexture, hemiLight;
  try {
    ({ renderer, scene, camera, glowTexture, hemiLight } = buildScene(document, window.innerWidth, window.innerHeight));
  } catch (err) {
    showFatalError("This browser can't run Drift: " + err.message);
    return;
  }
  document.body.appendChild(renderer.domElement);

  // 1. Persistent Codex Logbook
  let codex = loadCodex();

  // 2. Scene & Ship
  let currentThemeKey = "arctic";
  const ship = buildShip(glowTexture, currentThemeKey);
  scene.add(ship);

  // 3. Subsystems
  const chunkRenderer = new ChunkRenderer(scene, glowTexture, DEFAULT_CHUNK_CONFIG);
  const cameraManager = new CameraManager(camera);
  const effectsManager = new EffectsManager(scene, glowTexture);
  const soundManager = new SoundManager();
  const gamepadManager = new GamepadManager();

  // 4. State & Variables
  let state = createInitialState(DEFAULT_FLIGHT_CONFIG);
  let isAutopilot = false;
  let isCrtMode = false;
  let currentSectorIndex = 1;
  let ringScore = 0;
  let ringStreak = 0;
  let bannerTimeout = null;
  let warpBannerTimeout = null;
  let lastSaveZ = 0;

  // 5. Photo Mode Setup
  const photoManager = new PhotoModeManager(camera, renderer, () => {
    document.getElementById("photoHud")?.classList.remove("visible");
    document.getElementById("hud")?.style.setProperty("display", "flex");
  });

  // 6. Input System
  const inputRef = { current: createInputState() };
  const unbindHooks = [];

  function userInteracted() {
    hideIntro();
    soundManager.init();
  }

  function hideIntro() {
    const el = document.getElementById("intro");
    if (el) el.classList.add("hidden");
  }

  try {
    unbindHooks.push(bindKeyboard(window, inputRef, { onFirstInput: userInteracted }));
  } catch (err) {
    console.warn("Keyboard input unavailable:", err.message);
  }

  for (const [id, flag] of [
    ["tp-up", "up"],
    ["tp-down", "down"],
    ["tp-left", "left"],
    ["tp-right", "right"],
    ["tp-shield", "shield"],
    ["boostbtn", "boost"],
  ]) {
    try {
      unbindHooks.push(bindTouchButton(document, id, flag, inputRef, { onFirstInput: userInteracted }));
    } catch (err) {
      console.warn(`Touch control "${id}" unavailable:`, err.message);
    }
  }

  // 7. Tactical Radar & Audio Visualizer Canvas Helpers
  const radarCanvas = document.getElementById("radarCanvas");
  const radarCtx = radarCanvas?.getContext("2d");
  const vizCanvas = document.getElementById("audioVisualizerCanvas");
  const vizCtx = vizCanvas?.getContext("2d");

  function drawTacticalRadar(shipZ, offsetX, _offsetY) {
    if (!radarCtx || !radarCanvas) return;
    const w = radarCanvas.width;
    const h = radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    radarCtx.clearRect(0, 0, w, h);

    // Outer grid rings
    radarCtx.strokeStyle = "rgba(110, 231, 255, 0.25)";
    radarCtx.lineWidth = 1;
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, 24, 0, Math.PI * 2);
    radarCtx.arc(cx, cy, 48, 0, Math.PI * 2);
    radarCtx.stroke();

    // Crosshairs
    radarCtx.strokeStyle = "rgba(110, 231, 255, 0.18)";
    radarCtx.beginPath();
    radarCtx.moveTo(cx, 4);
    radarCtx.lineTo(cx, h - 4);
    radarCtx.moveTo(4, cy);
    radarCtx.lineTo(w - 4, cy);
    radarCtx.stroke();

    // Player position marker (center bottom)
    const playerX = cx + (offsetX / DEFAULT_FLIGHT_CONFIG.maxOffset) * 22;
    const playerY = cy + 32;
    radarCtx.fillStyle = "#38bdf8";
    radarCtx.beginPath();
    radarCtx.moveTo(playerX, playerY - 5);
    radarCtx.lineTo(playerX - 4, playerY + 4);
    radarCtx.lineTo(playerX + 4, playerY + 4);
    radarCtx.closePath();
    radarCtx.fill();

    // Query and draw ahead celestial objects
    const ahead = chunkRenderer.getAheadCorridorObjects(shipZ, 260);
    for (const obj of ahead) {
      const normZ = obj.deltaZ / 260; // 0 (near) to 1 (far)
      const objY = cy + 32 - normZ * 70;
      const objX = cx + ((obj.x - (state.basePosition?.x || 0)) / DEFAULT_FLIGHT_CONFIG.maxOffset) * 26;

      if (objX < 6 || objX > w - 6 || objY < 6 || objY > h - 6) continue;

      if (obj.type === "ring") {
        radarCtx.fillStyle = "#22d3ee";
        radarCtx.beginPath();
        radarCtx.arc(objX, objY, 2.5, 0, Math.PI * 2);
        radarCtx.fill();
      } else if (obj.type === "stargate") {
        radarCtx.strokeStyle = "#fbbf24";
        radarCtx.lineWidth = 1.5;
        radarCtx.strokeRect(objX - 3, objY - 3, 6, 6);
      } else if (obj.type === "asteroid") {
        radarCtx.fillStyle = "#f97316";
        radarCtx.beginPath();
        radarCtx.arc(objX, objY, 2.0, 0, Math.PI * 2);
        radarCtx.fill();
      } else if (obj.type === "singularity") {
        radarCtx.fillStyle = "#c084fc";
        radarCtx.beginPath();
        radarCtx.arc(objX, objY, 4.0, 0, Math.PI * 2);
        radarCtx.fill();
      } else {
        radarCtx.fillStyle = "#a7f3d0";
        radarCtx.fillRect(objX - 2, objY - 2, 4, 4);
      }
    }
  }

  function drawAudioVisualizer() {
    if (!vizCtx || !vizCanvas) return;
    const w = vizCanvas.width;
    const h = vizCanvas.height;
    vizCtx.clearRect(0, 0, w, h);

    const freqData = soundManager.getAudioFrequencies();
    const barCount = 5;
    const barWidth = 3;
    const gap = 3;
    const totalW = barCount * barWidth + (barCount - 1) * gap; // 5*3 + 4*3 = 27
    const startX = Math.floor((w - totalW) / 2);

    for (let i = 0; i < barCount; i++) {
      let val;
      if (freqData && freqData.length > 0) {
        val = (freqData[i * 3] || 25) / 255;
      } else {
        val = 0.25 + Math.sin(state.elapsed * 4.5 + i * 1.3) * 0.22;
      }
      val = Math.max(0.15, Math.min(1.0, val));
      const barH = Math.max(2, Math.round(val * (h - 2)));
      vizCtx.fillStyle = `hsl(${180 + i * 18}, 95%, 65%)`;
      vizCtx.fillRect(startX + i * (barWidth + gap), h - barH, barWidth, barH);
    }
  }

  // 8. UI Helpers & Banners
  function showSectorBanner(biomeData) {
    const banner = document.getElementById("sectorBanner");
    const numEl = document.getElementById("sectorNum");
    const titleEl = document.getElementById("sectorTitle");
    const subEl = document.getElementById("sectorSub");
    const labelEl = document.getElementById("sectorNameLabel");

    if (numEl) numEl.textContent = `SECTOR ${biomeData.sectorIndex}`;
    if (titleEl) titleEl.textContent = biomeData.biome.name;
    if (subEl) subEl.textContent = biomeData.biome.subtitle;
    if (labelEl) labelEl.textContent = biomeData.biome.name;

    if (banner) {
      banner.classList.add("visible");
      if (bannerTimeout) clearTimeout(bannerTimeout);
      bannerTimeout = setTimeout(() => {
        banner.classList.remove("visible");
      }, 4800);
    }
  }

  function showHyperspaceBanner() {
    const banner = document.getElementById("warpBanner");
    if (banner) {
      banner.classList.add("visible");
      if (warpBannerTimeout) clearTimeout(warpBannerTimeout);
      warpBannerTimeout = setTimeout(() => {
        banner.classList.remove("visible");
      }, 3200);
    }
  }

  function updateHud(st, _biomeData) {
    const speedNum = document.getElementById("speedNum");
    const speedFill = document.getElementById("speedfill");
    const distNum = document.getElementById("distNum");
    const ringCountEl = document.getElementById("ringCount");
    const streakCountEl = document.getElementById("streakCount");
    const cockpitHud = document.getElementById("cockpitHud");
    const compassHeading = document.getElementById("compassHeading");
    const compassNext = document.getElementById("compassNext");

    // Shield Elements
    const shieldFill = document.getElementById("shieldFill");
    const shieldVal = document.getElementById("shieldVal");

    // Score & Combo Elements
    const scoreVal = document.getElementById("driftScoreVal");
    const comboBadge = document.getElementById("comboBadge");
    const comboMultiplier = document.getElementById("comboMultiplier");

    if (speedNum) speedNum.textContent = Math.round(st.speed);
    if (speedFill)
      speedFill.style.width = Math.min(100, Math.round((st.speed / DEFAULT_FLIGHT_CONFIG.boostSpeed) * 100)) + "%";
    if (distNum) distNum.textContent = Math.round(st.shipZ) + " ly traveled";
    if (ringCountEl) ringCountEl.textContent = ringScore;
    if (streakCountEl) streakCountEl.textContent = ringStreak;

    // Shield Telemetry
    if (shieldFill && shieldVal) {
      const energyPct = Math.round(st.shieldEnergy !== undefined ? st.shieldEnergy : 100);
      shieldFill.style.width = `${energyPct}%`;
      shieldFill.style.background = st.shieldActive
        ? "linear-gradient(90deg, #38bdf8, #6ee7ff)"
        : "linear-gradient(90deg, #0284c7, #38bdf8)";
      shieldVal.textContent = `${energyPct}%`;
    }

    // Score & Combo Telemetry
    if (scoreVal) scoreVal.textContent = Math.round(st.driftScore || 0);
    if (comboBadge && comboMultiplier) {
      const isComboActive = (st.comboMultiplier || 1.0) > 1.0;
      comboBadge.classList.toggle("visible", isComboActive);
      comboMultiplier.textContent = `x${(st.comboMultiplier || 1.0).toFixed(1)}`;
    }

    // Horizon Compass update
    if (compassHeading && compassNext) {
      const heading = (Math.round((st.rotation.y || 0) * 57.3) + 360) % 360;
      const distToNext = Math.max(0, Math.round(SECTOR_LENGTH - (st.shipZ % SECTOR_LENGTH)));
      compassHeading.textContent = `HDG: ${heading.toString().padStart(3, "0")}°`;
      compassNext.textContent = `NEXT: ${distToNext} ly`;
    }

    // Cockpit Reticle visibility & bank tilt
    if (cockpitHud) {
      const isCockpit = cameraManager.currentMode === CAMERA_MODES.COCKPIT;
      cockpitHud.classList.toggle("visible", isCockpit);
      if (isCockpit) {
        const ladder = cockpitHud.querySelector(".reticle-ladder");
        if (ladder) {
          const bankDeg = (st.rotation.z || 0) * 45;
          ladder.style.transform = `rotate(${bankDeg}deg) translateY(${(st.rotation.x || 0) * 30}px)`;
        }
      }
    }

    // Draw Real-time Radar & Audio Visualizer
    drawTacticalRadar(st.shipZ, st.offsetX, st.offsetY);
    drawAudioVisualizer();
  }

  function updateCodexModal() {
    const lifetimeEl = document.getElementById("codexLifetime");
    const ringsEl = document.getElementById("codexRings");
    const gatesEl = document.getElementById("codexGates");
    const highScoreEl = document.getElementById("codexHighScore");
    const maxComboEl = document.getElementById("codexMaxCombo");
    const deflectionsEl = document.getElementById("codexDeflections");
    const sectorList = document.getElementById("codexSectorList");
    const anomalyList = document.getElementById("codexAnomalyList");

    const totalZ = codex.totalDistance + Math.round(state.shipZ);
    if (lifetimeEl) lifetimeEl.textContent = totalZ;
    if (ringsEl) ringsEl.textContent = codex.ringsCollected;
    if (gatesEl) gatesEl.textContent = codex.stargatesPassed;
    if (highScoreEl) highScoreEl.textContent = Math.max(codex.highScore || 0, Math.round(state.driftScore || 0));
    if (maxComboEl) maxComboEl.textContent = `x${(codex.maxCombo || 1.0).toFixed(1)}`;
    if (deflectionsEl) deflectionsEl.textContent = codex.asteroidsDeflected || 0;

    if (sectorList) {
      sectorList.innerHTML = "";
      for (const b of BIOMES) {
        const isDiscovered = codex.discoveredSectors.includes(b.id);
        const pill = document.createElement("div");
        pill.className = "disc-pill";
        pill.style.opacity = isDiscovered ? "1" : "0.45";
        pill.textContent = (isDiscovered ? "✓ " : "🔒 ") + b.name;
        sectorList.appendChild(pill);
      }
    }

    if (anomalyList) {
      const allAnomalies = [
        { id: "ufo-sighting", name: "Friendly Flying Saucers" },
        { id: "stargate", name: "Ancient Stargates" },
        { id: "space-beacon", name: "Harmonic Space Beacons" },
        { id: "pulsar", name: "Neutron Star Pulsars" },
        { id: "space-fauna", name: "Astral Space Mantas" },
        { id: "singularity", name: "Singularity Event Horizon" },
      ];
      anomalyList.innerHTML = "";
      for (const a of allAnomalies) {
        const isDiscovered = codex.discoveredAnomalies.includes(a.id);
        const pill = document.createElement("div");
        pill.className = "disc-pill";
        pill.style.opacity = isDiscovered ? "1" : "0.45";
        pill.textContent = (isDiscovered ? "✨ " : "🔒 ") + a.name;
        anomalyList.appendChild(pill);
      }
    }
  }

  // 8. Action Triggers
  let isZenMode = false;
  let zenTimerSeconds = 0;

  function toggleZenMode() {
    userInteracted();
    isZenMode = !isZenMode;
    const zenOverlay = document.getElementById("zenOverlay");
    const mainHud = document.getElementById("hud");
    const zenBtn = document.getElementById("zenBtn");

    if (zenOverlay) zenOverlay.classList.toggle("visible", isZenMode);
    if (mainHud) mainHud.style.display = isZenMode ? "none" : "flex";
    if (zenBtn) zenBtn.classList.toggle("active", isZenMode);
  }

  function cycleRadio() {
    userInteracted();
    const station = soundManager.cycleRadioStation();
    const label = document.getElementById("radioLabel");
    if (label) label.textContent = station.name.replace("Deep ", "").replace("Wave", "");
  }

  function toggleRibbon() {
    userInteracted();
    const visible = effectsManager.toggleAuroraRibbon();
    const btn = document.getElementById("ribbonBtn");
    if (btn) btn.classList.toggle("active", visible);
  }

  function toggleCrt() {
    userInteracted();
    isCrtMode = !isCrtMode;
    const overlay = document.getElementById("crtOverlay");
    const btn = document.getElementById("crtBtn");
    if (overlay) overlay.classList.toggle("visible", isCrtMode);
    if (btn) btn.classList.toggle("active", isCrtMode);
  }

  function toggleMixerModal() {
    userInteracted();
    const mixerModal = document.getElementById("mixerModal");
    mixerModal?.classList.toggle("visible");
  }

  function cycleCamera() {
    userInteracted();
    const mode = cameraManager.cycleMode();
    const label = document.getElementById("camLabel");
    if (label) {
      label.textContent =
        mode === CAMERA_MODES.CHASE ? "Chase" : mode === CAMERA_MODES.COCKPIT ? "Cockpit" : "Cinematic";
    }
  }

  function toggleAutopilot() {
    userInteracted();
    isAutopilot = !isAutopilot;
    const label = document.getElementById("autoLabel");
    const btn = document.getElementById("autoBtn");
    if (label) label.textContent = isAutopilot ? "Cruise On" : "Cruise Off";
    if (btn) btn.classList.toggle("active", isAutopilot);
  }

  function togglePhotoMode() {
    userInteracted();
    const active = photoManager.toggle(state.position);
    const photoHud = document.getElementById("photoHud");
    const mainHud = document.getElementById("hud");
    const photoBtn = document.getElementById("photoBtn");

    if (photoHud) photoHud.classList.toggle("visible", active);
    if (mainHud && !isZenMode) mainHud.style.display = active ? "none" : "flex";
    if (photoBtn) photoBtn.classList.toggle("active", active);
  }

  // Button Listeners
  document.getElementById("zenBtn")?.addEventListener("click", toggleZenMode);
  document.getElementById("exitZenBtn")?.addEventListener("click", toggleZenMode);
  document.getElementById("radioBtn")?.addEventListener("click", cycleRadio);
  document.getElementById("ribbonBtn")?.addEventListener("click", toggleRibbon);
  document.getElementById("crtBtn")?.addEventListener("click", toggleCrt);
  document.getElementById("mixerBtn")?.addEventListener("click", toggleMixerModal);
  document.getElementById("camBtn")?.addEventListener("click", cycleCamera);
  document.getElementById("autoBtn")?.addEventListener("click", toggleAutopilot);
  document.getElementById("photoBtn")?.addEventListener("click", togglePhotoMode);
  document.getElementById("exitPhotoBtn")?.addEventListener("click", togglePhotoMode);

  // Audio Mixer Controls
  const mixerModal = document.getElementById("mixerModal");
  document.getElementById("closeMixerModal")?.addEventListener("click", () => {
    mixerModal?.classList.remove("visible");
  });

  document.getElementById("sliderMaster")?.addEventListener("input", (e) => {
    const val = Number(e.target.value) / 100;
    soundManager.setVolume("master", val);
    const valEl = document.getElementById("valMaster");
    if (valEl) valEl.textContent = `${e.target.value}%`;
  });
  document.getElementById("sliderMusic")?.addEventListener("input", (e) => {
    const val = Number(e.target.value) / 100;
    soundManager.setVolume("music", val);
    const valEl = document.getElementById("valMusic");
    if (valEl) valEl.textContent = `${e.target.value}%`;
  });
  document.getElementById("sliderEngine")?.addEventListener("input", (e) => {
    const val = Number(e.target.value) / 100;
    soundManager.setVolume("engine", val);
    const valEl = document.getElementById("valEngine");
    if (valEl) valEl.textContent = `${e.target.value}%`;
  });
  document.getElementById("sliderSfx")?.addEventListener("input", (e) => {
    const val = Number(e.target.value) / 100;
    soundManager.setVolume("sfx", val);
    const valEl = document.getElementById("valSfx");
    if (valEl) valEl.textContent = `${e.target.value}%`;
  });

  // Gamepad Rumble Intensity Selector
  for (const [id, intensity] of [
    ["rumbleHigh", "high"],
    ["rumbleSoft", "soft"],
    ["rumbleOff", "off"],
  ]) {
    document.getElementById(id)?.addEventListener("click", () => {
      gamepadManager.setRumbleIntensity(intensity);
      document.querySelectorAll("#rumbleHigh, #rumbleSoft, #rumbleOff").forEach((b) => b.classList.remove("active"));
      document.getElementById(id)?.classList.add("active");
      if (intensity !== "off") gamepadManager.pulseHaptic(150, 0.5, 0.3);
    });
  }

  // Ship Hangar Modal
  const shipModal = document.getElementById("shipModal");
  document.getElementById("shipBtn")?.addEventListener("click", () => {
    userInteracted();
    shipModal?.classList.add("visible");
  });
  document.getElementById("closeShipModal")?.addEventListener("click", () => {
    shipModal?.classList.remove("visible");
  });

  // Logbook Modal
  const logModal = document.getElementById("logbookModal");
  document.getElementById("logbookBtn")?.addEventListener("click", () => {
    userInteracted();
    updateCodexModal();
    logModal?.classList.add("visible");
  });
  document.getElementById("closeLogbookModal")?.addEventListener("click", () => {
    logModal?.classList.remove("visible");
  });

  document.querySelectorAll(".theme-grid:not(#warpThemeGrid) .theme-card").forEach((card) => {
    card.addEventListener("click", () => {
      const themeKey = card.getAttribute("data-theme");
      if (themeKey && SHIP_THEMES[themeKey]) {
        currentThemeKey = themeKey;
        setShipTheme(ship, themeKey);
        document
          .querySelectorAll(".theme-grid:not(#warpThemeGrid) .theme-card")
          .forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
      }
    });
  });

  // Exhaust Theme Selector
  document.querySelectorAll("#exhaustThemeGrid .theme-card").forEach((card) => {
    card.addEventListener("click", () => {
      const exhaustKey = card.getAttribute("data-exhaust");
      if (exhaustKey) {
        effectsManager.setExhaustType(exhaustKey);
        document.querySelectorAll("#exhaustThemeGrid .theme-card").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
      }
    });
  });

  // Hyperspace Warp Palette Selector
  document.querySelectorAll("#warpThemeGrid .theme-card").forEach((card) => {
    card.addEventListener("click", () => {
      const warpKey = card.getAttribute("data-warp");
      if (warpKey) {
        effectsManager.setWarpTheme(warpKey);
        document.querySelectorAll("#warpThemeGrid .theme-card").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
      }
    });
  });

  // Custom Audio File Import (Drag & Drop + File Input)
  const audioZone = document.getElementById("customAudioZone");
  const audioInput = document.getElementById("customAudioInput");
  const loadedTrackName = document.getElementById("loadedTrackName");

  async function handleAudioFile(file) {
    if (!file) return;
    try {
      userInteracted();
      if (loadedTrackName) loadedTrackName.textContent = "Decoding audio...";
      const trackName = await soundManager.loadCustomAudio(file);
      if (loadedTrackName) loadedTrackName.textContent = `▶ Loaded: ${trackName}`;
      const radioLabel = document.getElementById("radioLabel");
      if (radioLabel) radioLabel.textContent = "Custom Space Deck";
    } catch {
      if (loadedTrackName) loadedTrackName.textContent = "Error decoding audio file.";
    }
  }

  audioInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleAudioFile(file);
  });

  if (audioZone) {
    audioZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      audioZone.classList.add("dragover");
    });
    audioZone.addEventListener("dragleave", () => {
      audioZone.classList.remove("dragover");
    });
    audioZone.addEventListener("drop", (e) => {
      e.preventDefault();
      audioZone.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file) handleAudioFile(file);
    });
  }

  // Photo Mode Controls
  document.getElementById("photoFilterBtn")?.addEventListener("click", () => {
    const filter = photoManager.cycleFilter();
    const nameEl = document.getElementById("photoFilterName");
    if (nameEl) nameEl.textContent = filter.name;
  });
  document.getElementById("capturePhotoBtn")?.addEventListener("click", () => {
    photoManager.takeSnapshot();
  });

  window.addEventListener("pointerdown", (e) => {
    userInteracted();
    photoManager.handlePointerDown(e.clientX, e.clientY);
  });
  window.addEventListener("pointermove", (e) => {
    photoManager.handlePointerMove(e.clientX, e.clientY);
  });
  window.addEventListener("pointerup", () => {
    photoManager.handlePointerUp();
  });
  window.addEventListener(
    "wheel",
    (e) => {
      photoManager.handleWheel(e.deltaY);
    },
    { passive: true }
  );

  // Global Key Triggers (T, U, R, V, L, M, C, Z, P, H, E)
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "KeyT") cycleRadio();
    if (e.code === "KeyU") toggleZenMode();
    if (e.code === "KeyR") toggleRibbon();
    if (e.code === "KeyV") toggleCrt();
    if (e.code === "KeyM") toggleMixerModal();
    if (e.code === "KeyL") {
      userInteracted();
      updateCodexModal();
      logModal?.classList.toggle("visible");
    }
    if (e.code === "KeyC") cycleCamera();
    if (e.code === "KeyZ") toggleAutopilot();
    if (e.code === "KeyP") togglePhotoMode();
    if (e.code === "KeyH") {
      userInteracted();
      shipModal?.classList.toggle("visible");
    }
    if (e.code === "KeyE") {
      userInteracted();
      soundManager.playShieldActivate();
    }
  });

  window.addEventListener("resize", () => {
    try {
      resizeScene(renderer, camera, window.innerWidth, window.innerHeight);
    } catch (err) {
      console.error("Resize failed:", err.message);
    }
  });

  const initialBiome = getBiomeForZ(0);
  showSectorBanner(initialBiome);
  codex = recordSectorDiscovery(codex, initialBiome.biome.id);
  setTimeout(hideIntro, 6500);

  // 9. Main Animation Loop
  const clock = new THREE.Clock();
  let stopped = false;

  function frame() {
    if (stopped) return;
    requestAnimationFrame(frame);
    try {
      const delta = Math.min(clock.getDelta(), MAX_DELTA);

      if (!photoManager.active) {
        const polledInput = gamepadManager.pollInput(inputRef.current);

        const effectiveInput = {
          ...polledInput,
          autopilot: isAutopilot,
        };
        state = updateFlightState(state, effectiveInput, delta, DEFAULT_FLIGHT_CONFIG);

        // Biome tracking & Sector Transitions
        const biomeData = getBiomeForZ(state.shipZ);
        if (biomeData.sectorIndex !== currentSectorIndex) {
          currentSectorIndex = biomeData.sectorIndex;
          showSectorBanner(biomeData);
          soundManager.playChime(1.25);
          codex = recordSectorDiscovery(codex, biomeData.biome.id);
        }

        // Atmosphere color transitions
        updateAtmosphere(scene, hemiLight, biomeData.biome, delta, state.elapsed);

        // Ship Transform & Chunk Streaming (with breathing nebulae)
        applyShipTransform(ship, state.position, state.rotation);
        chunkRenderer.update(state.shipZ, state.elapsed);

        // Resonance Ring Passes & Hyperspace Combos
        chunkRenderer.checkRingCollisions(state.position, () => {
          ringScore++;
          ringStreak++;
          codex.ringsCollected++;
          if (ringStreak > codex.maxStreak) codex.maxStreak = ringStreak;
          soundManager.playChime(1.2 + (ringStreak % 5) * 0.1);
          gamepadManager.pulseHaptic(100, 0.3, 0.1);

          // 3 Rings in a row = Hyperspace Jump
          if (ringStreak % 3 === 0) {
            effectsManager.triggerHyperspaceJump();
            showHyperspaceBanner();
            soundManager.playChime(2.0);
            gamepadManager.pulseHaptic(350, 0.8, 0.6);
            codex.hyperspaceJumps++;
          }
        });

        // Stargate Warp Gate Passes
        chunkRenderer.checkStargateCollisions(state.position, () => {
          effectsManager.triggerHyperspaceJump();
          showHyperspaceBanner();
          soundManager.playChime(1.8);
          gamepadManager.pulseHaptic(400, 0.9, 0.7);
          codex.stargatesPassed++;
          codex = recordAnomalyDiscovery(codex, "stargate");
        });

        // Friendly UFO First Contact Encounters
        chunkRenderer.checkUfoEncounters(state.position, () => {
          soundManager.playChime(1.6);
          gamepadManager.pulseHaptic(180, 0.4, 0.2);
          codex = recordAnomalyDiscovery(codex, "ufo-sighting");
        });

        // Ancient Space Beacon Harmonic Encounters
        chunkRenderer.checkBeaconEncounters(state.position, () => {
          soundManager.playChime(1.4);
          gamepadManager.pulseHaptic(160, 0.3, 0.2);
          codex = recordAnomalyDiscovery(codex, "space-beacon");
        });

        // Pulsar Relativistic Jet Resonance Encounters
        chunkRenderer.checkPulsarEncounters(state.position, () => {
          soundManager.playChime(0.85);
          gamepadManager.pulseHaptic(260, 0.5, 0.3);
          codex = recordAnomalyDiscovery(codex, "pulsar");
        });

        // Gravitational Singularity Event Horizon Encounters
        chunkRenderer.checkSingularityEncounters(state.position, () => {
          soundManager.playChime(0.7);
          gamepadManager.pulseHaptic(300, 0.7, 0.4);
          codex = recordAnomalyDiscovery(codex, "singularity");
        });

        // Asteroid Hazard Field Deflections & Impacts
        chunkRenderer.checkAsteroidCollisions(
          state.position,
          state.shieldActive,
          () => {
            // Deflected by active Energy Shield
            effectsManager.triggerShieldHit();
            soundManager.playShieldDeflect();
            gamepadManager.pulseHaptic(180, 0.5, 0.2);
            codex.asteroidsDeflected = (codex.asteroidsDeflected || 0) + 1;
            state.driftScore = (state.driftScore || 0) + Math.round(250 * (state.comboMultiplier || 1));
          },
          () => {
            // Impact without shield
            soundManager.playImpact();
            gamepadManager.pulseHaptic(350, 0.8, 0.5);
            // Reset combo on collision
            state.comboMultiplier = 1.0;
            state.consecutiveDriftTime = 0;
          }
        );

        // Zen Meditation Mode visual timer & breathing rhythm
        if (isZenMode) {
          zenTimerSeconds += delta;
          const mins = Math.floor(zenTimerSeconds / 60)
            .toString()
            .padStart(2, "0");
          const secs = Math.floor(zenTimerSeconds % 60)
            .toString()
            .padStart(2, "0");
          const timerEl = document.getElementById("zenTimer");
          if (timerEl) timerEl.textContent = `${mins}:${secs}`;

          const pacerEl = document.getElementById("zenPacerText");
          if (pacerEl) {
            const cycleTime = state.elapsed % 8.0;
            if (cycleTime < 3.2) pacerEl.textContent = "INHALE";
            else if (cycleTime < 4.0) pacerEl.textContent = "HOLD";
            else if (cycleTime < 7.2) pacerEl.textContent = "EXHALE";
            else pacerEl.textContent = "REST";
          }
        }

        // Periodic distance & high score save to localStorage
        if (state.shipZ - lastSaveZ >= 100) {
          codex.totalDistance += Math.round(state.shipZ - lastSaveZ);
          lastSaveZ = state.shipZ;
          if (state.driftScore > (codex.highScore || 0)) {
            codex.highScore = state.driftScore;
          }
          if ((state.comboMultiplier || 1.0) > (codex.maxCombo || 1.0)) {
            codex.maxCombo = state.comboMultiplier;
          }
          saveCodex(codex);
        }

        // Smooth Camera Update
        cameraManager.update(state, effectiveInput, delta);

        // VFX Updates
        const activeTheme = SHIP_THEMES[currentThemeKey] || SHIP_THEMES.arctic;
        effectsManager.update(ship, state, effectiveInput.boost, activeTheme.glowColor, delta);

        // Generative Music & Sound update
        soundManager.update(state.speed, effectiveInput.boost, delta, biomeData.biome.id);

        updateHud(state, biomeData);
      }

      renderer.render(scene, camera);
    } catch (err) {
      stopped = true;
      const msg = err instanceof GameError ? err.message : "An unexpected error occurred.";
      showFatalError("Drift crashed: " + msg + " (check the console for details)");
      console.error(err);
    }
  }

  requestAnimationFrame(frame);

  return function teardown() {
    stopped = true;
    for (const unbind of unbindHooks) unbind();
    if (state.shipZ > lastSaveZ) {
      codex.totalDistance += Math.round(state.shipZ - lastSaveZ);
      saveCodex(codex);
    }
    chunkRenderer.clear();
    effectsManager.dispose();
    soundManager.dispose();
    renderer.dispose();
  };
}
