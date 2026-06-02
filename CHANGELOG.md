# Changelog

Latest version: 0.2.0

Latest release: 0.1.0

## 0.2.0

### Added
- Added an internal canvas lighting system owned by `Renderer`.
- Added `PointLight`, `SpotLight`, and `DirectionalLight` objects.
- Added ambient darkness, colored light glow, distance falloff, spot cones, and shadow blocking.
- Added light blockers with `blocksLight`, `castsShadow`, and the `light-blocker` tag.
- Added child-object rendering and child light discovery.
- Added flashlight example behavior in `examples/soldier.html`.

### Changed
- Renderer now creates lighting internally and renders it after world objects.
- Light objects can be children of regular game objects, but cannot act as parents.
- Child transforms now inherit parent position, rotation, and scale.
- `examples/soldier.html` now uses a player root object with the soldier sprite and flashlight as children.

### Fixed
- Fixed spot-light visibility so cones start from the light origin and light the ground/front area correctly.
- Fixed shadow blockers so interrupted light only blocks the area behind the blocker.
- Fixed child light direction so it follows parent rotation.
