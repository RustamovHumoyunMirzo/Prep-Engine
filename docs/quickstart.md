# Quickstart

This quickstart shows the minimal steps to get the engine running in a browser environment.

1) Create a canvas in your HTML:

```html
<canvas id="game" width="800" height="600"></canvas>
<script type="module" src="/index.js"></script>
```

2) Minimal JavaScript to boot the engine (in your app script):

```js
import { PrepEngine, World, Rectangle, Transform, Renderer, Camera, PhysicsEngine } from 'prep-engine';

const canvas = document.getElementById('game');
const engine = new PrepEngine(canvas);
engine.init();

const world = new World();
world.mainCamera = new Camera({ position: { x: 0, y: 0 }, zoom: 1 });

// Create an object
const obj = new Rectangle(new Transform({ x: 0, y: 0 }), { size: { x: 32, y: 32 }, color: { r: 255, g: 0, b: 0, a: 1 } });
world.addObject(obj);

// Attach physics (optional)
world.physics = new PhysicsEngine({ gravity: { x: 0, y: 0 }, cellSize: 64 });

// Attach renderer (optional)
import { Renderer } from 'prep-engine';
engine.renderer = new Renderer({ debug: true, showAABB: true, pixelRatio: window.devicePixelRatio || 1 });

engine.setWorld(world);
engine.run();
```

That’s it — the engine will call `world.update(dt)`, run physics, then `renderer.render()` each frame.
