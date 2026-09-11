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
  el.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;"
    + "background:#06040f;color:#d8dcff;font-family:sans-serif;padding:24px;text-align:center;z-index:999;";
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

  for (const [id, flag] of [["tp-up", "up"], ["tp-down", "down"], ["tp-left", "left"], ["tp-right", "right"], ["boostbtn", "boost"]]) {
    try {
      unbindHooks.push(bindTouchButton(document, id, flag, inputRef, { onFirstInput: userInteracted }));
    } catch (err) {
      console.warn(`Touch control "${id}" unavailable:`, err.message);
    }
  }

  // 7. UI Helpers & Banners
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

  function updateHud(st, biomeData) {
    const speedNum = document.getElementById("speedNum");
    const speedFill = document.getElementById("speedfill");
    const distNum = document.getElementById("distNum");
    const ringCountEl = document.getElementById("ringCount");
    const streakCountEl = document.getElementById("streakCount");
    const cockpitHud = document.getElementById("cockpitHud");
    const compassHeading = document.getElementById("compassHeading");
    const compassNext = document.getElementById("compassNext");

    if (speedNum) speedNum.textContent = Math.round(st.speed);
    if (speedFill) speedFill.style.width = Math.min(100, Math.round((st.speed / DEFAULT_FLIGHT_CONFIG.boostSpeed) * 100)) + "%";
    if (distNum) distNum.textContent = Math.round(st.shipZ) + " ly traveled";
    if (ringCountEl) ringCountEl.textContent = ringScore;
    if (streakCountEl) streakCountEl.textContent = ringStreak;

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
  }

  function updateCodexModal() {
    const lifetimeEl = document.getElementById("codexLifetime");
    const ringsEl = document.getElementById("codexRings");
    const gatesEl = document.getElementById("codexGates");
    const warpsEl = document.getElementById("codexWarps");
    const sectorList = document.getElementById("codexSectorList");

    const anomalyList = document.getElementById("codexAnomalyList");

    const totalZ = codex.totalDistance + Math.round(state.shipZ);
    if (lifetimeEl) lifetimeEl.textContent = totalZ;
    if (ringsEl) ringsEl.textContent = codex.ringsCollected;
    if (gatesEl) gatesEl.textContent = codex.stargatesPassed;
    if (warpsEl) warpsEl.textContent = codex.hyperspaceJumps;

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
      label.textContent = mode === CAMERA_MODES.CHASE ? "Chase" : mode === CAMERA_MODES.COCKPIT ? "Cockpit" : "Cinematic";
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
  for (const [id, intensity] of [["rumbleHigh", "high"], ["rumbleSoft", "soft"], ["rumbleOff", "off"]]) {
    document.getElementById(id)?.addEventListener("click", () => {
      gamepadManager.setRumbleIntensity(intensity);
      document.querySelectorAll("#rumbleHigh, #rumbleSoft, #rumbleOff").forEach(b => b.classList.remove("active"));
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
        document.querySelectorAll(".theme-grid:not(#warpThemeGrid) .theme-card").forEach(c => c.classList.remove("active"));
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
        document.querySelectorAll("#warpThemeGrid .theme-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
      }
    });
  });

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
  window.addEventListener("wheel", (e) => {
    photoManager.handleWheel(e.deltaY);
  }, { passive: true });

  // Global Key Triggers (T, U, R, V, L, M, C, Z, P, H)
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

        // Zen Meditation Mode visual timer & breathing rhythm
        if (isZenMode) {
          zenTimerSeconds += delta;
          const mins = Math.floor(zenTimerSeconds / 60).toString().padStart(2, "0");
          const secs = Math.floor(zenTimerSeconds % 60).toString().padStart(2, "0");
          const timerEl = document.getElementById("zenTimer");
          if (timerEl) timerEl.textContent = `${mins}:${secs}`;

          const pacerEl = document.getElementById("zenPacerText");
          if (pacerEl) {
            const cycleTime = (state.elapsed % 8.0);
            if (cycleTime < 3.2) pacerEl.textContent = "INHALE";
            else if (cycleTime < 4.0) pacerEl.textContent = "HOLD";
            else if (cycleTime < 7.2) pacerEl.textContent = "EXHALE";
            else pacerEl.textContent = "REST";
          }
        }

        // Periodic distance save to localStorage
        if (state.shipZ - lastSaveZ >= 100) {
          codex.totalDistance += Math.round(state.shipZ - lastSaveZ);
          lastSaveZ = state.shipZ;
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
