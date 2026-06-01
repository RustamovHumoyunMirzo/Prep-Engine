import { PhysicsEngine } from '../physics/Core.js';
import { Vec2 } from '../utils/units.js';

class World {
    constructor(camera, config) {
        this.objects = [];
        this.mainCamera = camera || null;
        this.physics = new PhysicsEngine(config);
    }

    setPhysicsEngine(physics) {
        this.physics = physics;
    }

    addObject(obj) {
        this.objects.push(obj);
    }

    removeObject(obj) {
        const index = this.objects.indexOf(obj);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
    }

    update(dt) {
        // Run physics step first if a physics engine is attached
        if (this.physics && typeof this.physics.step === 'function') {
            this.physics.step(this, dt);
        }
        for (const obj of this.objects) {
            if (!obj.active) continue;

            obj.update?.(dt);
        }
    }

    setMainCamera(camera) {
        this.mainCamera = camera;
    }

    findObjectById(id) {
        return this.objects.find(obj => obj.id === id) || null;
    }

    findObjectsByTag(tag) {
        return this.objects.filter(obj => obj.hasTag(tag));
    }

    // ===== Collision helpers =====
    // Returns true if two objects are colliding (supports AABB / box collisions)
    isColliding(a, b) {
        return this.getCollisionInfo(a, b) !== null;
    }

    // Returns collision info { normal: Vec2, depth: number } or null
    getCollisionInfo(a, b) {
        if (!a || !b) return null;
        if (a.collisionShape !== 'box' || b.collisionShape !== 'box') return null;
        if (typeof a.getAABB !== 'function' || typeof b.getAABB !== 'function') return null;

        const aA = a.getAABB();
        const bA = b.getAABB();

        const overlapX = Math.min(aA.max.x, bA.max.x) - Math.max(aA.min.x, bA.min.x);
        if (overlapX <= 0) return null;

        const overlapY = Math.min(aA.max.y, bA.max.y) - Math.max(aA.min.y, bA.min.y);
        if (overlapY <= 0) return null;

        // choose axis of least penetration
        if (overlapX < overlapY) {
            const nx = (a.transform.position.x < b.transform.position.x) ? -1 : 1;
            return { normal: new Vec2(nx, 0), depth: overlapX };
        } else {
            const ny = (a.transform.position.y < b.transform.position.y) ? -1 : 1;
            return { normal: new Vec2(0, ny), depth: overlapY };
        }
    }

    // Returns array of collision entries { other: GameObject, info }
    getCollisionsFor(obj) {
        const results = [];
        for (const other of this.objects) {
            if (other === obj) continue;
            const info = this.getCollisionInfo(obj, other);
            if (info) results.push({ other, info });
        }
        return results;
    }

    // Query objects overlapping an AABB (aabb: {min:{x,y}, max:{x,y}})
    queryAABB(aabb) {
        const out = [];
        for (const obj of this.objects) {
            if (typeof obj.getAABB !== 'function') continue;
            const oA = obj.getAABB();
            const overlapX = Math.min(oA.max.x, aabb.max.x) - Math.max(oA.min.x, aabb.min.x);
            const overlapY = Math.min(oA.max.y, aabb.max.y) - Math.max(oA.min.y, aabb.min.y);
            if (overlapX > 0 && overlapY > 0) out.push(obj);
        }
        return out;
    }

    // ===== Raycasting =====
    // ray: Ray (from engine/core/Object.js)
    // options: { first: boolean } -> return first hit or array
    raycast(ray, options = { first: true }) {
        const hits = [];

        for (const obj of this.objects) {
            if (!obj.isActive()) continue;

            // layer/mask filtering: require both sides to allow interaction
            if (((obj.mask & (1 << ray.layer)) === 0) || ((ray.mask & (1 << obj.layer)) === 0)) continue;

            let hit = null;
            if (obj.collisionShape === 'box') {
                hit = this._rayIntersectAABB(ray, obj);
            } else if (obj.collisionShape === 'circle') {
                hit = this._rayIntersectCircle(ray, obj);
            }

            if (hit && hit.distance >= 0 && hit.distance <= ray.length) {
                hit.object = obj;
                hits.push(hit);
            }
        }

        if (hits.length === 0) return options.first ? null : [];

        hits.sort((a, b) => a.distance - b.distance);

        return options.first ? hits[0] : hits;
    }

    // Ray vs AABB (axis-aligned). Returns { distance, point:Vec2, normal:Vec2 } or null
    _rayIntersectAABB(ray, obj) {
        const aabb = obj.getAABB();
        const o = ray.origin;
        const d = ray.direction;

        const invDx = d.x !== 0 ? 1 / d.x : Infinity;
        const invDy = d.y !== 0 ? 1 / d.y : Infinity;

        let tx1 = (aabb.min.x - o.x) * invDx;
        let tx2 = (aabb.max.x - o.x) * invDx;
        let tminx = Math.min(tx1, tx2);
        let tmaxx = Math.max(tx1, tx2);

        let ty1 = (aabb.min.y - o.y) * invDy;
        let ty2 = (aabb.max.y - o.y) * invDy;
        let tminy = Math.min(ty1, ty2);
        let tmaxy = Math.max(ty1, ty2);

        const tEnter = Math.max(tminx, tminy);
        const tExit = Math.min(tmaxx, tmaxy);

        if (tEnter > tExit || tExit < 0) return null;

        const t = tEnter >= 0 ? tEnter : tExit;
        if (!isFinite(t)) return null;

        const point = ray.at(t);

        // compute normal by checking which axis was hit (compare t values)
        let normal = new Vec2(0, 0);
        const eps = 1e-6;
        if (Math.abs(t - tx1) < eps) normal = new Vec2(-Math.sign(d.x), 0);
        else if (Math.abs(t - tx2) < eps) normal = new Vec2(Math.sign(d.x), 0);
        else if (Math.abs(t - ty1) < eps) normal = new Vec2(0, -Math.sign(d.y));
        else if (Math.abs(t - ty2) < eps) normal = new Vec2(0, Math.sign(d.y));
        else {
            // fallback: choose axis by proximity
            const center = new Vec2((aabb.min.x + aabb.max.x) * 0.5, (aabb.min.y + aabb.max.y) * 0.5);
            const local = point.subtract(center);
            const half = new Vec2((aabb.max.x - aabb.min.x) * 0.5, (aabb.max.y - aabb.min.y) * 0.5);
            const dx = half.x - Math.abs(local.x);
            const dy = half.y - Math.abs(local.y);
            if (dx < dy) normal = new Vec2(local.x > 0 ? 1 : -1, 0);
            else normal = new Vec2(0, local.y > 0 ? 1 : -1);
        }

        return { distance: t, point, normal };
    }

    // Ray vs Circle. Returns { distance, point:Vec2, normal:Vec2 } or null
    _rayIntersectCircle(ray, obj) {
        const center = obj.transform.position;
        const radius = (obj.size?.x ?? obj.size?.y ?? 0) * 0.5;
        const o = ray.origin;
        const d = ray.direction;

        const m = o.subtract(center);
        const b = m.dot(d);
        const c = m.dot(m) - radius * radius;

        const discr = b * b - c;
        if (discr < 0) return null;

        const sqrtD = Math.sqrt(discr);
        let t = -b - sqrtD;
        if (t < 0) t = -b + sqrtD;
        if (t < 0) return null;

        const point = ray.at(t);
        const normal = point.subtract(center).normalize();
        return { distance: t, point, normal };
    }
}

export { World };