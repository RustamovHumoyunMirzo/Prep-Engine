import { Renderer } from '../renderer/Renderer.js';

class PrepEngine {
    constructor(canvas) {
        this.canvas = canvas;

        this._ctx = null;

        this._lastTime = 0;
        this._running = false;

        this.update = () => { };

        this.world = null;
        this.renderer = new Renderer();
    }

    init() {
        this._ctx = this.canvas.getContext("2d");

        this._lastTime = 0;
        this._running = false;
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
}

export { PrepEngine };