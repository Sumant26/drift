# 🛰️ Project Drift — Comprehensive Technical Specification & Architectural Blueprint

> **Version**: 2.0.0  
> **Status**: Living Specification & Development Blueprint  
> **Core Architecture**: Modular Vanilla JavaScript (ES2022) + Three.js + Web Audio API + Vite Standalone Single-File  

---

## 1. Executive Summary & Design Tenets

### 1.1 Project Vision
**Drift** is an infinite, cozy, procedural space-flight experience inspired by *Slow Roads* and *No Man's Sky*, engineered entirely in browser-native technologies. Pilots cruise seamlessly through continuous, dynamically generated celestial sectors featuring luminous crystalline asteroid belts, breathing nebulae, relativistic singularities, ancient megastructure stargates, space fauna, and friendly extraterrestrial encounters.

### 1.2 Core Design Tenets
1. **Tranquil Immersion Over Punishment**: No instant-fail collisions, game-over screens, or frustrating timers. Obstacles like asteroids bounce off an active Deflector Shield or reset drift combo meters without breaking flight momentum.
2. **Kinetic & Fluid Flight Mechanics**: Balanced rotational inertia, smooth pitch/bank damping, and curvilinear path offsets create an intuitive, satisfying cruising feel.
3. **Pure Zero-Asset Portability**: The entire experience runs with procedural shaders, canvas-generated particle textures, Web Audio synthesizer engines, and zero external binary downloads, enabling a 100% self-contained single-file bundle under 600 kB.
4. **Strict Architectural Separation**: Pure, framework-free logic core decoupled from Three.js rendering and DOM overlays, ensuring complete unit testability and deterministic output.

---

## 2. System Architecture & Tech Stack

```
                               ┌────────────────────────────────────────┐
                               │             Main Entry Point           │
                               │             (src/main.js)              │
                               └───────┬────────────────┬───────┬───────┘
                                       │                │       │
             ┌─────────────────────────┴────┐           │       └─────────────────────────┐
             │                              │           │                                 │
             ▼                              ▼           ▼                                 ▼
   ┌───────────────────┐          ┌───────────────────┐ │                       ┌───────────────────┐
   │    Input Layer    │          │     Core Logic    │ │                       │    Audio Layer    │
   │  - Keyboard       │          │  - GameState      │ │                       │  - SoundManager   │
   │  - Touchpad       │          │  - Biomes Engine  │ │                       │  - Synthesizer    │
   │  - Gamepad API    │          │  - Path Curve     │ │                       │  - FFT Analyser   │
   │  - Haptics        │          │  - ChunkManager   │ │                       │  - Custom Audio   │
   └─────────┬─────────┘          │  - ChunkGenerator │ │                       └───────────────────┘
             │                    │  - Codex Store    │ │
             │                    └─────────┬─────────┘ │
             │                              │           │
             ▼                              ▼           ▼
   ┌────────────────────────────────────────────────────────┐
   │                     Render Layer                       │
   │  - SceneBuilder (WebGL, Lighting, Sky, Fog)            │
   │  - ShipBuilder (Vessel Geometry, Themes, Thrusters)    │
   │  - ChunkRenderer (Celestial Entities & GPU Disposal)   │
   │  - EffectsBuilder (Volumetric Warp, Ribbons, Particles)│
   │  - PhotoModeManager (Orbit Cam, Matrix Filters)        │
   │  - Textures (Procedural Canvas Textures)               │
   └────────────────────────────────────────────────────────┘
```

### 2.1 Technology Stack
- **Graphics & Rendering**: Three.js (r128+), WebGL 2.0, Canvas 2D overlays.
- **Audio Synthesis**: Native Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `AnalyserNode`, `AudioBufferSourceNode`).
- **Input & Hardware**: Pointer Events, Keyboard Event Listener, Gamepad API with Dual-Rumble Haptics.
- **Build System & Tooling**: Vite 5, `vite-plugin-singlefile` (producing single standalone HTML output), Vitest (TDD unit test runner).
- **Typography & Styling**: Google Fonts (`Outfit`, `Space Grotesk`, `Share Tech Mono`), Vanilla CSS Glassmorphism.

