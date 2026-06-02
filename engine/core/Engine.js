import { Renderer } from '../renderer/Renderer.js';
import { Event } from './Events.js';
import { Vec2 } from '../utils/units.js';

class PrepEngine {
    constructor(canvas) {
        this.canvas = canvas;

        this._ctx = null;

        this._lastTime = 0;
        this._running = false;

        this.update = () => { };

        this.world = null;
        this.renderer = new Renderer();
        this._onCanvasClick = this._onCanvasClick.bind(this);
    }

    init() {
        this._ctx = this.canvas.getContext("2d");

        this._lastTime = 0;
        this._running = false;
        // attach input listeners for events (click)
        if (this.canvas && !this._listening) {
            this.canvas.addEventListener('click', this._onCanvasClick);
            this._listening = true;
        }
    }

    _onCanvasClick(e) {
        if (!this.world) return;

        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const screenPos = new Vec2(screenX, screenY);

        let worldPos = screenPos.clone();
        if (this.world.mainCamera && typeof this.world.mainCamera.screenToWorld === 'function') {
            worldPos = this.world.mainCamera.screenToWorld(screenPos, this.canvas);
        }

        const ev = new Event({ type: 'click', position: worldPos, screenPosition: screenPos });

        // dispatch into world for hit-testing and propagation
        this.world.dispatchEvent(ev);
    }

    run() {
        if (this._running) console.warn("PrepEngine is already running.");
        if (!this._ctx) throw new Error("PrepEngine not initialized. Call init() before run().");
        if (!this.world) throw new Error("World not set. Call setWorld() before run().");

        this._running = true;
        this._lastTime = performance.now();

        const loop = (time) => {
            if (!this._running) return;

            const dt = (time - this._lastTime) / 1000;
            this._lastTime = time;

            this.world.update(dt);
            this.update(dt);
            if (this.renderer && typeof this.renderer.render === 'function') {
                this.renderer.render(this.world, this.canvas, this._ctx);
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    stop() {
        if (!this._running) console.warn("PrepEngine is not running.");
        this._running = false;
    }

    setRenderer(renderer) {
        this.renderer = renderer;
    }

    setWorld(world) {
        this.world = world;
    }

    isRunning() {
        return this._running;
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
        }
    }
}

export { PrepEngine };