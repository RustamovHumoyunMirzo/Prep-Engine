import { randomUUID } from '../utils/random.js';
import { Vec2 } from '../utils/units.js';

class Transform {
    constructor(position, rotation, scale) {
        this.position = position || new Vec2(0, 0);
        this.rotation = rotation || 0;
        this.scale = scale || new Vec2(1, 1);
    }
}

class GameObject {
    constructor(transform, config) {
        this.id = randomUUID();
        this.localTransform = transform || new Transform();
        this.transform = transform || new Transform();
        this.active = true;
        this.tags = new Set();
        this.parent = null;
        this.children = [];
        this.visible = true;
        this.opacity = 1.0;

        // Physics / collision properties
        this.collisionShape = config?.collisionShape || "box";
        // default mass is 1 (dynamic). set mass to 0 or set config.isStatic to true for static objects
        this.mass = config?.mass ?? 1;
        this.isStatic = config?.isStatic ?? (this.mass === 0);

        // Size for box collisions (width, height)
        this.size = config?.size || new Vec2(1, 1);

        // Kinematic state
        this.velocity = config?.velocity || new Vec2(0, 0);
        this.forces = new Vec2(0, 0);
        this.drag = config?.drag ?? 0.0; // simple linear drag
        this.restitution = config?.restitution ?? 0.2; // bounciness

        this.zindex = config?.zIndex ?? 0; // for rendering order
        this.texture = config?.texture || null; // Texture class
        this.color = config?.color || new RGBA(255, 255, 255, 1); // Fill color (if texture is not set)
        this.primitiveType = null; // "rectangle", "circle", etc. for simple shapes without textures

        // Collision layers: `layer` is an integer index (0..31), `mask` is a bitmask
        this.layer = config?.layer ?? 0;
        this.mask = config?.mask ?? 0xffffffff; // collide with all by default
    }

    setColor(color) {
        this.color = color;
    }

    setZIndex(z) {
        this.zindex = z;
    }

    setVisibility(visible) {
        this.visible = visible;
    }

    setSize(size) {
        this.size = size;
    }

    setCollisionShape(shape) {
        this.collisionShape = shape;
    }

    setOpacity(opacity) {
        this.opacity = opacity;
    }

    setTexture(texture) {
        this.texture = texture;
    }

    _updateTransform() {
        if (!this.parent) {
            this.transform.position.copy(this.localTransform.position);
            this.transform.rotation = this.localTransform.rotation;
            this.transform.scale.copy(this.localTransform.scale);
            return;
        }

        const p = this.parent.transform;

        // position (simple additive inheritance)
        this.transform.position.x = p.position.x + this.localTransform.position.x;
        this.transform.position.y = p.position.y + this.localTransform.position.y;

        // rotation (additive)
        this.transform.rotation = p.rotation + this.localTransform.rotation;

        // scale (multiplicative)
        this.transform.scale.x = p.scale.x * this.localTransform.scale.x;
        this.transform.scale.y = p.scale.y * this.localTransform.scale.y;
    }

    update(dt) {
        this._updateTransform();

        for (const child of this.children) {
            child.update(dt);
        }
    }

    isActive() {
        return this.active;
    }

    hasTag(tag) {
        return this.tags.has(tag);
    }

    addTag(tag) {
        this.tags.add(tag);
    }

    removeTag(tag) {
        this.tags.delete(tag);
    }

    disable() {
        this.active = false;
    }

    enable() {
        this.active = true;
    }

    addChild(child) {
        if (this.children.includes(child)) return;

        child.parent = this;
        this.children.push(child);
    }

    removeChild(child) {
        const index = this.children.indexOf(child);

        if (index === -1) return;

        child.parent = null;
        this.children.splice(index, 1);
    }

    // ===== Physics helpers =====
    applyForce(force) {
        this.forces.addSelf(force);
    }

    setVelocity(vel) {
        this.velocity = vel.clone();
    }

    getAABB() {
        const half = this.size.multiply(0.5);
        const min = this.transform.position.subtract(half);
        const max = this.transform.position.add(half);
        return { min, max };
    }
}

class Camera {
    constructor(config = {}) {
        this.position = config.position?.clone?.() || new Vec2(0, 0);
        this.zoom = config.zoom ?? 1;
        this.rotation = config.rotation ?? 0;

        this.target = config.target || null;
        this.followSpeed = config.followSpeed ?? 1;
    }

    update(dt) {
        if (!this.target) return;

        const t = this.target.transform.position;

        this.position.x += (t.x - this.position.x) * this.followSpeed * dt;
        this.position.y += (t.y - this.position.y) * this.followSpeed * dt;
    }

    worldToScreen(worldPos, canvas) {
        return new Vec2(
            (worldPos.x - this.position.x) * this.zoom + canvas.width / 2,
            (worldPos.y - this.position.y) * this.zoom + canvas.height / 2
        );
    }

    screenToWorld(screenPos, canvas) {
        return new Vec2(
            (screenPos.x - canvas.width / 2) / this.zoom + this.position.x,
            (screenPos.y - canvas.height / 2) / this.zoom + this.position.y
        );
    }
}

class Rectangle extends GameObject {
    constructor(transform, config) {
        super(transform, { ...config, collisionShape: 'box' });
        this.primitiveType = 'rectangle';
    }
}

class Circle extends GameObject {
    constructor(transform, config) {
        super(transform, { ...config, collisionShape: 'circle' });
        this.primitiveType = 'circle';
    }
}

class Ray {
    constructor(origin, direction, length = Infinity, options = {}) {
        // origin: Vec2, direction: Vec2 (will be normalized), length: number
        this.origin = origin.clone();
        this.direction = direction.clone().normalize();
        this.length = length;
        // optional layer/mask filtering
        this.layer = options.layer ?? 0;
        this.mask = options.mask ?? 0xffffffff;
    }

    at(t) {
        return this.origin.add(this.direction.multiply(t));
    }

    setLength(len) {
        this.length = len;
    }
}

export { GameObject, Transform, Camera, Rectangle, Circle, Ray };