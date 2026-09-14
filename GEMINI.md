# 🛰️ GEMINI.md — AI Rules & Guidelines for Drift

## 1. Tech Stack & Architecture
- **Language**: Vanilla JavaScript (ES2022 Modules). No TypeScript unless explicitly requested.
- **Engine**: Three.js (WebGL 2.0) + Native Web Audio API + HTML5 Canvas.
- **Build / Packaging**: Vite + `vite-plugin-singlefile` (producing a self-contained zero-dependency HTML bundle).
- **Testing**: Vitest (`npm test`).
- **Formatting & Linting**: Prettier + ESLint (`eslint.config.js`).

## 2. Architecture & Modular Boundaries
- `src/core/`: Pure logic and deterministic calculations (math, path curves, chunk generation, biomes, game state). **0% DOM / 0% Three.js dependencies**.
- `src/input/`: Unified input listeners and haptics (Keyboard, Gamepad, Touch).
- `src/render/`: Three.js scene, procedural meshes, shader materials, particle effects, and photo mode.
- `src/audio/`: Web Audio procedural synth engines and sound effects.

## 3. Strict Development Rules
1. **Never break existing unit tests**: Run `npm test` after any core modification.
2. **Memory Safety**: Always clean up Three.js objects (call `.dispose()` on geometries, materials, and textures) when removing entities.
3. **No Heavy External Dependencies**: Keep the bundle self-contained and lightweight.
4. **Preserve Documentation**: Update `README.md` and `spec.md` whenever adding new mechanics or inputs.
