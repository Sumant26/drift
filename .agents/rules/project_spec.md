# 🤖 Project Rules & Standards: Drift (Cozy Endless Space Flight)

These rules govern all development, architectural choices, testing, and documentation across this repository.

## 1. Architecture & Clean Code Rules
- Follow the modular structure defined in [spec.md](./spec.md).
- Keep domain logic (kinematics, path generation, biomes, score reducers) strictly decoupled in `src/core/` from Three.js rendering and DOM manipulation.
- Memory safety: Ensure proper recursive disposal of Three.js textures, geometries, and materials (`dispose()`) on chunk recycling or effect teardown.

## 2. State & Input Management Rules
- Maintain pure state transitions in `src/core/gameState.js`.
- Keep multi-input abstractions (Keyboard, Touch, Gamepad) unified in `src/input/inputManager.js`.
- Never mutate game state asynchronously outside the standard physics tick update loop.

## 3. Testing Standard (Vitest)
- All core math, path splines, chunk sliding windows, biomes, codex storage, and state reducers must have unit test coverage in `tests/`.
- All new features or bug fixes must include unit tests.
- Ensure all tests run cleanly with `npm test`.

## 4. Visual & Audio Design Tenets
- Maintain 60 FPS performance by recycling chunk pools and minimizing heap allocations per frame.
- Zero external binary assets: Use procedural Three.js geometries, canvas textures, and native Web Audio API oscillators.

## 5. Living Documentation Protocol
- **With every feature added**:
  1. Update `README.md` with new capabilities, controls, and technical descriptions.
  2. Update `spec.md` if architectural or physics formulas change.
  3. Add/update corresponding test files in `tests/`.
  4. Verify all tests pass before considering the feature complete.
