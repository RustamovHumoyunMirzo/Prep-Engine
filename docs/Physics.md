# Physics

The built-in `PhysicsEngine` provides a compact top-down physics system suitable for small scenes and prototypes.

Overview
- Integration: semi-implicit style — forces -> acceleration -> velocity -> position
- Collision shapes: axis-aligned boxes (AABB) and circles
- Broadphase: spatial hash (configurable `cellSize`) to reduce pair checks
- Resolution: positional correction (minimum translation vector) and impulse-based velocity response

Usage

```js
import { PhysicsEngine } from './engine/physics/Core.js';
const phys = new PhysicsEngine({ gravity: new Vec2(0, 0), iterations: 2, cellSize: 64 });
world.physics = phys;
```

Mark static objects by setting `mass: 0` or `isStatic: true` in a `GameObject` config. Dynamic objects should have `mass > 0`.

Collision layers and masks
- Each `GameObject` has `layer` (integer 0..31) and `mask` (bitmask). Two objects are considered only if `(A.mask & (1 << B.layer)) !== 0 && (B.mask & (1 << A.layer)) !== 0`.

Extending
- The physics system is intentionally simple. To add features consider:
  - Swept AABB or continuous collision detection to avoid tunneling
  - Friction and separate tangential impulse
  - Constraints (joints)
  - Higher quality integrators or substepping
