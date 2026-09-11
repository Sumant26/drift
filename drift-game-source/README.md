# 🚀 Drift — Cozy Endless Space Flight (Source)

A serene, procedural flight experience inspired by slowroads.io, set in the deep cosmic void. Glide endlessly through winding corridors of glowing crystalline formations, shifting nebulae, celestial anomalies, and ancient space relics. There are no timers, obstacles, or fail states — just fluid, meditative space cruising.

Built with [Three.js](https://threejs.org/), [Vite](https://vitejs.dev/), and [Vitest](https://vitest.dev/).

---

## 🌟 Key Features

- **Infinite Procedural Flight**: Endless 3D corridor generated deterministically using continuous trigonometric curves (`src/core/path.js`).
- **Dynamic Biomes**: Seamless transitions between distinct cosmic regions with unique fog, crystal palettes, and sky illumination (`src/core/biomes.js`).
- **Procedural Audio Synthesizer**: Zero-asset, Web Audio API sound generator delivering dynamic engine hum, warp boost whoosh, and discovery chimes (`src/audio/soundManager.js`).
- **Discovery Codex**: In-game celestial encyclopedia tracking discovered biomes, crystal types, anomalies, and ancient relics with localStorage persistence (`src/core/codex.js`).
- **Photo Mode & Camera Rig**: Cinematic free-cam with adjustable FOV, depth of field effects, color filters, and one-click high-res screenshot capture (`src/render/photoMode.js`).
- **Multi-Input Controls**: Full support for Keyboard (WASD / Arrows), Touchscreen D-Pad, and Gamepad / Controller API with analog deadzones (`src/input/`).
- **Zero-Dependency Single-File Bundle**: Complete standalone HTML build with inlined CSS, JS, and procedural textures via `vite-plugin-singlefile`.
- **Comprehensive Test Suite**: 89 unit tests covering core math, game state, biomes, codex, and input reducers (`tests/`).

---

## 📁 Source Code Structure

```
drift-game-source/
├── index.html                 # Main web entry point and HUD/Codex UI overlay
├── package.json               # Dependencies, scripts, and metadata
├── vite.config.js             # Vite configuration with singlefile bundler plugin
├── .gitignore                 # Node, Vite, and build artifact exclusions
├── README.md                  # Developer documentation
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
- **Browser**: Any modern browser with **WebGL 2.0** and **Web Audio API** support.

---

## 🚀 Quick Start & Scripts

```bash
# Install dependencies
npm install

# Start local dev server with hot reload (http://localhost:5173)
npm run dev

# Run the 89-test unit test suite
npm test

# Run tests in watch mode during development
npm run test:watch

# Build single-file standalone distribution (dist/index.html)
npm run build
```

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

The codebase is built with strict separation: **`src/core/` contains pure logic** with zero external dependencies, while **`src/render/` handles Three.js visualization**.

### 1. Adding a New Biome
Open [`src/core/biomes.js`](file:///drift-game-source/src/core/biomes.js) and define the new biome:

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
Add unit tests in [`tests/biomes.test.js`](file:///drift-game-source/tests/biomes.test.js).

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

## 🏛️ Architecture & Testing Philosophy

- **Testability**: `core/` and pure parts of `input/` have no dependency on a browser, WebGL, or the DOM, running in <1s across 89 tests in Vitest.
- **Determinism**: World generation (`chunkGenerator.js`) is a pure function of chunk index and PRNG seed (`mulberry32`).
- **Memory Management**: Geometries and materials are explicitly disposed when chunks leave the player's horizon window.
- **Error Boundaries**: WebGL context creation and runtime loop failures are trapped with user-friendly fallback messaging.

---

## 📜 License

Distributed under the ISC License.
