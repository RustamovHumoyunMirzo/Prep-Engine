class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // ===== Immutable =====

    add(vec) {
        return new Vec2(this.x + vec.x, this.y + vec.y);
    }

    subtract(vec) {
        return new Vec2(this.x - vec.x, this.y - vec.y);
    }

    multiply(scalar) {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        if (scalar === 0) {
            throw new Error("Cannot divide Vec2 by zero.");
        }

        return new Vec2(this.x / scalar, this.y / scalar);
    }

    normalize() {
        const length = this.magnitude();

        if (length === 0) {
            return Vec2.zero();
        }

        return this.divide(length);
    }

    negate() {
        return new Vec2(-this.x, -this.y);
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    // ===== Mutable =====

    addSelf(vec) {
        this.x += vec.x;
        this.y += vec.y;
        return this;
    }

    subtractSelf(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    }

    multiplySelf(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    divideSelf(scalar) {
        if (scalar === 0) {
            throw new Error("Cannot divide Vec2 by zero.");
        }

        this.x /= scalar;
        this.y /= scalar;

        return this;
    }

    normalizeSelf() {
        const length = this.magnitude();

        if (length === 0) {
            this.x = 0;
            this.y = 0;
            return this;
        }

        return this.divideSelf(length);
    }

    negateSelf() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(vec) {
        this.x = vec.x;
        this.y = vec.y;
        return this;
    }

    // ===== Math =====

    dot(vec) {
        return this.x * vec.x + this.y * vec.y;
    }

    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }

    magnitude() {
        return Math.hypot(this.x, this.y);
    }

    distanceSquaredTo(vec) {
        const dx = this.x - vec.x;
        const dy = this.y - vec.y;

        return dx * dx + dy * dy;
    }

    distanceTo(vec) {
        return Math.sqrt(this.distanceSquaredTo(vec));
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    angleTo(vec) {
        return Math.atan2(vec.y - this.y, vec.x - this.x);
    }

    equals(vec) {
        return this.x === vec.x && this.y === vec.y;
    }

    isZero() {
        return this.x === 0 && this.y === 0;
    }

    // ===== Utilities =====

    toArray() {
        return [this.x, this.y];
    }

    toString() {
        return `Vec2(${this.x}, ${this.y})`;
    }

    // ===== Static =====

    static zero() {
        return new Vec2(0, 0);
    }

    static one() {
        return new Vec2(1, 1);
    }

    static up() {
        return new Vec2(0, -1);
    }

    static down() {
        return new Vec2(0, 1);
    }

    static left() {
        return new Vec2(-1, 0);
    }

    static right() {
        return new Vec2(1, 0);
    }

    static distance(a, b) {
        return a.distanceTo(b);
    }

    static dot(a, b) {
        return a.dot(b);
    }
}

class RGBA {
    constructor(r = 0, g = 0, b = 0, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    // ===== Cloning =====
    clone() {
        return new RGBA(this.r, this.g, this.b, this.a);
    }

    copy(color) {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
        return this;
    }

    // ===== Mutations =====
    set(r, g, b, a = this.a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    }

    // ===== Basic operations =====
    multiplyScalar(s) {
        return new RGBA(
            this.r * s,
            this.g * s,
            this.b * s,
            this.a
        );
    }

    lerp(to, t) {
        return new RGBA(
            this.r + (to.r - this.r) * t,
            this.g + (to.g - this.g) * t,
            this.b + (to.b - this.b) * t,
            this.a + (to.a - this.a) * t
        );
    }

    // ===== Conversion =====

    toArray() {
        return [this.r, this.g, this.b, this.a];
    }

    toRGBString() {
        return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }

    toRGBAString() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }

    toHex() {
        const toHex = (v) => {
            const h = Math.round(v).toString(16);
            return h.length === 1 ? "0" + h : h;
        };

        return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
    }

    // ===== Utilities =====

    equals(c) {
        return (
            this.r === c.r &&
            this.g === c.g &&
            this.b === c.b &&
            this.a === c.a
        );
    }

    isTransparent() {
        return this.a <= 0;
    }

    isOpaque() {
        return this.a >= 1;
    }

    // ===== Static presets =====
    static black() {
        return new RGBA(0, 0, 0, 1);
    }

    static white() {
        return new RGBA(255, 255, 255, 1);
    }

    static red() {
        return new RGBA(255, 0, 0, 1);
    }

    static green() {
        return new RGBA(0, 255, 0, 1);
    }

    static blue() {
        return new RGBA(0, 0, 255, 1);
    }

    static transparent() {
        return new RGBA(0, 0, 0, 0);
    }
}

export { Vec2, RGBA };