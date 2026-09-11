# 🤖 Project Rules & Standards: Cosmos Warp Explorer

These rules govern all development, architectural choices, testing, and documentation across this repository.

## 1. Architecture & Clean Code Rules
- Follow the modular structure defined in [SPEC.md](file:///c:/Users/ADMIN/Downloads/Work/Projects/Javascript%20projects/universe-explorer-3d/SPEC.md).
- Keep domain logic (physics, relativity, habitability calculations) strictly decoupled from Three.js rendering and DOM manipulation.
- Memory safety: Ensure proper disposal of Three.js textures, geometries, and materials (`dispose()`) when objects change.

## 2. State Management Rules
- Use the central reactive store in `src/state/Store.js`.
- Never mutate state directly. All changes must go through typed actions (`src/state/StateActions.js`).
- Telemetry and flight states must broadcast updates only to subscribed listeners.

## 3. Testing Standard (Vitest)
- All physics calculations (Lorentz factor, time dilation, travel times, orbital mechanics, habitability score) must have 100% test coverage.
- All new features or bug fixes must include unit tests in `tests/`.
- Ensure tests run cleanly with `npm test`.

## 4. Error Handling & Fallbacks
- All texture and asset loaders must implement procedural canvas fallbacks in case network/asset loading fails.
- Guard against mathematical singularities (e.g. division by zero in relativistic $\gamma$ at $v \to c$).
- Handle WebGL context loss gracefully.

## 5. Living Documentation Protocol
- **With every feature added**:
  1. Update `README.md` with new capabilities, controls, and technical descriptions.
  2. Add/update corresponding test files in `tests/`.
  3. Verify all tests pass before considering the feature complete.
