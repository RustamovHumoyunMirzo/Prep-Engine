import { RGBA, Vec2 } from '../utils/units.js';
import { randRange } from '../utils/random.js';

const TWO_PI = Math.PI * 2;

function isVec2(value) {
    return value && typeof value.x === 'number' && typeof value.y === 'number';
}

function cloneValue(value) {
    if (value?.clone) return value.clone();
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === 'object') return { ...value };
    return value;
}

function cloneVec2(value, fallback = Vec2.zero()) {
    if (isVec2(value)) return value.clone?.() || new Vec2(value.x, value.y);
    if (Array.isArray(value)) return new Vec2(value[0] ?? fallback.x, value[1] ?? fallback.y);
    if (value && typeof value === 'object') return new Vec2(value.x ?? fallback.x, value.y ?? fallback.y);
    return fallback.clone();
}

function resolveValue(value, fallback, context) {
    if (typeof value === 'function') return value(context);
    if (value === undefined) return cloneValue(fallback);
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
        return randRange(value.min, value.max);
    }
    return cloneValue(value);
}


function resolveVec2(value, fallback, context) {
    const resolved = resolveValue(value, fallback, context);
    return cloneVec2(resolved, fallback);
}

function resolveColor(value, fallback, context) {
    const resolved = resolveValue(value, fallback, context);
    if (resolved?.clone) return resolved.clone();
    if (Array.isArray(resolved)) return new RGBA(resolved[0] ?? 255, resolved[1] ?? 255, resolved[2] ?? 255, resolved[3] ?? 1);
    if (resolved && typeof resolved === 'object') {
        return new RGBA(resolved.r ?? 255, resolved.g ?? 255, resolved.b ?? 255, resolved.a ?? 1);
    }
    return fallback.clone();
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpValue(a, b, t) {
    if (isVec2(a) || isVec2(b)) {
        const from = cloneVec2(a, Vec2.zero());
        const to = cloneVec2(b, from);
        return new Vec2(lerp(from.x, to.x, t), lerp(from.y, to.y, t));
    }
    return lerp(a, b, t);
}

class Particle {
    constructor(positionOrOptions = {}, velocity, lifetime) {
        const options = isVec2(positionOrOptions)
            ? { position: positionOrOptions, velocity, lifetime }
            : positionOrOptions;

        this.position = cloneVec2(options.position, Vec2.zero());
        this.velocity = cloneVec2(options.velocity ?? options.vxy, Vec2.zero());
        this.acceleration = cloneVec2(options.acceleration, Vec2.zero());

        this.rotation = options.rotation ?? 0;
        this.angularVelocity = options.angularVelocity ?? 0;

        this.size = cloneValue(options.size ?? 4);
        this.startSize = cloneValue(options.startSize ?? options.size ?? 4);
        this.endSize = cloneValue(options.endSize);

        this.color = resolveColor(options.color, RGBA.white());
        this.startColor = resolveColor(options.startColor ?? options.color, this.color);
        this.endColor = options.endColor ? resolveColor(options.endColor, this.startColor) : null;

        this.opacity = options.opacity ?? 1;
        this.startOpacity = options.startOpacity ?? options.opacity ?? 1;
        this.endOpacity = options.endOpacity;

        this.texture = options.texture ?? null;
        this.primitiveShape = options.primitiveShape ?? options.shape ?? 'circle';
        this.blendMode = options.blendMode ?? 'source-over';
        this.intensity = options.intensity ?? 1;
        this.zindex = options.zIndex ?? options.zindex ?? 0;

        this.age = options.age ?? 0;
        this.lifetime = options.lifetime ?? 1;
        this.active = options.active ?? true;

        this.data = options.data ? { ...options.data } : {};
        this.onUpdate = options.onUpdate ?? null;
        this.onComplete = options.onComplete ?? null;
    }

    reset(options = {}) {
        const next = new Particle({ ...this.toConfig(), ...options, age: options.age ?? 0, active: options.active ?? true });
        Object.assign(this, next);
        return this;
    }

    clone(overrides = {}) {
        return new Particle({ ...this.toConfig(), ...overrides });
    }

    toConfig() {
        return {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            acceleration: this.acceleration.clone(),
            rotation: this.rotation,
            angularVelocity: this.angularVelocity,
            size: cloneValue(this.size),
            startSize: cloneValue(this.startSize),
            endSize: cloneValue(this.endSize),
            color: this.color.clone(),
            startColor: this.startColor.clone(),
            endColor: this.endColor?.clone?.() ?? null,
            opacity: this.opacity,
            startOpacity: this.startOpacity,
            endOpacity: this.endOpacity,
            texture: this.texture,
            primitiveShape: this.primitiveShape,
            blendMode: this.blendMode,
            intensity: this.intensity,
            zindex: this.zindex,
            lifetime: this.lifetime,
            active: this.active,
            data: { ...this.data },
            onUpdate: this.onUpdate,
            onComplete: this.onComplete
        };
    }

    applyForce(forceVec, dt = 1) {
        if (!forceVec) return this;
        this.velocity.x += forceVec.x * dt;
        this.velocity.y += forceVec.y * dt;
        return this;
    }

    update(dt) {
        if (!this.active) return;

        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.rotation += this.angularVelocity * dt;
        this.age += dt;

        const t = this.progress;
        if (this.endSize !== undefined) this.size = lerpValue(this.startSize, this.endSize, t);
        if (this.endOpacity !== undefined) this.opacity = lerp(this.startOpacity, this.endOpacity, t);
        if (this.endColor) this.color = this.startColor.lerp(this.endColor, t);

        this.onUpdate?.(this, dt, t);
        if (!this.alive) {
            this.active = false;
            this.onComplete?.(this);
        }
    }

    get progress() {
        if (this.lifetime <= 0) return 1;
        return Math.min(1, Math.max(0, this.age / this.lifetime));
    }

    get alive() {
        return this.active && this.age < this.lifetime;
    }

    get vxy() {
        return this.velocity;
    }

    set vxy(value) {
        this.velocity = cloneVec2(value, Vec2.zero());
    }
}

class ParticleEmitter {
    constructor(options = {}) {
        const hasParticleTemplate = options.particle !== undefined || options.particleOptions !== undefined;

        this.world = null;
        this.position = cloneVec2(options.position, Vec2.zero());
        this.particle = options.particle instanceof Particle
            ? options.particle
            : new Particle(options.particle ?? options.particleOptions ?? {});

        this.emitRate = options.emitRate ?? 0;
        this.maxParticles = options.maxParticles ?? 500;
        this.active = options.active ?? true;
        this.emitting = options.emitting ?? true;
        this.zindex = options.zIndex ?? options.zindex ?? 0;

        this.lifetime = options.lifetime ?? options.particleLife ?? (hasParticleTemplate ? undefined : { min: 0.5, max: 1.5 });
        this.size = options.size ?? (hasParticleTemplate ? undefined : { min: 2, max: 6 });
        this.color = options.color;
        this.opacity = options.opacity;
        this.speed = options.speed ?? { min: 10, max: 60 };
        this.angle = options.angle ?? { min: 0, max: TWO_PI };
        this.velocity = options.velocity;
        this.acceleration = options.acceleration ?? options.gravity ?? Vec2.zero();
        this.rotation = options.rotation;
        this.angularVelocity = options.angularVelocity;
        this.texture = options.texture;
        this.primitiveShape = options.primitiveShape ?? options.shape;
        this.blendMode = options.blendMode;
        this.spawnArea = options.spawnArea ?? null;

        this.particles = [];
        this._pool = [];
        this._accumulator = 0;
    }

    setWorld(world) {
        this.world = world;
        return this;
    }

    setParticle(particle) {
        this.particle = particle instanceof Particle ? particle : new Particle(particle);
        return this;
    }

    start() {
        this.emitting = true;
        return this;
    }

    stop() {
        this.emitting = false;
        return this;
    }

    emit(count = 1, overrides = {}) {
        const spawned = [];
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            const particle = this._spawnParticle(overrides);
            this.particles.push(particle);
            spawned.push(particle);
        }
        return spawned;
    }

    emitParticle(particle, count = 1, overrides = {}) {
        return this.emit(count, { ...overrides, particle });
    }

    burst(count = 10, overrides = {}) {
        return this.emit(count, overrides);
    }

    clear() {
        this._pool.push(...this.particles);
        this.particles.length = 0;
        return this;
    }

    update(dt) {
        if (!this.active) return;

        if (this.emitting && this.emitRate > 0) {
            this._accumulator += dt * this.emitRate;
            const count = Math.floor(this._accumulator);
            if (count > 0) {
                this._accumulator -= count;
                this.emit(count);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(dt);
            if (!particle.alive) {
                this.particles.splice(i, 1);
                this._pool.push(particle);
            }
        }
    }

    getParticles() {
        return this.particles;
    }

    _spawnParticle(overrides = {}) {
        const context = { emitter: this, world: this.world, override: overrides };
        const source = overrides.particle instanceof Particle
            ? overrides.particle
            : this.particle;

        const config = this._buildParticleConfig(source, overrides, context);
        const particle = this._pool.pop();
        if (particle) return particle.reset(config);
        return source.clone(config);
    }

    _buildParticleConfig(source, overrides, context) {
        const position = this._resolveSpawnPosition(overrides.position, context);
        const angle = resolveValue(overrides.angle ?? this.angle, 0, context);
        const speed = resolveValue(overrides.speed ?? this.speed, 0, context);
        const velocity = overrides.velocity ?? this.velocity
            ? resolveVec2(overrides.velocity ?? this.velocity, Vec2.zero(), context)
            : new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);

        return {
            ...source.toConfig(),
            position,
            velocity,
            acceleration: resolveVec2(overrides.acceleration ?? overrides.gravity ?? this.acceleration, Vec2.zero(), context),
            lifetime: resolveValue(overrides.lifetime ?? overrides.particleLife ?? this.lifetime, source.lifetime, context),
            size: resolveValue(overrides.size ?? this.size, source.size, context),
            startSize: resolveValue(overrides.startSize ?? overrides.size ?? this.size, source.startSize, context),
            endSize: resolveValue(overrides.endSize, source.endSize, context),
            color: resolveColor(overrides.color ?? this.color, source.color, context),
            startColor: resolveColor(overrides.startColor ?? overrides.color ?? this.color, source.startColor, context),
            endColor: overrides.endColor ? resolveColor(overrides.endColor, source.endColor ?? source.startColor, context) : source.endColor,
            opacity: resolveValue(overrides.opacity ?? this.opacity, source.opacity, context),
            startOpacity: resolveValue(overrides.startOpacity ?? overrides.opacity ?? this.opacity, source.startOpacity, context),
            endOpacity: resolveValue(overrides.endOpacity, source.endOpacity, context),
            rotation: resolveValue(overrides.rotation ?? this.rotation, source.rotation, context),
            angularVelocity: resolveValue(overrides.angularVelocity ?? this.angularVelocity, source.angularVelocity, context),
            primitiveShape: overrides.primitiveShape ?? overrides.shape ?? this.primitiveShape ?? source.primitiveShape,
            texture: overrides.texture ?? this.texture ?? source.texture,
            blendMode: overrides.blendMode ?? this.blendMode ?? source.blendMode,
            zindex: overrides.zIndex ?? overrides.zindex ?? this.zindex,
            age: 0,
            active: true
        };
    }

    _resolveSpawnPosition(positionOverride, context) {
        if (positionOverride) return resolveVec2(positionOverride, this.position, context);
        if (!this.spawnArea) return this.position.clone();
        if (typeof this.spawnArea === 'function') return cloneVec2(this.spawnArea(context), this.position);

        if (this.spawnArea.type === 'circle') {
            const radius = resolveValue(this.spawnArea.radius, 0, context);
            const angle = randRange(0, TWO_PI);
            const distance = Math.sqrt(Math.random()) * radius;
            return this.position.add(new Vec2(Math.cos(angle) * distance, Math.sin(angle) * distance));
        }

        if (this.spawnArea.type === 'rect' || this.spawnArea.type === 'rectangle') {
            const width = resolveValue(this.spawnArea.width, 0, context);
            const height = resolveValue(this.spawnArea.height, 0, context);
            return this.position.add(new Vec2(randRange(-width * 0.5, width * 0.5), randRange(-height * 0.5, height * 0.5)));
        }

        return this.position.clone();
    }
}

export { ParticleEmitter, Particle };
