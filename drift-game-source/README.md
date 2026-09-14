# 🚀 Drift — Cozy Endless Space Flight

A serene, procedural flight experience inspired by _slowroads.io_ and _No Man's Sky_, set in the deep cosmic void. Glide endlessly through winding corridors of glowing crystalline formations, shifting nebulae, celestial anomalies, ancient megastructures, and friendly extraterrestrial encounters. There are no timers, game-over screens, or fail states — just fluid, meditative space cruising.

Play instantly with the single-file distribution ([`drift.html`](./drift.html)) or develop locally using the Vite + Three.js modular source code in [`drift-game-source/`](./drift-game-source/).

For the full architectural design, formulas, and expansion roadmap, see [**`spec.md`**](./spec.md).

---

## 🏆 Engineering Standards & Quality Checklist

|   #    | Subsystem / Standard          | Location                                                                                                     |                 Status                 |
| :----: | :---------------------------- | :----------------------------------------------------------------------------------------------------------- | :------------------------------------: |
| **1**  | **AI Rules & Constraints**    | [`.agents/rules/project_spec.md`](./.agents/rules/project_spec.md)                                           |         ✅ **Live & Enforced**         |
| **2**  | **Technical Specification**   | [**`spec.md`**](./spec.md)                                                                                   |      ✅ **Complete (312 Lines)**       |
| **3**  | **Automated Unit Tests**      | [`drift-game-source/tests/`](./drift-game-source/tests/)                                                     |      ✅ **93 / 93 Tests Passing**      |
| **4**  | **Decoupled Architecture**    | `drift-game-source/src/core/`                                                                                |       ✅ **Pure Math / 0% DOM**        |
| **5**  | **Memory Cleanup Invariants** | `src/render/chunkRenderer.js`                                                                                |     ✅ **Recursive GPU Disposal**      |
| **6**  | **Single Root `.gitignore`**  | [**`.gitignore`**](./.gitignore)                                                                             |      ✅ **Consolidated & Clean**       |
| **7**  | **Developer Documentation**   | [**`README.md`**](./README.md)                                                                               | ✅ **Up-to-date with Controls Matrix** |
| **8**  | **ESLint & Prettier**         | [`eslint.config.js`](./drift-game-source/eslint.config.js), [`.prettierrc`](./drift-game-source/.prettierrc) |      ✅ **0 Errors, 0 Warnings**       |
| **9**  | **Git Pre-Commit Hooks**      | [`.husky/pre-commit`](./.husky/pre-commit) + `lint-staged`                                                   |       ✅ **Active & Automated**        |
| **10** | **GitHub Actions CI/CD**      | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)                                                     |  ✅ **Automated Test & Pages Deploy**  |

### 🛠️ Configured Project Standards:

- **📄 [`.editorconfig`](./.editorconfig)**: Universal file ensuring all editors (VS Code, WebStorm, Sublime, Cursor) use UTF-8, 2 spaces, LF line endings, and trim trailing whitespace automatically.
- **⚖️ [`LICENSE`](./LICENSE)**: Explicit **MIT License** file for open-source clarity.
- **📊 Test Coverage Reporter (`npm run test:coverage`)**: Visual code-coverage analysis powered by `@vitest/coverage-v8` reporting **92.84% statements / 100% functions** coverage across core logic engines.
- **🚀 Project Scaffolding Script ([`setup-js-web-project-rules.ps1`](./setup-js-web-project-rules.ps1))**: Reusable 1-click PowerShell script to replicate these standards into any new JavaScript or web project.

---

## 🌟 Key Features

