class Texture {
    constructor(path, options = {}) {
        this.path = path;

        // Image resource
        this.image = new Image();
        this.loaded = false;

        // Dimensions
        this.width = 0;
        this.height = 0;

        // Atlas region (UV in pixels)
        this.region = options.region || null;
        // { x, y, width, height }

        // Transform flags (render-time only)
        this.flipX = options.flipX || false;
        this.flipY = options.flipY || false;
        this.rotation = options.rotation || 0; // 0, 90, 180, 270

        // Rendering hints
        this.repeat = options.repeat || false; // tiling
        this.smooth = options.smooth ?? true;

        // Tint color (RGBA object or null for no tint)
        this.tint = options.tint || null;

        this._loadPromise = this._load();
    }

    _load() {
        return new Promise((resolve, reject) => {
            this.image.onload = () => {
                this.loaded = true;
                this.width = this.image.width;
                this.height = this.image.height;

                resolve(this);
            };

            this.image.onerror = () => {
                reject(`Failed to load texture: ${this.path}`);
            };

            this.image.src = this.path;
        });
    }

    // ===== Atlas helpers =====

    setRegion(x, y, w, h) {
        this.region = { x, y, width: w, height: h };
        return this;
    }

    getRegion() {
        return this.region || {
            x: 0,
            y: 0,
            width: this.width,
            height: this.height
        };
    }

    // ===== Transform flags =====

    setFlip(x, y) {
        this.flipX = x;
        this.flipY = y;
        return this;
    }

    setRotation(deg) {
        this.rotation = deg;
        return this;
    }

    // ===== Utility =====

    isReady() {
        return this.loaded;
    }

    async waitUntilLoaded() {
        return this._loadPromise;
    }

    getSize() {
        return {
            width: this.width,
            height: this.height
        };
    }

    // ===== Static atlas helper =====

    static fromAtlas(texture, x, y, w, h) {
        const t = new Texture(texture.path);
        t.image = texture.image;
        t.loaded = true;
        t.width = texture.width;
        t.height = texture.height;
        t.setRegion(x, y, w, h);
        return t;
    }
}

export { Texture };