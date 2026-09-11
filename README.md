# 🚀 Drift — Cozy Endless Space Flight

A serene, procedural flight experience inspired by slowroads.io, set in the deep cosmic void. Glide endlessly through winding corridors of glowing crystalline formations, shifting nebulae, celestial anomalies, and ancient space relics. There are no timers, obstacles, or fail states — just fluid, meditative space cruising.

Play instantly with the single-file distribution ([`drift.html`](file:///drift.html)) or develop locally using the Vite + Three.js modular source code.

---

## 🌟 Key Features

- **Infinite Procedural Flight**: Endless 3D corridor generated deterministically using continuous trigonometric curves.
- **Dynamic Biomes**: Seamless transitions between distinct cosmic regions (Quartz Nebula, Amethyst Void, Emerald Drift, Solar Expanse, etc.) with custom lighting and celestial themes.
- **Procedural Audio Synthesizer**: Zero-asset, Web Audio API sound generator delivering dynamic engine hum, warp boost whoosh, and discovery chimes.
- **Discovery Codex**: In-game celestial encyclopedia tracking discovered biomes, crystal types, anomalies, and ancient relics with localStorage persistence.
- **Photo Mode & Camera Rig**: Cinematic free-cam with adjustable FOV, depth of field effects, color filters, and one-click high-res screenshot capture.
- **Multi-Input Controls**: Full support for Keyboard (WASD / Arrows), Touchscreen D-Pad, and Gamepad / Controller API with analog deadzones.
- **Zero-Dependency Single-File Bundle**: Complete standalone HTML build with inlined CSS, JS, and procedural textures.
- **Comprehensive Test Suite**: 89 unit tests with 100% coverage across core math, game state, biomes, codex, and input reducers.

---

## 📁 Repository & Folder Structure

```
Drift/
├── README.md                      # Top-level documentation & project guide
├── drift.html                     # Pre-built, self-contained single-file playable game
├── .agents/
│   └── rules/
│       └── project_spec.md        # Architecture specification and constraints
└── drift-game-source/             # Source code & development workspace
    ├── index.html                 # Main web entry point and HUD/Codex UI overlay
    ├── package.json               # Dependencies, scripts, and metadata
    ├── vite.config.js             # Vite configuration with single-file bundler plugin
    ├── .gitignore                 # Node, Vite, and build artifact exclusions
    ├── README.md                  # Source-level developer guide
    │
    ├── src/
    │   ├── main.js                # Game lifecycle, render loop, UI wiring, and error boundary
    │   │
    │   ├── audio/
    │   │   └── soundManager.js    # Procedural Web Audio API sound synthesis
    │   │
    │   ├── core/                  # Pure logic layer (Framework-free, zero THREE.js / DOM)
    │   │   ├── math.js            # Math helpers (clamp, lerp, smoothTowards, mulberry32 PRNG)
    │   │   ├── path.js            # 3D corridor curve and directional derivatives
    │   │   ├── gameState.js       # Flight state machine, inertia, bank & pitch calculations
    │   │   ├── biomes.js          # Biome palettes, ambient parameters, and generation weights
    │   │   ├── chunkGenerator.js  # Deterministic scenery placement (crystals, nebulae, relics)
    │   │   ├── chunkManager.js    # Pure sliding-window queue (chunks to load / unload)
    │   │   └── codex.js           # Discovery registry and persistent progression
    │   │
    │   ├── input/                 # Input parsing and hardware abstraction
    │   │   ├── inputManager.js    # Keyboard & touch state reducers and event listeners
    │   │   └── gamepadManager.js  # Gamepad API polling and axis mapping
    │   │
    │   ├── render/                # Three.js rendering layer
    │   │   ├── sceneBuilder.js    # WebGL renderer, scene lighting, starfield, and sky dome
    │   │   ├── shipBuilder.js     # Spacecraft mesh construction and engine glow trails
    │   │   ├── chunkRenderer.js   # Converts chunk data into 3D meshes & manages GPU disposal
    │   │   ├── cameraManager.js   # Chase camera, dynamic FOV easing, and drift damping
    │   │   ├── effectsBuilder.js  # Warp particles, space dust, and speed lines
    │   │   ├── photoMode.js       # Orbit camera controls, filters, and screenshot exporter
    │   │   └── textures.js        # Canvas-generated procedural glow & particle textures
    │   │
    │   └── utils/
    │       └── errors.js          # Custom error types (ValidationError, RenderError, etc.)
    │
    └── tests/                     # Unit test suites (Vitest)
        ├── biomes.test.js
        ├── chunkGenerator.test.js
        ├── chunkManager.test.js
        ├── codex.test.js
        ├── gameState.test.js
        ├── inputManager.test.js
        ├── math.test.js
        └── path.test.js
```

---

## ⚙️ Requirements & Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Browser**: Any modern browser with **WebGL 2.0** and **Web Audio API** support (Chrome, Firefox, Edge, Safari, Opera).

---

## 🚀 Quick Start

### 1. Play Directly (No Installation)
Open [`drift.html`](file:///drift.html) directly in any web browser. No local web server or internet connection is required.

### 2. Development Setup

```bash
# Navigate to the source folder
cd drift-game-source

# Install dependencies
npm install

# Start local dev server with Hot Module Replacement (HMR)
npm run dev
```
Visit `http://localhost:5173` in your browser.

### 3. Running Tests

```bash
cd drift-game-source

# Run full Vitest test suite once
npm test

# Run tests in watch mode
npm run test:watch
```

### 4. Build Standalone Distribution

```bash
cd drift-game-source
npm run build
```
This bundles all JavaScript, CSS, and Three.js dependencies into a single, self-contained file at `drift-game-source/dist/index.html`.

---

## 🎮 Controls

| Action | Keyboard | Touchscreen | Gamepad |
|---|---|---|---|
| **Steer Left / Right** | `A` / `D` or `←` / `→` | Left / Right D-pad | Left Stick / D-Pad |
| **Pitch Up / Down** | `W` / `S` or `↑` / `↓` | Up / Down D-pad | Left Stick / D-Pad |
| **Cruise Boost** | `Shift` or `Space` | "BOOST" Button | `A` / `R2` / `RT` |
| **Photo Mode** | `P` | Photo Button | `Y` / `Triangle` |
| **Toggle Codex** | `C` | Codex Button | `Back` / `Select` |
| **Mute Audio** | `M` | Speaker Icon | — |

---

## 🛠️ How to Add and Extend Features

The codebase is built with strict modular separation: **`src/core/` contains pure logic** with zero external dependencies, while **`src/render/` handles Three.js visualization**.

### 1. Adding a New Biome
Open [`src/core/biomes.js`](file:///drift-game-source/src/core/biomes.js) and add a new biome configuration:

```javascript
export const BIOMES = {
  // ...existing biomes
  SOLAR_FLARE: {
    id: 'solar_flare',
    name: 'Solar Flare Expanse',
    fogColor: 0xff4500,
    skyColor: 0x1a0500,
    crystalColors: [0xffaa00, 0xff3300, 0xffdd44],
    nebulaColor: 0xff6600,
    density: 1.2,
    rarityWeight: 0.25,
  }
};
```
Add corresponding test cases in [`tests/biomes.test.js`](file:///drift-game-source/tests/biomes.test.js).

### 2. Adding New Codex Discoveries
Open [`src/core/codex.js`](file:///drift-game-source/src/core/codex.js) to register new discovery items:

```javascript
export const DISCOVERY_ENTRIES = [
  // ...existing entries
  {
    id: 'relic_ancient_beacon',
    name: 'Ancient Beacon',
    category: 'Relics',
    description: 'A glowing monolith transmitting signals from an extinct civilization.',
    icon: '📡'
  }
];
```

### 3. Adding New Scenery Types
1. Update [`src/core/chunkGenerator.js`](file:///drift-game-source/src/core/chunkGenerator.js) to generate pure coordinate and property data for the new entity.
2. Update [`src/render/chunkRenderer.js`](file:///drift-game-source/src/render/chunkRenderer.js) to map that data into Three.js geometries and materials. Ensure all materials and geometries call `.dispose()` inside `unloadChunk()` to avoid WebGL memory leaks.

### 4. Adding Procedural Sound Effects
Open [`src/audio/soundManager.js`](file:///drift-game-source/src/audio/soundManager.js) to synthesize new Web Audio nodes (oscillators, biquad filters, gain envelopes):

```javascript
playDiscoveryChime() {
  if (this.muted || !this.ctx) return;
  const osc = this.ctx.createOscillator();
  const gain = this.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
  gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
  osc.connect(gain).connect(this.masterGain);
  osc.start();
  osc.stop(this.ctx.currentTime + 1.2);
}
```

---

## 🏛️ Architectural Principles

1. **Pure Core, Thin Render**:
   - `src/core/` and `src/input/` never import `three` or touch the DOM.
   - All flight physics, chunk windows, and math are 100% deterministic and testable in standard Node.js environments.
2. **Deterministic World Streaming**:
   - Chunks are computed purely from a chunk integer index using the `mulberry32` PRNG.
   - You can jump to any position in space and the scenery will generate identically every time.
3. **GPU Memory Lifecycle Management**:
   - As chunks scroll out of view behind the player, `ChunkRenderer` disposes all meshes, custom buffer geometries, and materials to ensure steady 60 FPS performance without memory creep.
4. **Resilient Error Boundaries**:
   - WebGL context loss and unexpected runtime faults are trapped by clean error boundaries in `main.js`, presenting informative recovery dialogs rather than freezing.

---

## 📜 License

Distributed under the ISC License. Free for educational and personal use.