---

## 3. Detailed Subsystem Specifications

### 3.1 Flight Kinematics & Physics Engine (`src/core/gameState.js`)
- **Coordinate Space**: Right-handed Three.js coordinate system where $+Z$ is the forward flight direction. To match camera perspective, screen Left corresponds to $+X$ and screen Right corresponds to $-X$.
- **Curvilinear Tunnel Centering**: Continuous path centerline $(X(z), Y(z))$ generated using low-frequency harmonic trigonometric functions (`src/core/path.js`):
  $$X(z) = \sin(z \cdot 0.003) \cdot 38 + \sin(z \cdot 0.007) \cdot 18$$
  $$Y(z) = \cos(z \cdot 0.0025) \cdot 22 + \sin(z \cdot 0.005) \cdot 12$$
- **Smoothing Rates & Inertia**:
  - `offsetSmoothRate: 0.025` — Smooth horizontal/vertical gliding without jitter.
  - `pitchSmoothRate: 0.045` — Dynamic ship nose elevation and dive response.
  - `bankSmoothRate: 0.008` — Gentle aerospace roll and aerodynamic banking.
- **Speed States**:
  - Base Cruise: $30\text{ u/s}$ (Boost: $65\text{ u/s}$, Drift brake: $20\text{ u/s}$, Autopilot Cruise: $38\text{ u/s}$).
- **Energy Shield Mechanic**:
  - Deflector Shield capacity: $100\%$, drains at $40\%/\text{s}$ when active (<kbd>E</kbd> / Touch trigger), recharges at $18\%/\text{s}$ after $0.8\text{s}$ cooldown.
- **Drift Multiplier & Combo Scoring**:
  - Holding high-speed drifts or traversing resonance rings builds a score multiplier up to $5.0\times$. Colliding without shield resets the multiplier.

---

### 3.2 Procedural World & Chunk Generation (`src/core/`)
- **Sliding-Window Chunk Pipeline (`chunkManager.js`)**:
  - Maintains active chunks in a sliding window (2 chunks behind, 4 chunks ahead).
  - Automatically loads upcoming chunks and disposes of expired chunk meshes and GPU materials.
- **Deterministic Pseudo-Random PRNG (`math.js`)**:
  - Uses Mulberry32 algorithm seeded by `chunkIndex * 7919 + 13` ensuring exact reproducibility.
- **Dynamic Cosmic Biomes (`biomes.js`)**:
  - **Violet Opal Nebula**: Crystalline dust clouds and amethyst formations ($H = 0.78$).
  - **Solar Phoenix Corona**: High-energy solar flares and amber radiation fields ($H = 0.08$).
  - **Emerald Genesis Cradle**: Bioluminescent nebulae and organic crystal pillars ($H = 0.38$).
  - **Abyssal Rift & Singularity**: Deep gravitational distortions and event horizons ($H = 0.65$).
  - **Cobalt Frost Expanse**: Cryo-crystalline fields and glacial starlight ($H = 0.58$).
  - **Supernova Core**: Relativistic shockwaves and energized stardust ($H = 0.02$).

---

### 3.3 Celestial Entities & Megastructures (`src/render/chunkRenderer.js`)

| Entity | Geometry & Shader Architecture | Interactive Gameplay Mechanics |
| :--- | :--- | :--- |
| **Resonance Rings** | Dual concentric counter-rotating energy toroids, 4 orbiting diamond motes, holographic shimmer diaphragm | Collecting builds drift combo, increases streak counter, and triggers warp jumps on 3x streak. |
| **Ancient Stargates** | Giant 32m metallic frame with dual concentric photon rings and halo aura | Flying through triggers instantaneous Hyperspace Warp Jump and registers codex relic. |
| **Gravitational Singularity** | Black event horizon sphere, dual superheated plasma accretion disks with differential rotation | Screen-space gravitational lensing distortion, relativistic chime, and discovery entry. |
| **Cosmic Asteroid Pockets** | Bumpy low-poly dodecahedrons with cratered facets ($28\%$ spawn rate, 1–2 per field) | Weave to evade or deflect using Energy Shield (<kbd>E</kbd>) for bonus deflection score. |
| **Astral Space Mantas** | Bioluminescent cone & wing mesh with gentle sinusoidal flapping physics | Ambient celestial fauna encounter tracked in logbook. |
| **Friendly UFOs** | Brushed metallic saucer hull, glowing bubble dome cockpit, and orbiting photon lights | First contact encounter with harmonic resonant greeting. |
| **Pulsar / Neutron Star** | High-velocity spinning stellar core with opposing relativistic plasma jet beams | Deep space radiation beacon encountered on long flights. |