- **Infinite Procedural Flight**: Continuous 3D space corridor generated deterministically using harmonic trigonometric curves (`src/core/path.js`).
- **Dynamic Cosmic Biomes**: Seamless transitions between distinct cosmic regions (Violet Opal Nebula, Solar Phoenix Corona, Emerald Genesis, Abyssal Rift, Cobalt Frost, and Supernova Core).
- **Holographic Resonance Rings**: Multi-layered celestial portals with counter-rotating energy rings, orbiting quantum motes, and luminous expanding shockwave collection VFX.
- **Energy Shield Deflector (<kbd>E</kbd>)**: Real-time energy shield bubble with hexagonal ripple collision VFX to deflect sparse asteroid hazards and earn bonus drift score.
- **Relativistic Black Holes & Singularities**: Screen-space accretion disk distortion, dual Doppler-shifted plasma rings, and gravitational lensing effects.
- **Volumetric Hyperspace Warp**: Dynamic warp gate corridor and high-velocity light streaks when passing stargates or hitting 3x ring streaks.
- **Procedural Synthesizer & Radio**: 4 in-flight synthesizer radio stations (_Cosmic Chill_, _Cyberwave_, _Deep Space Ambient_, _Solar Resonance_) with an interactive audio frequency visualizer.
- **Custom Music Importer**: Drag-and-drop or select your own `.mp3`, `.wav`, or `.ogg` audio files to cruise through the cosmos to your own soundtrack.
- **Tactical Holographic Mini-Radar**: Real-time cockpit radar displaying upcoming resonance rings, ancient stargates, black holes, and asteroid fields.
- **Vessel Hangar & Customizer (<kbd>H</kbd>)**: Select hull coatings (Arctic, Obsidian, Solar, Emerald), ion thruster exhausts (Ion, Solar Flare, Void Stream, Emerald Photon), and hyperspace warp palettes.
- **Zen Meditation Flight Mode (<kbd>U</kbd>)**: Minimalist HUD with an 8-second breathing pacer ring and tranquil meditation timer.
- **Traveler's Codex (<kbd>L</kbd>)**: In-game celestial encyclopedia tracking discovered biomes, stargates, UFO encounters, lifetime distance, max drift combos, and high scores.
- **Photo Mode Studio (<kbd>P</kbd>)**: 360° orbital camera with scroll zoom, depth-of-field, color matrix filters (Natural, Vibrant, Mono, Cyberpunk, Solar), and one-click PNG export.
- **Multi-Input & Gamepad Haptics**: Full support for Keyboard (WASD / Arrows), Mobile Touch D-pad, and Gamepad API with customizable dual-motor vibration intensity.
- **Zero-Dependency Single-File Bundle**: 100% standalone HTML build (`586 kB`) with inlined CSS, JS, shaders, and procedural textures via `vite-plugin-singlefile`.
- **Comprehensive Test Suite**: 93 Vitest unit tests covering math, kinematics, biomes, chunk sliding windows, codex persistence, and input reducers.

---

## 🎮 Controls

| Action                    | Keyboard                                                   | Mobile / Touchscreen | Gamepad                                          |
| ------------------------- | ---------------------------------------------------------- | -------------------- | ------------------------------------------------ |
| **Steer Left / Right**    | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Left / Right D-pad   | Left Stick / D-Pad                               |
| **Pitch Up / Down**       | <kbd>W</kbd> / <kbd>S</kbd> or <kbd>↑</kbd> / <kbd>↓</kbd> | Up / Down D-pad      | Left Stick / D-Pad                               |
| **Deflector Shield**      | <kbd>E</kbd>                                               | 🛡️ Shield Button     | <kbd>X</kbd> / <kbd>Square</kbd> / <kbd>LB</kbd> |
| **Cruise Boost**          | <kbd>Shift</kbd>                                           | BOOST Button         | <kbd>A</kbd> / <kbd>Cross</kbd> / <kbd>RT</kbd>  |
| **Space Drift / Brake**   | <kbd>Space</kbd>                                           | —                    | <kbd>B</kbd> / <kbd>Circle</kbd> / <kbd>LT</kbd> |
| **Cycle Radio Station**   | <kbd>T</kbd>                                               | 📻 Radio Button      | <kbd>D-Pad Right</kbd>                           |
| **Zen Meditation Mode**   | <kbd>U</kbd>                                               | 🧘 Zen Button        | —                                                |
| **Toggle Aurora Ribbon**  | <kbd>R</kbd>                                               | ✨ Ribbon Button     | —                                                |
| **Retro CRT Arcade Mode** | <kbd>V</kbd>                                               | 📺 CRT Button        | —                                                |
| **Cycle Camera Mode**     | <kbd>C</kbd>                                               | 🎥 Camera Button     | <kbd>R3</kbd> (Stick Click)                      |
| **Autopilot Cruise**      | <kbd>Z</kbd>                                               | 🚀 Cruise Button     | —                                                |
| **Vessel Hangar**         | <kbd>H</kbd>                                               | 🎨 Hangar Button     | —                                                |
| **Traveler Codex**        | <kbd>L</kbd>                                               | 📜 Codex Button      | <kbd>Back</kbd> / <kbd>Select</kbd>              |
| **Audio Frequency Mixer** | <kbd>M</kbd>                                               | 🎚️ Sound Button      | —                                                |
| **Photo Mode Studio**     | <kbd>P</kbd>                                               | 📷 Photo Button      | <kbd>Y</kbd> / <kbd>Triangle</kbd>               |

---

## 📁 Repository & Source Structure

