# Examples

This file contains concise runnable patterns demonstrating common tasks.

1) Moving object with physics

```js
import { PrepEngine, World, Rectangle, Transform } from './index.js';
import { PhysicsEngine } from './engine/physics/Core.js';
import { Renderer } from './engine/renderer/Renderer.js';

const canvas = document.getElementById('game');
const engine = new PrepEngine(canvas);
engine.init();

const world = new World();
world.physics = new PhysicsEngine({ gravity: { x: 0, y: 0 } });

const player = new Rectangle(new Transform({ x: 100, y: 100 }), { size: { x: 32, y: 32 }, mass: 1 });
player.setVelocity({ x: 50, y: 0 });
world.addObject(player);

engine.renderer = new Renderer({ debug: true, showAABB: true });
engine.setWorld(world);
engine.run();
```

2) Raycasting example

```js
import { Ray } from './engine/core/Object.js';
const ray = new Ray(player.transform.position, { x: 1, y: 0 }, 1000);
const hit = world.raycast(ray);
if (hit) console.log('Hit object', hit.object, 'at', hit.point, 'distance', hit.distance);
```

3) Using textures

```js
import { Texture } from './engine/core/Texture.js';
const tex = new Texture('/assets/sprite.png');
await tex.waitUntilLoaded();
const go = new Rectangle(new Transform({ x: 200, y: 200 }), { size: { x: 64, y: 64 }, texture: tex });
world.addObject(go);
```