---

### 3.4 Procedural Web Audio Engine (`src/audio/soundManager.js`)
- **Synthesizer Subsystems**:
  - **Engine Thruster Synth**: Low-frequency sawtooth oscillator ($55\text{ Hz}$) with variable low-pass filter tracked to current flight speed.
  - **Ambient Drone & Pads**: Dual stereo oscillators passing through slow sinusoidal LFOs for deep cosmic tranquility.
  - **Resonance Chimes**: Dual sine waves with fast exponential decay tuned to pentatonic scale frequencies.
  - **Shield SFX**: Frequency-swept bandpass oscillator on activation, white-noise burst on asteroid deflection.
- **In-Flight Radio Stations**:
  1. *Cosmic Chill* (BPM: 70, Frequencies: $220\text{ Hz} - 440\text{ Hz}$)
  2. *Cyberwave Glide* (BPM: 110, Frequencies: $180\text{ Hz} - 660\text{ Hz}$)
  3. *Deep Space Ambient* (BPM: 50, Frequencies: $110\text{ Hz} - 330\text{ Hz}$)
  4. *Solar Resonance* (BPM: 90, Frequencies: $260\text{ Hz} - 580\text{ Hz}$)
- **Real-Time FFT Analyser**:
  - `AnalyserNode` connected to master bus; powers the compact neon visualizer in the top HUD.
- **Custom Music Importer**:
  - Drag-and-drop / file selector for `.mp3`, `.wav`, `.ogg` decoded via `AudioContext.decodeAudioData()`.

---

### 3.5 HUD, UI & Photo Mode Systems (`index.html`, `main.js`)
- **HUD Telemetry Cluster**:
  - Horizon Compass Strip: 360° heading display with distance-to-next-sector countdown.
  - Speedometer & Lifetime Distance Odometer.
  - Deflector Shield Energy Gauge (<kbd>E</kbd>).
  - Tactical Holographic Mini-Radar (showing ahead rings, gates, singularities, and asteroids).
  - Audio Spectrum Visualizer inside the capsule radio button.
- **Vessel Hangar & Customizer**:
  - Hull Coatings: *Arctic Starlight*, *Obsidian Void*, *Solar Phoenix*, *Emerald Genesis*.
  - Ion Exhaust Modes: *Ion Plasma* (Cyan), *Solar Flare* (Orange), *Void Stream* (Purple), *Emerald Photon* (Green).
  - Hyperspace Warp Colors: *Cyan*, *Magenta*, *Solar*, *Emerald*, *Amethyst*, *Rainbow*.
- **Zen Meditation Flight Mode (<kbd>U</kbd>)**:
  - Minimalist HUD hiding all gameplay telemetry, displaying an animated 8-second breathing pacer ring and meditation timer.
- **Photo Mode (<kbd>P</kbd>)**:
  - 360° orbit camera with scroll zoom, depth-of-field simulation, color matrix filters (*Natural*, *Vibrant*, *Mono*, *Cyberpunk*, *Solar*), and one-click PNG screenshot export.

---

## 4. "What Can We Do More?" — Roadmap & Expansion Blueprint

To take Project Drift to the next echelon of fidelity, gameplay depth, and visual wonder, the following major expansion modules are recommended:

### 🌟 Module A: Dynamic Cosmic Weather & Stellar Phenomenon
1. **Electromagnetic Ion Storms**:
   - Turbulent purple/magenta particulate lightning arcs leaping between floating asteroids.
   - Gentle electromagnetic turbulence buffeting the ship's wings, requiring active steering compensation.