```
Drift/
├── README.md                      # Top-level documentation & project guide
├── spec.md                        # Complete technical specification & expansion roadmap
├── drift.html                     # Standalone, zero-dependency playable game bundle
├── setup-js-web-project-rules.ps1 # Reusable project standards scaffolder
├── .editorconfig                  # Universal text editor standards
├── .gitignore                     # Centralized Git exclusions
├── LICENSE                        # MIT Open-Source License
├── .agents/
│   └── rules/
│       └── project_spec.md        # AI Assistant architectural guidelines
├── .husky/
│   └── pre-commit                 # Git pre-commit test & lint hook
├── .github/
│   └── workflows/
│       └── ci.yml                 # Cloud CI test runner & Pages deployment
└── drift-game-source/             # Modular source repository
    ├── index.html                 # Main web entry point and HUD/Modals UI overlay
    ├── package.json               # Dependencies, scripts, and metadata
    ├── vite.config.js             # Vite configuration with single-file bundler plugin
    ├── eslint.config.js           # ESLint 9+ flat configuration with domain boundaries
    ├── .prettierrc                # Prettier code formatting rules
    ├── .prettierignore            # Prettier ignore list
    ├── spec.md                    # Synchronized technical specification
    ├── README.md                  # Developer guide
    │
    ├── src/
    │   ├── main.js                # Game lifecycle, render loop, UI wiring, and error boundary
    │   │
    │   ├── audio/
    │   │   └── soundManager.js    # Web Audio synthesizer, radio stations, FFT analyser, and custom audio
    │   │
    │   ├── core/                  # Pure logic layer (Framework-free, zero THREE.js / DOM)
    │   │   ├── math.js            # Math helpers (clamp, lerp, smoothTowards, mulberry32 PRNG)
    │   │   ├── path.js            # 3D corridor curve and continuous derivatives
    │   │   ├── gameState.js       # Flight physics, smoothing rates, shields, drift combos
    │   │   ├── biomes.js          # Dynamic biomes, palettes, and ambient fog/sky parameters
    │   │   ├── chunkGenerator.js  # Deterministic entity placement (rings, stargates, anomalies)
    │   │   ├── chunkManager.js    # Pure sliding-window chunk queue (load/unload)
    │   │   └── codex.js           # Discovery registry and persistent progression
    │   │
    │   ├── input/                 # Input parsing and hardware abstraction
    │   │   ├── inputManager.js    # Keyboard & touch state reducers
    │   │   └── gamepadManager.js  # Gamepad API polling, deadzones, and dual-motor haptics
    │   │
    │   ├── render/                # Three.js WebGL rendering layer
    │   │   ├── sceneBuilder.js    # WebGL renderer, scene lighting, starfield, sky dome
    │   │   ├── shipBuilder.js     # Vessel mesh construction and hull theme coats
    │   │   ├── chunkRenderer.js   # Converts chunk data into 3D meshes & manages GPU disposal
    │   │   ├── cameraManager.js   # Chase camera, dynamic FOV easing, and banking damping
    │   │   ├── effectsBuilder.js  # Volumetric warp tunnel, exhaust plasma, shield bubble, ribbons
    │   │   ├── photoMode.js       # Orbit camera controls, color filters, screenshot exporter
    │   │   └── textures.js        # Canvas-generated procedural glow & particle textures
    │   │
    │   └── utils/
    │       └── errors.js          # Custom error types (ValidationError, RenderError, etc.)
    │
    └── tests/                     # 93 Unit test suites (Vitest)
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

## 🚀 Quick Start & Development

### 1. Play Directly (No Setup Needed)

Simply open [`drift.html`](./drift.html) in any web browser. No web server, dependencies, or internet connection required.

### 2. Development Workspace

```bash
# Navigate to source folder
cd drift-game-source

# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev

# Run all 93 unit tests
npm test

# Run tests with code-coverage report
npm run test:coverage

# Run ESLint check
npm run lint

# Auto-format all code with Prettier
npm run format

# Build production single-file bundle (dist/index.html)
npm run build
```

---

## 🏛️ Architecture & Testing Philosophy

- **Decoupled Architecture**: `src/core/` and pure parts of `src/input/` have zero dependencies on WebGL or the DOM, executing in under $1\text{s}$ across all 93 unit tests in Vitest.
- **Deterministic Procedural Generation**: World generation is a pure mathematical function of chunk index and Mulberry32 PRNG seed.
- **Zero VRAM Leak Invariant**: All geometries, textures, and materials are recursively disposed when chunks exit the sliding horizon window.
- **Automated Pre-Commit Protection**: Husky and `lint-staged` guarantee no failing tests or unformatted code can be committed.
- **Continuous Integration (CI/CD)**: GitHub Actions validates builds and tests on every push and deploys the live version to GitHub Pages.

---

## 📜 License

Distributed under the [MIT License](./LICENSE).
