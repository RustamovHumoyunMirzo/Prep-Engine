import { Vec2 } from '../utils/units.js';

class PhysicsEngine {
    constructor(options = {}) {
        this.gravity = options.gravity || new Vec2(0, 0);
        this.iterations = options.iterations || 1;
        this.defaultRestitution = options.restitution ?? 0.2;
        this.cellSize = options.cellSize || 64; // spatial hash cell size
    }

    step(world, dt) {
        if (dt <= 0) return;

        // simple integration for every dynamic object
        const bodies = world.objects.filter(o => o.isActive() && !o.isStatic);

        for (const body of bodies) {
            // apply gravity
            if (!this.gravity.isZero()) {
                const gForce = this.gravity.multiply(body.mass);
                body.applyForce(gForce);
            }

            // acceleration = F / m
            const acc = body.forces.divide(body.mass);
            // v += a * dt
            body.velocity.addSelf(acc.multiply(dt));

            // apply simple linear drag
            if (body.drag && body.drag > 0) {
                const dragFactor = Math.max(0, 1 - body.drag * dt);
                body.velocity.multiplySelf(dragFactor);
            }

            // integrate position
            body.transform.position.addSelf(body.velocity.multiply(dt));

            // clear forces
            body.forces.set(0, 0);
        }

        // Broadphase via spatial hash to reduce pair checks
        const objects = world.objects.filter(o => o.isActive());
        const hash = new SpatialHash(this.cellSize);
        for (const o of objects) hash.insert(o);

        const pairs = hash.collectPairs();

        for (let iter = 0; iter < this.iterations; iter++) {
            for (const pair of pairs) {
                const A = pair[0];
                const B = pair[1];

                // layer/mask check
                if (((A.mask & (1 << B.layer)) === 0) || ((B.mask & (1 << A.layer)) === 0)) continue;

                // both must have sizes and box collision for this simple engine
                if (A.collisionShape !== 'box' || B.collisionShape !== 'box') continue;
                if (!A.size || !B.size) continue;

                const mtv = this._boxCollisionMTV(A, B);
                if (!mtv) continue;

                const { normal, depth } = mtv;

                // resolve positional penetration
                const invMassA = A.isStatic ? 0 : 1 / A.mass;
                const invMassB = B.isStatic ? 0 : 1 / B.mass;
                const invMassSum = invMassA + invMassB;

                if (invMassSum === 0) continue; // both static

                // push objects out of collision proportional to inverse mass
                const separation = normal.multiply(depth / invMassSum);

                if (!A.isStatic) A.transform.position.addSelf(separation.multiply(invMassA));
                if (!B.isStatic) B.transform.position.subtractSelf(separation.multiply(invMassB));

                // collision response (impulse)
                const relativeVel = B.velocity.subtract(A.velocity);
                const velAlongNormal = relativeVel.dot(normal);

                if (velAlongNormal > 0) continue; // separating already

                const restitution = Math.min(A.restitution ?? this.defaultRestitution, B.restitution ?? this.defaultRestitution);

                const j = -(1 + restitution) * velAlongNormal / invMassSum;

                const impulse = normal.multiply(j);

                if (!A.isStatic) A.velocity.subtractSelf(impulse.multiply(invMassA));
                if (!B.isStatic) B.velocity.addSelf(impulse.multiply(invMassB));
            }
        }
    }

    // Compute Minimum Translation Vector for two AABBs (returns {normal:Vec2, depth:number} or null)
    _boxCollisionMTV(A, B) {
        const aMin = A.getAABB().min;
        const aMax = A.getAABB().max;
        const bMin = B.getAABB().min;
        const bMax = B.getAABB().max;

        const overlapX = Math.min(aMax.x, bMax.x) - Math.max(aMin.x, bMin.x);
        if (overlapX <= 0) return null;

        const overlapY = Math.min(aMax.y, bMax.y) - Math.max(aMin.y, bMin.y);
        if (overlapY <= 0) return null;

        // choose axis of least penetration
        if (overlapX < overlapY) {
            const nx = (A.transform.position.x < B.transform.position.x) ? -1 : 1;
            return { normal: new Vec2(nx, 0), depth: overlapX };
        } else {
            const ny = (A.transform.position.y < B.transform.position.y) ? -1 : 1;
            return { normal: new Vec2(0, ny), depth: overlapY };
        }
    }
}

// Simple spatial hash for broadphase collision detection
class SpatialHash {
    constructor(cellSize = 64) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this._objMap = new Map();
    }

    _cellKey(x, y) {
        return `${x},${y}`;
    }

    clear() {
        this.cells.clear();
    }

    insert(obj) {
        if (typeof obj.getAABB !== 'function') return;
        const a = obj.getAABB();
        const minX = Math.floor(a.min.x / this.cellSize);
        const minY = Math.floor(a.min.y / this.cellSize);
        const maxX = Math.floor(a.max.x / this.cellSize);
        const maxY = Math.floor(a.max.y / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = this._cellKey(x, y);
                if (!this.cells.has(key)) this.cells.set(key, []);
                this.cells.get(key).push(obj);
            }
        }

        // track object by id for quick lookup when collecting pairs
        this._objMap.set(obj.id, obj);
    }

    // Collect unique pairs of potential collisions
    collectPairs() {
        const pairs = new Set();
        for (const objs of this.cells.values()) {
            for (let i = 0; i < objs.length; i++) {
                for (let j = i + 1; j < objs.length; j++) {
                    const a = objs[i];
                    const b = objs[j];
                    if (a === b) continue;
                    const idA = a.id;
                    const idB = b.id;
                    const key = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
                    pairs.add(key);
                }
            }
        }

        // convert keys back to object pairs using the id->object map
        const results = [];
        for (const key of pairs) {
            const [id1, id2] = key.split('|');
            const o1 = this._objMap.get(id1);
            const o2 = this._objMap.get(id2);
            if (o1 && o2) results.push([o1, o2]);
        }

        return results;
    }
}

export { PhysicsEngine };