2. **Solar Flare Coronal Mass Ejections (CMEs)**:
   - Near solar stars, massive undulating plasma prominences arc across space; flying through them grants an ultra-velocity solar boost while heating ship hull thermals.
3. **Cosmic Stardust Aurora Fields**:
   - Volumetric multi-spectral aurora curtains that dynamically illuminate the ship cockpit and cast real-time colored shadows.

---

### 🗺️ Module B: Interactive 3D Starchart & Galactic Waypoint Mapping
1. **Holographic 3D Star Map Overlay (<kbd>M</kbd> / <kbd>Tab</kbd>)**:
   - Seamless zoom-out from ship cockpit into a 3D rotating galactic node graph showing traversed sectors, ancient stargates, and undiscovered celestial anomalies.
2. **Constellation Discovery & Star Alignment**:
   - Gaze at distant star clusters to align mythical cosmic constellations (e.g., *The Astral Manta*, *The Orion Needle*) that unlock lore entries in the Codex.
3. **Sector Seed Sharing**:
   - Shareable seed URLs (e.g. `drift.html#seed=OMEGA-9X`) enabling friends to explore the exact same cosmic corridor and celestial landmarks.

---

### 🛠️ Module C: Ship Upgrades & Modular Customization
1. **Unlockable Spacecraft Chassis Archetypes**:
   - **Valkyrie Interceptor**: Agile delta-wing with razor-sharp banking.
   - **Voyager Deep-Space Explorer**: Twin-fuselage cruiser with extended shield capacity and panoramic cockpit glass.
   - **Eclipse Stealth Dart**: Sleek triangular solar-sail vessel with zero engine noise and chromatic shimmer.
2. **Wingtip Mining Laser Beam (<kbd>F</kbd> / Left Click)**:
   - Fire a tranquil continuous cyan laser beam at floating crystal asteroids to harvest celestial resonance minerals used to unlock custom paint jobs in the Hangar.
3. **Cockpit Interior Instruments**:
   - Interactive 3D cockpit controls with illuminated analog switches, interactive thruster throttles, and holographic star maps on the dashboard.

---

### 👥 Module D: Asynchronous Ghost Flights & Co-op Drift
1. **Ghost Ship Telemetry Sync**:
   - Lightweight WebRTC / WebSocket telemetry streaming that renders translucent, ethereal ghost ships of other pilots drifting through the cosmos in real-time.
2. **Resonance Ring Time-Trials**:
   - Optional community time-trial challenge sectors with leaderboard ghost replays showing optimal drift racing lines.
3. **Co-op Warp Convoys**:
   - Flying within $10\text{m}$ of another pilot locks warp engines together for synchronized tandem drifting with shared combo multipliers.

---

### 🥽 Module E: Immersive WebXR & Spatial Audio
1. **Native WebXR Support**:
   - One-click VR button for Meta Quest, Apple Vision Pro, and PCVR headsets with true 6DOF head tracking and full-scale 3D cosmic immersion.
2. **3D Binaural Spatial Audio**:
   - Integrating `PannerNode` positioning for every resonance ring, pulsar jet, and passing space manta, delivering positional audio when wearing headphones.
3. **Generative Adaptive Music Engine**:
   - Procedural synth melodies generated in real-time using algorithmic chord progressions that harmonize with the ship's current velocity, banking angle, and biome atmosphere.

---

## 5. Accessibility (a11y) & Sensory Comfort

- **Reduced Motion Support (`prefers-reduced-motion`)**:
  - Optional toggle to dampen camera banking angles, soften warp streak lines, and disable CRT scanlines for motion-sensitive players.
- **Colorblind-Safe HUD Themes**:
  - Selectable high-contrast HUD color matrices (Deuteranopia, Protanopia, Tritanopia) ensuring radar markers, rings, and telemetry gauges are distinct.
- **Flexible Rebinding & One-Handed Flight**:
  - Full keyboard key remapping and mouse/touchscreen single-finger flight mode.
- **ARIA & Screen Reader Semantics**:
  - Fully labeled HUD buttons, modal dialogues, and volume sliders with `aria-label`, `role="slider"`, and `aria-valuenow`.

