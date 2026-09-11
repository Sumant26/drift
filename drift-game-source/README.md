# Drift — a cozy endless space flight

A slowroads.io-inspired driving game, but set in space: you glide forever
along a gently winding corridor of glowing crystal formations, nebulae, and
distant planets. There's no fail state — it's meant to be a relaxing
background-flight game, not a challenge.

Built with [three.js](https://threejs.org/), [Vite](https://vitejs.dev/),
and [Vitest](https://vitest.dev/).

---

## Running it

```bash
npm install
npm run dev      # local dev server with hot reload, http://localhost:5173
npm run build    # produces dist/index.html — a single self-contained file
npm test         # runs the full test suite
```

`npm run build` uses `vite-plugin-singlefile` to inline all JS/CSS into one
`dist/index.html`, so the finished game can be opened directly (double-click,
no server needed) or shared as a single file.

---

## Architecture

The code is split so that **game logic is pure and framework-free**, and
**rendering is a thin, separately-testable layer** on top of it. Nothing in
`src/core` or `src/input` imports `three`; only `src/render` and `main.js` do.

```
src/
  core/               pure logic — no DOM, no THREE, no side effects
    math.js           clamp, lerp, smoothTowards, mulberry32 (seeded PRNG)
    path.js           pathX/pathY (flight corridor centerline), pathDerivative
    gameState.js      createInitialState, updateFlightState (the state machine)
    chunkGenerator.js generateChunkData — deterministic scenery data per chunk
    chunkManager.js   chunkIndexForZ, getChunksToLoad/Unload (pure windowing)

  input/
    inputManager.js   createInputState, reduceKeyEvent (pure reducer),
                       bindKeyboard/bindTouchButton (DOM side effects, isolated)

  render/             THREE.js-specific, consumes core/ data
    sceneBuilder.js   renderer/scene/camera/lighting/starfield setup
    shipBuilder.js    ship mesh construction + transform application
    chunkRenderer.js  turns chunkGenerator data into THREE groups; owns
                       the load/unload lifecycle using chunkManager
    textures.js       shared canvas-based glow texture generation

  main.js             composition root: wires state + input + rendering
                       together, owns the animation loop and error boundary

  utils/errors.js      GameError, ValidationError, RenderError, InputError

tests/                 one file per core/input module, mirroring src/
```

### Why this split

- **Testability**: `core/` and the pure parts of `input/` have no
  dependency on a browser, WebGL, or the DOM, so they run instantly under
  Vitest in Node. The render layer, which *does* need a WebGL context, stays
  thin — it maps pure data (plain objects/numbers) onto `THREE` objects and
  contains as little logic as possible.
- **Determinism**: world generation (`chunkGenerator.js`) is a pure function
  of a chunk index — same index in, same scenery out, every time. This is
  what "endless" relies on: the game only ever needs to remember *which*
  chunks are currently loaded, not any accumulated random state.

---

## State management

There is a single source of truth for flight state, updated through one pure
function:

```js
state = updateFlightState(state, input, delta, config)
```

- `state` — `{ shipZ, offsetX, offsetY, speed, rotation, position, elapsed }`
- `input` — `{ left, right, up, down, boost }` booleans
- Returns a **new** state object; the input `state` is never mutated.

This makes the flight physics independently testable (see
`tests/gameState.test.js`) without touching three.js at all, and makes it
easy to reason about: given the same state + input + delta, you always get
the same result.

Input itself follows the same pattern: `reduceKeyEvent(inputState, code,
isDown)` is a pure reducer. The only mutable piece of state in the whole app
is a single `{ current: inputState }` ref that DOM event listeners write to;
everything downstream reads from it once per frame.

Chunk *loading* state (which chunk indices currently have meshes in the
scene) lives in `ChunkRenderer`, but the *decisions* about what to load or
unload are pure functions (`getChunksToLoad`/`getChunksToUnload`) that the
renderer just calls and acts on — so the tricky windowing logic is tested
without needing a scene at all.

---

## Error handling

- **Custom error types** (`GameError` and subclasses `ValidationError`,
  `RenderError`, `InputError`) distinguish expected, handled failures from
  arbitrary bugs.
- **Input validation**: every pure function in `core/` validates its
  arguments (finite numbers, correct types, sane ranges like `min <= max` or
  `0 < rate < 1`) and throws a `ValidationError` with a descriptive message
  rather than silently producing `NaN`/`undefined` and failing later in a
  confusing place.
- **Rendering failures**: `buildScene` catches WebGL context creation
  failures and throws a `RenderError`; `main.js` catches that and shows a
  plain-language fallback message instead of a blank screen.
- **Input binding failures**: `bindKeyboard`/`bindTouchButton` throw
  `InputError` if their target/element is missing (e.g. a touch button ID
  that doesn't exist in the DOM) instead of failing silently and leaving a
  control permanently dead. `main.js` treats keyboard and each touch button
  as independently optional — if one fails to bind, the rest of the game
  still starts, and a warning is logged.
- **Runtime error boundary**: the animation loop in `main.js` wraps each
  frame's update/render in `try/catch`. An uncaught error stops the loop
  cleanly and shows an on-screen message rather than spamming the console
  every frame or leaving a frozen black screen.
- **Resize safety**: `resizeScene` rejects zero/negative dimensions rather
  than corrupting the camera's aspect ratio.

---

## Testing

```bash
npm test          # single run
npm run test:watch
```

78 tests across 6 files cover every function in `src/core` and
`src/input/inputManager.js`, including:

- Normal-case behavior
- Edge cases (zero delta, boundary values, empty sets, negative indices)
- Determinism (same seed/index → same output)
- Error handling (every validation branch has a corresponding test)
- Purity (functions don't mutate their inputs)

The `src/render/*` and `src/main.js` modules are integration-level code that
directly drives three.js/WebGL/DOM; they're kept intentionally thin (mostly
translating already-tested pure data into `THREE` calls) and are verified by
running the game rather than unit tests, since meaningfully unit-testing
WebGL rendering would require a full GPU/browser mock with limited payoff.

---

## Features

| Feature | Where it lives | Notes |
|---|---|---|
| Endless procedural flight corridor | `core/path.js` | Two offset sine waves per axis; deterministic function of distance traveled |
| Chunked world streaming | `core/chunkManager.js`, `render/chunkRenderer.js` | Loads a window of chunks ahead of the ship, unloads ones left behind; geometries/materials disposed on unload to avoid memory growth |
| Deterministic scenery generation | `core/chunkGenerator.js` | Seeded PRNG (`mulberry32`) keyed by chunk index — crystals, nebula sprite, occasional planet |
| Ship flight model | `core/gameState.js` | Smoothed (frame-rate independent) steering offsets, speed easing, natural pitch/bank from path curvature |
| Boost | `core/gameState.js`, Shift key / on-screen button | Eases speed toward a higher target rather than snapping |
| Chase camera | `main.js` | Lerps toward a position behind/above the ship, banks slightly with steering |
| Keyboard controls | `input/inputManager.js` | Arrow keys and WASD, both mapped to the same logical flags |
| Touch controls | `input/inputManager.js`, `index.html` | On-screen D-pad + boost button, shown automatically on coarse-pointer (touch) devices |
| Infinite starfield backdrop | `render/sceneBuilder.js` | Points attached as a child of the camera, so it never needs to be regenerated or streamed |
| Cozy visual styling | `index.html`, `render/*` | Vignette, soft glow sprites, additive nebula blending, gentle idle bob on the ship, ACES tone mapping |
| Fatal-error fallback UI | `main.js` | Friendly on-screen message if WebGL or an uncaught runtime error occurs |
| Responsive resize | `render/sceneBuilder.js` | Camera aspect + renderer size kept in sync with the window |

---

## Known trade-offs / possible next steps

- No audio yet (ambient pad / synth track would suit the mood).
- No visible "road" ribbon — the corridor is implied by scenery only.
- Render-layer code isn't unit tested (see Testing section for rationale);
  a future step could add a headless-GL harness for smoke-testing mesh
  counts per chunk.
- Palette shifts slowly with distance but isn't yet tied to distinct
  "regions" or biomes.
