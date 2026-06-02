import { Vec2, RGBA } from '../utils/units.js';
import { GameObject, Transform } from './Object.js';

const TAU = Math.PI * 2;
const EPSILON_ANGLE = 0.0001;
const DEFAULT_SHADOW_LENGTH = 4096;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeAngle(angle) {
    let a = angle % TAU;
    if (a < -Math.PI) a += TAU;
    if (a > Math.PI) a -= TAU;
    return a;
}

function angleDelta(a, b) {
    return normalizeAngle(a - b);
}

function toVec2(value, fallback = new Vec2(0, 0)) {
    if (!value) return fallback.clone();
    if (value instanceof Vec2) return value.clone();
    return new Vec2(value.x ?? fallback.x, value.y ?? fallback.y);
}

function colorToCss(color, alpha = 1) {
    if (color instanceof RGBA) {
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(color.a * alpha, 0, 1)})`;
    }
    if (typeof color === 'string') return color;
    if (Array.isArray(color)) {
        return `rgba(${color[0] ?? 255}, ${color[1] ?? 255}, ${color[2] ?? 255}, ${clamp((color[3] ?? 1) * alpha, 0, 1)})`;
    }
    return `rgba(${color?.r ?? 255}, ${color?.g ?? 255}, ${color?.b ?? 255}, ${clamp((color?.a ?? 1) * alpha, 0, 1)})`;
}

function getObjectCenter(obj) {
    return obj?.transform?.position ?? new Vec2(0, 0);
}

function getObjectAABB(obj) {
    if (typeof obj?.getAABB === 'function') return obj.getAABB();
    const center = getObjectCenter(obj);
    const half = (obj?.size ?? new Vec2(0, 0)).multiply(0.5);
    return { min: center.subtract(half), max: center.add(half) };
}

function raySegmentIntersection(origin, dir, a, b, maxDistance) {
    const sx = b.x - a.x;
    const sy = b.y - a.y;
    const denom = dir.x * sy - dir.y * sx;
    if (Math.abs(denom) < 1e-9) return null;

    const qx = a.x - origin.x;
    const qy = a.y - origin.y;
    const t = (qx * sy - qy * sx) / denom;
    const u = (qx * dir.y - qy * dir.x) / denom;

    if (t < 0 || t > maxDistance || u < 0 || u > 1) return null;
    return {
        distance: t,
        point: new Vec2(origin.x + dir.x * t, origin.y + dir.y * t)
    };
}

class Light extends GameObject {
    constructor(options = {}) {
        const position = toVec2(options.position);
        const radius = options.radius ?? options.shadowLength ?? DEFAULT_SHADOW_LENGTH;
        super(
            options.transform || new Transform(position),
            {
                ...options,
                collisionShape: 'circle',
                size: options.size || new Vec2(radius * 2, radius * 2),
                mass: options.mass ?? 0,
                isStatic: options.isStatic ?? true
            }
        );
        this.type = options.type || 'point';
        this.isLight = true;
        this.visible = options.visible ?? false;
        this.color = options.color || new RGBA(255, 244, 214, 1);
        this.intensity = options.intensity ?? 1;
        this.enabled = options.enabled ?? true;
        this.castShadows = options.castShadows ?? true;
        this.layer = options.layer ?? 0;
        this.mask = options.mask ?? 0xffffffff;
        this.shadowLength = options.shadowLength ?? DEFAULT_SHADOW_LENGTH;
        this.shadowSoftness = options.shadowSoftness ?? 0;
        this.blendMode = options.blendMode || 'lighter';
    }

    get position() {
        return this.transform.position;
    }

    set position(value) {
        this.transform.position.copy(toVec2(value));
        this.localTransform.position.copy(this.transform.position);
    }

    setPosition(position) {
        this.position = position;
        return this;
    }

    setColor(color) {
        this.color = color;
        return this;
    }

    setIntensity(intensity) {
        this.intensity = intensity;
        return this;
    }

    enable() {
        this.enabled = true;
        return this;
    }

    disable() {
        this.enabled = false;
        return this;
    }
}

class PointLight extends Light {
    constructor(options = {}) {
        super({ ...options, type: 'point' });
        this.radius = options.radius ?? 240;
        this.size = options.size || new Vec2(this.radius * 2, this.radius * 2);
        this.falloff = options.falloff ?? 2;
        this.softness = options.softness ?? 0.75;
    }
}

class SpotLight extends Light {
    constructor(options = {}) {
        super({ ...options, type: 'spot' });
        this.radius = options.radius ?? 320;
        this.size = options.size || new Vec2(this.radius * 2, this.radius * 2);
        this.direction = options.direction ?? 0;
        this.angle = options.angle ?? Math.PI / 3;
        this.falloff = options.falloff ?? 2;
        this.softness = options.softness ?? 0.7;
    }

    lookAt(target) {
        const p = toVec2(target);
        this.direction = Math.atan2(p.y - this.position.y, p.x - this.position.x);
        return this;
    }
}

class DirectionalLight extends Light {
    constructor(options = {}) {
        super({ ...options, type: 'directional' });
        this.direction = options.direction ?? -Math.PI / 4;
        this.intensity = options.intensity ?? 0.35;
        this.shadowLength = options.shadowLength ?? DEFAULT_SHADOW_LENGTH;
    }
}

class AmbientLight {
    constructor(options = {}) {
        this.color = options.color || new RGBA(0, 0, 0, 1);
        this.intensity = options.intensity ?? 0.65;
    }

    setIntensity(intensity) {
        this.intensity = intensity;
        return this;
    }

    setColor(color) {
        this.color = color;
        return this;
    }
}

class Lighting {
    constructor(options = {}) {
        this.enabled = options.enabled ?? true;
        this.ambient = options.ambient instanceof AmbientLight
            ? options.ambient
            : new AmbientLight({
                color: options.ambientColor || new RGBA(0, 0, 0, 1),
                intensity: options.ambientIntensity ?? options.darkness ?? 0.65
            });
        this.lights = [];
        this.blockAllObjects = options.blockAllObjects ?? false;
        this.shadowSamples = options.shadowSamples ?? 20;
        this.maxRayDistance = options.maxRayDistance ?? DEFAULT_SHADOW_LENGTH;
        this.forceAmbient = options.forceAmbient ?? false;
        this.debug = options.debug ?? false;

        this._darkCanvas = null;
        this._darkCtx = null;
        this._colorCanvas = null;
        this._colorCtx = null;

        if (Array.isArray(options.lights)) {
            for (const light of options.lights) this.addLight(light);
        }
    }

    addLight(lightOrOptions) {
        const light = lightOrOptions instanceof Light
            ? lightOrOptions
            : Lighting.createLight(lightOrOptions);
        this.lights.push(light);
        return light;
    }

    removeLight(light) {
        const index = this.lights.indexOf(light);
        if (index !== -1) this.lights.splice(index, 1);
        return light;
    }

    clearLights() {
        this.lights.length = 0;
    }

    createPointLight(options = {}) {
        return this.addLight(new PointLight(options));
    }

    createSpotLight(options = {}) {
        return this.addLight(new SpotLight(options));
    }

    createDirectionalLight(options = {}) {
        return this.addLight(new DirectionalLight(options));
    }

    setAmbient(intensity, color = this.ambient.color) {
        this.ambient.setIntensity(intensity);
        this.ambient.setColor(color);
        return this;
    }

    render(world, canvas, ctx) {
        if (!this.enabled || !world || !canvas || !ctx) return;
        const activeLights = this._getActiveLights(world);
        if (activeLights.length === 0 && !this.forceAmbient) return;

        this._ensureBuffers(canvas);

        const blockers = this._getBlockers(world);
        this._prepareDarkness(canvas);
        this._clearColorBuffer(canvas);

        for (const light of activeLights) {
            if (!light?.enabled || light.intensity <= 0) continue;
            const lightBlockers = this._filterBlockersForLight(light, blockers);
            if (light.type === 'directional') this._renderDirectionalLight(light, world, canvas, lightBlockers);
            else this._renderRadialLight(light, world, canvas, lightBlockers);
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this._colorCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this._darkCanvas, 0, 0);
        ctx.restore();
    }

    static createLight(options = {}) {
        if (options.type === 'spot') return new SpotLight(options);
        if (options.type === 'directional') return new DirectionalLight(options);
        return new PointLight(options);
    }

    _getActiveLights(world) {
        const worldLights = this._collectObjects(world).filter(obj => {
            return obj?.isLight && !obj._destroyed && (typeof obj.isActive !== 'function' || obj.isActive());
        });
        return this.lights.concat(worldLights);
    }

    _ensureBuffers(canvas) {
        const doc = canvas.ownerDocument || document;
        if (!this._darkCanvas) {
            this._darkCanvas = doc.createElement('canvas');
            this._darkCtx = this._darkCanvas.getContext('2d');
        }
        if (!this._colorCanvas) {
            this._colorCanvas = doc.createElement('canvas');
            this._colorCtx = this._colorCanvas.getContext('2d');
        }

        if (this._darkCanvas.width !== canvas.width || this._darkCanvas.height !== canvas.height) {
            this._darkCanvas.width = canvas.width;
            this._darkCanvas.height = canvas.height;
            this._colorCanvas.width = canvas.width;
            this._colorCanvas.height = canvas.height;
        }
    }

    _prepareDarkness(canvas) {
        const ctx = this._darkCtx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = colorToCss(this.ambient.color, clamp(this.ambient.intensity, 0, 1));
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    _clearColorBuffer(canvas) {
        const ctx = this._colorCtx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    _renderRadialLight(light, world, canvas, blockers) {
        const polygon = this._buildVisibilityPolygon(light, blockers, canvas, world.mainCamera);
        if (polygon.length < 3) return;

        const screenPos = this._worldToScreen(light.position, canvas, world.mainCamera);
        const radius = Math.max(1, light.radius * this._cameraZoom(world.mainCamera));
        const strength = clamp(light.intensity, 0, 1);
        const gradient = this._darkCtx.createRadialGradient(screenPos.x, screenPos.y, 0, screenPos.x, screenPos.y, radius);
        this._addAttenuationStops(gradient, light, strength, 'dark');

        this._clipToPolygon(this._darkCtx, polygon);
        this._darkCtx.globalCompositeOperation = 'destination-out';
        this._darkCtx.fillStyle = gradient;
        this._darkCtx.fillRect(screenPos.x - radius, screenPos.y - radius, radius * 2, radius * 2);
        this._darkCtx.restore();
        this._darkCtx.globalCompositeOperation = 'source-over';

        const colorGradient = this._colorCtx.createRadialGradient(screenPos.x, screenPos.y, 0, screenPos.x, screenPos.y, radius);
        this._addAttenuationStops(colorGradient, light, strength * 0.45, 'color');
        this._clipToPolygon(this._colorCtx, polygon);
        this._colorCtx.globalCompositeOperation = light.blendMode || 'lighter';
        this._colorCtx.fillStyle = colorGradient;
        this._colorCtx.fillRect(screenPos.x - radius, screenPos.y - radius, radius * 2, radius * 2);
        this._colorCtx.restore();
        this._colorCtx.globalCompositeOperation = 'source-over';
    }

    _renderDirectionalLight(light, world, canvas, blockers) {
        const ctx = this._darkCtx;
        const colorCtx = this._colorCtx;
        const amount = clamp(light.intensity, 0, 1);

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0, 0, 0, ${amount})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        colorCtx.save();
        colorCtx.globalCompositeOperation = light.blendMode || 'lighter';
        colorCtx.fillStyle = colorToCss(light.color, amount * 0.18);
        colorCtx.fillRect(0, 0, canvas.width, canvas.height);
        colorCtx.restore();

        if (!light.castShadows) return;

        const direction = this._getLightDirection(light);
        const dir = new Vec2(Math.cos(direction), Math.sin(direction)).normalize();
        const shadowDir = dir.negate();
        for (const blocker of blockers) {
            const polygon = this._directionalShadowPolygon(blocker, shadowDir, canvas, world.mainCamera, light.shadowLength);
            if (polygon.length < 3) continue;
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = colorToCss(this.ambient.color, clamp(this.ambient.intensity * amount, 0, 1));
            this._drawScreenPolygon(ctx, polygon);
            ctx.fill();
            ctx.restore();
        }
    }

    _buildVisibilityPolygon(light, blockers, canvas, camera) {
        if (!light.castShadows) {
            return this._fallbackLightPolygon(light, canvas, camera);
        }

        const angles = [];
        const origin = light.position;
        const radius = light.radius ?? this.maxRayDistance;
        const addAngle = (angle) => {
            if (light.type === 'spot' && Math.abs(angleDelta(angle, this._getLightDirection(light))) > light.angle * 0.5) return;
            angles.push(angle - EPSILON_ANGLE, angle, angle + EPSILON_ANGLE);
        };

        for (const blocker of blockers) {
            for (const p of this._getCasterPoints(blocker, origin)) {
                addAngle(Math.atan2(p.y - origin.y, p.x - origin.x));
            }
        }

        if (light.type === 'spot') {
            const half = light.angle * 0.5;
            const direction = this._getLightDirection(light);
            addAngle(direction - half);
            addAngle(direction + half);
            for (let i = 1; i < this.shadowSamples; i++) {
                addAngle(direction - half + (light.angle * i) / this.shadowSamples);
            }
        } else {
            for (let i = 0; i < this.shadowSamples; i++) addAngle((i / this.shadowSamples) * TAU);
        }

        const hits = [];
        for (const angle of angles) {
            const dir = new Vec2(Math.cos(angle), Math.sin(angle));
            const hit = this._castAgainstBlockers(origin, dir, radius, blockers);
            const point = hit?.point ?? origin.add(dir.multiply(radius));
            hits.push({ angle: normalizeAngle(angle), point });
        }

        if (light.type === 'spot') {
            const direction = this._getLightDirection(light);
            hits.sort((a, b) => angleDelta(a.angle, direction) - angleDelta(b.angle, direction));
        } else {
            hits.sort((a, b) => a.angle - b.angle);
        }

        const points = hits.map(hit => this._worldToScreen(hit.point, canvas, camera));
        if (light.type === 'spot') {
            points.unshift(this._worldToScreen(origin, canvas, camera));
        }
        return points;
    }

    _addAttenuationStops(gradient, light, strength, mode) {
        const falloff = Math.max(0.0001, light.falloff ?? 2);
        const softness = clamp(light.softness ?? 0.75, 0.01, 1);
        const steps = 7;

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const inverseSquare = 1 / (1 + falloff * t * t * 6);
            const edgeFade = Math.pow(1 - t, softness);
            const alpha = clamp(strength * inverseSquare * edgeFade, 0, 1);
            gradient.addColorStop(t, mode === 'dark' ? `rgba(0, 0, 0, ${alpha})` : colorToCss(light.color, alpha));
        }
        gradient.addColorStop(1, mode === 'dark' ? 'rgba(0, 0, 0, 0)' : colorToCss(light.color, 0));
    }

    _fallbackLightPolygon(light, canvas, camera) {
        const points = [];
        const samples = Math.max(12, this.shadowSamples);
        const radius = light.radius ?? this.maxRayDistance;
        const direction = this._getLightDirection(light);
        const start = light.type === 'spot' ? direction - light.angle * 0.5 : 0;
        const span = light.type === 'spot' ? light.angle : TAU;

        if (light.type === 'spot') points.push(this._worldToScreen(light.position, canvas, camera));
        for (let i = 0; i <= samples; i++) {
            const angle = start + (span * i) / samples;
            const point = light.position.add(new Vec2(Math.cos(angle), Math.sin(angle)).multiply(radius));
            points.push(this._worldToScreen(point, canvas, camera));
        }
        return points;
    }

    _castAgainstBlockers(origin, dir, maxDistance, blockers) {
        let nearest = null;
        for (const blocker of blockers) {
            for (const segment of this._getCasterSegments(blocker)) {
                const hit = raySegmentIntersection(origin, dir, segment[0], segment[1], maxDistance);
                if (!hit) continue;
                if (!nearest || hit.distance < nearest.distance) nearest = { ...hit, object: blocker };
            }
        }
        return nearest;
    }

    _getBlockers(world) {
        const objects = this._collectObjects(world);
        return objects.filter(obj => {
            if (!obj || obj._destroyed) return false;
            if (typeof obj.isActive === 'function' && !obj.isActive()) return false;
            if (obj.light || obj.isLight) return false;
            if (obj.blocksLight === true || obj.castsShadow === true || obj.hasTag?.('light-blocker')) return true;
            if (!this.blockAllObjects) return false;
            return obj.collisionShape === 'box' || obj.collisionShape === 'circle';
        });
    }

    _filterBlockersForLight(light, blockers) {
        return blockers.filter(obj => {
            const layer = obj.layer ?? 0;
            const mask = obj.mask ?? 0xffffffff;
            return ((mask & (1 << light.layer)) !== 0) && ((light.mask & (1 << layer)) !== 0);
        });
    }

    _collectObjects(world) {
        const out = [];
        const seen = new Set();
        const visit = (obj) => {
            if (!obj || seen.has(obj) || obj._destroyed) return;
            seen.add(obj);
            out.push(obj);

            if (Array.isArray(obj.children)) {
                for (const child of obj.children) visit(child);
            }
        };

        for (const obj of world.objects || []) visit(obj);
        return out;
    }

    _getLightDirection(light) {
        return (light.direction ?? 0) + (light.transform?.rotation ?? 0);
    }

    _getCasterPoints(blocker, origin) {
        if (blocker.collisionShape === 'circle') {
            const center = getObjectCenter(blocker);
            const radius = (blocker.size?.x ?? blocker.size?.y ?? 0) * 0.5;
            const base = Math.atan2(center.y - origin.y, center.x - origin.x);
            const distance = Math.max(center.distanceTo(origin), radius + 0.0001);
            const tangent = Math.asin(clamp(radius / distance, -1, 1));
            return [
                center.add(new Vec2(Math.cos(base - tangent), Math.sin(base - tangent)).multiply(radius)),
                center.add(new Vec2(Math.cos(base + tangent), Math.sin(base + tangent)).multiply(radius))
            ];
        }

        const aabb = getObjectAABB(blocker);
        return [
            new Vec2(aabb.min.x, aabb.min.y),
            new Vec2(aabb.max.x, aabb.min.y),
            new Vec2(aabb.max.x, aabb.max.y),
            new Vec2(aabb.min.x, aabb.max.y)
        ];
    }

    _getCasterSegments(blocker) {
        if (blocker.collisionShape === 'circle') {
            const center = getObjectCenter(blocker);
            const radius = (blocker.size?.x ?? blocker.size?.y ?? 0) * 0.5;
            const steps = 16;
            const segments = [];
            let prev = center.add(new Vec2(radius, 0));
            for (let i = 1; i <= steps; i++) {
                const angle = (i / steps) * TAU;
                const next = center.add(new Vec2(Math.cos(angle), Math.sin(angle)).multiply(radius));
                segments.push([prev, next]);
                prev = next;
            }
            return segments;
        }

        const p = this._getCasterPoints(blocker);
        return [[p[0], p[1]], [p[1], p[2]], [p[2], p[3]], [p[3], p[0]]];
    }

    _directionalShadowPolygon(blocker, shadowDir, canvas, camera, length) {
        const points = this._getCasterPoints(blocker);
        const projected = points.map(p => p.add(shadowDir.multiply(length)));
        const all = points.concat(projected);
        const center = all.reduce((acc, p) => acc.addSelf(p), new Vec2(0, 0)).divideSelf(all.length);
        all.sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
        return all.map(p => this._worldToScreen(p, canvas, camera));
    }

    _clipToPolygon(ctx, polygon) {
        ctx.save();
        this._drawScreenPolygon(ctx, polygon);
        ctx.clip();
    }

    _drawScreenPolygon(ctx, polygon) {
        ctx.beginPath();
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
        ctx.closePath();
    }

    _worldToScreen(worldPos, canvas, camera) {
        if (!camera) return worldPos.clone();

        const dx = worldPos.x - camera.position.x;
        const dy = worldPos.y - camera.position.y;
        const cos = Math.cos(camera.rotation ?? 0);
        const sin = Math.sin(camera.rotation ?? 0);
        const x = dx * cos - dy * sin;
        const y = dx * sin + dy * cos;
        const zoom = this._cameraZoom(camera);

        return new Vec2(
            x * zoom + canvas.width / 2,
            y * zoom + canvas.height / 2
        );
    }

    _cameraZoom(camera) {
        return camera?.zoom ?? 1;
    }
}

export { Lighting, AmbientLight, Light, PointLight, SpotLight, DirectionalLight };
