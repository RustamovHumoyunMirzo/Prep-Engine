# TODO — Prep Engine

Project goal: a lightweight, simple, fast prototyping engine. Keep public APIs high-level, readable, and easy to use — the engine is for rapid prototyping, not a complex feature-complete game engine.

This file is the canonical roadmap and task list. When adding or changing features, update this file and the docs (`README.md`, `docs/`) before opening a PR.

---

## Prioritized Tasks

### High priority

- Add documentation
  - Goal: Getting started guide, API reference, and example pages.
  - Next steps: create a `docs/` folder, add `docs/getting-started.md` and `docs/api.md` covering `Engine`, `World`, `Renderer`, `Physics`, `Lighting`, `Audio`, and `Particles`. Update `README.md` with a short usage example.
  - Acceptance: README shows a working snippet; at least 3 examples have updated instructions.

- Enhance the lighting system (`engine/core/Lighting.js`)
  - Goal: better visual fidelity while keeping API simple and performant.
  - Next steps: add lightweight `AmbientLight` and `PointLight` primitives, implement distance attenuation/falloff, and expose a compact API such as `World.addLight({ position, color, intensity, radius })` or `new Light(...)`.
  - Acceptance: an example demonstrates visible improvement (new `examples/lighting.html` or updates to `examples/particle.html`) and no unnecessary API complexity.

- Test the physics engine (`physics/Core.js`)
  - Goal: deterministic, reliable stepping and collision behavior.
  - Next steps: add unit tests for stepping, collision, and simple constraints; add an integration example with deterministic output.
  - Acceptance: test suite covering core physics behaviors and an integration example that reproduces expected results with fixed dt.

- Add an audio module with world positioning
  - Goal: simple positional audio API integrated with `World`.
  - API proposal: `Audio.playSoundAt(src, position, { loop=false, volume=1, maxDistance=100 })`, `Audio.setListener(position)`, `Audio.attachToObject(sound, object)`.
  - Next steps: create `engine/core/Audio.js` (or `engine/audio/Audio.js`) using the Web Audio API with stereo panning + simple distance attenuation; add `examples/audio.html`.
  - Acceptance: an example plays positional audio that attenuates/pans as objects move.

### Medium priority

- API cleanup and consistency
  - Audit public APIs across `engine/*`, `renderer/*`, and `physics/*` to unify naming and option objects.

- Add more example templates
  - Provide small templates for common prototyping patterns (top-down shooter, particle demo, click-to-spawn).

### Low priority

- TypeScript definitions or incremental migration
- CI to run tests and build docs
- Performance profiling and targeted optimizations

---

## Contributing rules (short)

- Always update `TODO.md` when adding or planning features. This file is the project's canonical task/roadmap.
- Always update docs and resources (`README.md`, files under `docs/`, and affected `examples/`) when public APIs or user-visible behavior change.
- PR checklist (required before merge):
  - Link to a `TODO.md` entry or an issue describing the change.
  - Update `README.md` and `docs/` for user-facing changes.
  - Add or update tests for changed behavior (unit + integration where applicable).
  - Add or update example pages in `examples/` demonstrating the change.
  - Run formatter/linter/tests locally (if available): `npm test` / `npm run lint`.
  - Add a short changelog note in `CHANGELOG.md` describing the user-facing change.

- Commit message guidance: use conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`) and a short imperative description.

- Code style & API guidelines:
  - Keep APIs small and declarative; prefer option objects to long argument lists.
  - Prioritize clarity and ergonomics for rapid prototyping over micro-optimizations.
  - Avoid large, single-PR refactors — break changes into small, reviewable steps.