---

## 6. Performance Budget & Memory Lifecycle

### 6.1 Rendering Budget Targets
| Metric | Desktop Target | Mobile / Low-Power Target |
| :--- | :--- | :--- |
| **Frame Rate** | Constant 60–144 FPS | Stable 60 FPS |
| **Frame Time** | $\le 16.6\text{ ms}$ | $\le 16.6\text{ ms}$ |
| **Draw Calls** | $< 120$ per frame | $< 80$ per frame |
| **Triangles** | $< 80,000$ per frame | $< 45,000$ per frame |
| **VRAM Footprint** | $< 120\text{ MB}$ | $< 70\text{ MB}$ |

### 6.2 GPU Resource Cleanup (Zero Memory Leak Invariant)
To support infinite uninterrupted flight sessions, all unloaded chunk groups must strictly execute recursive disposal:
```javascript
function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}
```

### 6.3 Dynamic Resolution Scaling (DRS)
- If average frame time exceeds $20\text{ms}$ over 180 consecutive frames, `renderer.setPixelRatio` dynamically steps down from $2.0 \to 1.0 \to 0.75$ to preserve smooth 60 FPS flight.

---

## 7. Web Audio Synthesis Signal Routing

```
┌─────────────────────────┐
│  Engine Sawtooth Synth  │───> [ Lowpass Filter (Speed-Tracked) ] ──┐
└─────────────────────────┘                                          │
┌─────────────────────────┐                                          │
│   Ambient Drone Pads    │───> [ Stereo Modulation LFO ] ───────────┼───> [ Master Volume Gain ]
└─────────────────────────┘                                          │            │
┌─────────────────────────┐                                          │            ▼
│  Resonance Chime Synth  │───> [ Exponential Decay Gain ] ──────────┤    [ AnalyserNode (FFT) ]
└─────────────────────────┘                                          │            │
┌─────────────────────────┐                                          │            ▼
│  Deflector Shield SFX   │───> [ Bandpass Filter / Noise ] ─────────┘   [ Speakers / Headphones ]
└─────────────────────────┘                                                       │
                                                                                  ▼
                                                                     [ Canvas Mini Equalizer ]
```

---

## 8. Progressive Web App (PWA) & Offline Distribution

- **Standalone Offline Capability**: Zero remote runtime dependencies; functions fully in offline / airplane mode.
- **PWA Manifest (`manifest.json`)**: Configured for standalone full-screen cosmic immersion on iOS, Android, macOS, and Windows.
- **Single-File Portability**: Compiled bundle (`drift.html`) can be emailed, transferred on USB, or opened from any local folder via double click.

---

## 9. Verification & Testing Matrix

| Subsystem | Test Suite (`tests/`) | Key Invariants Verified |
| :--- | :--- | :--- |
| **Math & Curves** | `math.test.js`, `path.test.js` | Clamping, smoothTowards, Mulberry32 PRNG seed reproducibility, continuous tangent derivatives. |
| **Game State** | `gameState.test.js` | Speed transitions, inertia smoothing, shield energy depletion & recharge rate, combo score multipliers. |
| **Chunk Generation** | `chunkGenerator.test.js`, `chunkManager.test.js` | Deterministic scenery output, sliding window load/unload queue, entity spawn bounds. |
| **Biomes & Codex** | `biomes.test.js`, `codex.test.js` | Biome transitions along Z axis, localStorage persistence, high score & anomaly registration. |
| **Input Hardware** | `inputManager.test.js` | Keyboard/touch state reducers, key mapping, input state immutability. |

---

## 10. Build & Deployment Architecture

- **Development Server**: `npm run dev` (Vite dev server with HMR on `http://localhost:5173/`).
- **Production Single-File Build**: `npm run build` (`vite-plugin-singlefile` bundles HTML, JavaScript, CSS, shaders, and inline assets into a standalone `dist/index.html` and synced to root `drift.html`).
- **Zero-Dependency Runtime**: No server or backend required; runs instantly via direct `file://` double-click or static web hosting (GitHub Pages, Vercel, Netlify).
