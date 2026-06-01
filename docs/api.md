# API Reference

This reference lists the primary engine classes and their main methods/properties. It is not exhaustive but covers the public surface needed to build games.

Core
- `PrepEngine(canvas)`
  - `init()` — initialize canvas context
  - `run()` — start main loop
  - `stop()` — stop loop
  - `setWorld(world)` — attach a `World`
  - `renderer` — assign a `Renderer` instance; if present it will be called each frame

- `World(camera, config)`
  - `objects` — array of `GameObject`
  - `mainCamera` — `Camera`
  - `physics` — `PhysicsEngine` instance (optional)
  - `addObject(obj)` / `removeObject(obj)`
  - `update(dt)` — updates physics then objects
  - Collision helpers: `isColliding(a,b)`, `getCollisionInfo(a,b)`, `getCollisionsFor(obj)`, `queryAABB(aabb)`
  - Raycasting: `raycast(ray, { first: true })` — returns nearest hit or array

- `GameObject` (base)
  - `id` — unique id
  - `transform` / `localTransform` — `Transform` (position/rotation/scale)
  - `size` — Vec2 (width/height) used for box AABB and rendering default size
  - `collisionShape` — 'box' or 'circle'
  - `mass`, `isStatic`, `velocity`, `forces`, `drag`, `restitution`
  - `layer`, `mask` — collision layer/mask
  - `applyForce(Vec2)`, `setVelocity(Vec2)`, `getAABB()`

- `Transform(position, rotation, scale)` — `Vec2` position, rotation (radians), scale (Vec2)

- `Camera(config)`
  - `position`, `zoom`, `rotation`
  - `target` — optional GameObject to follow
  - `worldToScreen(worldPos, canvas)`, `screenToWorld(screenPos, canvas)`

Physics
- `PhysicsEngine(options)`
  - Options: `{ gravity: Vec2, iterations: number, restitution: number, cellSize: number }`
  - `step(world, dt)` — invoked by `World.update()` when attached
  - Collision: axis-aligned boxes and circles supported. Uses spatial hash broadphase.

Rendering
- `Renderer(options)`
  - Options: `{ debug, clearColor, showAABB, showVelocity, pixelRatio }`
  - `render(world, canvas, ctx)` — draws all visible objects sorted by z-index, applies camera transform
  - Draws either textured objects using `Texture` or simple primitives using `size` and `color`

Utilities
- `Vec2` — 2D vector with common operations
- `RGBA` — color helper
- `Texture(path, options)` — image wrapper with region/atlas support

Examples
- See `docs/Examples.md` for full runnable examples.
