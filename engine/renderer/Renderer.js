import { Vec2 } from '../utils/units.js';
import { Texture } from '../core/Texture.js';
import { Lighting } from '../core/Lighting.js';

class Renderer {
	constructor(options = {}) {
		this.debug = options.debug ?? false;
		this.clearColor = options.clearColor || 'rgba(0,0,0,0)';
		this.showAABB = options.showAABB ?? false;
		this.showVelocity = options.showVelocity ?? false;
		this.pixelRatio = options.pixelRatio || 1;
		this.lighting = options.lighting || new Lighting(options.lightingOptions);
	}

	get lighing() {
		return this.lighting;
	}

	set lighing(value) {
		this.lighting = value;
	}

	// Render the world onto the canvas 2D context
	render(world, canvas, ctx) {
		if (!canvas || !ctx) throw new Error('Canvas and context are required');

		// handle device pixel ratio scaling if requested
		if (this.pixelRatio && this.pixelRatio !== 1) {
			canvas.width = Math.round(canvas.clientWidth * this.pixelRatio);
			canvas.height = Math.round(canvas.clientHeight * this.pixelRatio);
			ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
		}

		// clear
		// always clear the canvas first to avoid ghosting from previous frames
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// optionally fill with a background color if provided (non-transparent)
		if (this.clearColor) {
			// detect fully transparent value quickly by checking string contains 'rgba' with alpha 0 or 'transparent'
			const isTransparent = String(this.clearColor).includes('rgba(0,0,0,0)') || String(this.clearColor).toLowerCase() === 'transparent';
			if (!isTransparent) {
				ctx.save();
				ctx.fillStyle = this.clearColor;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.restore();
			}
		}

		// camera transform
		const cam = world.mainCamera;
		if (cam) {
			ctx.save();
			// move origin to center, apply zoom and rotation, then translate by -camera.position
			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.scale(cam.zoom, cam.zoom);
			ctx.rotate(cam.rotation);
			ctx.translate(-cam.position.x, -cam.position.y);
		} else {
			ctx.save();
		}

		// sort objects by zindex
		// Purge any destroyed objects from the world's list to avoid rendering ghosts
		if (Array.isArray(world.objects)) {
			for (let i = world.objects.length - 1; i >= 0; --i) {
				const o = world.objects[i];
				if (!o) {
					world.objects.splice(i, 1);
					continue;
				}
				if (o._destroyed) {
					world.objects.splice(i, 1);
					continue;
				}
			}
		}

		const objs = this._collectRenderableObjects(world);

		if (this.debug) {
			console.log('[Renderer] drawing objects count=', objs.length, 'world.objects=', world.objects.length);
			for (const o of objs) console.log('[Renderer] draw:', o.id ?? '<no-id>', 'pos=', o.transform?.position?.toString?.() ?? '<no-pos>', 'visible=', o.visible, '_destroyed=', o._destroyed);
			console.log('[Renderer] purge complete; remaining world.objects length=', world.objects.length);
		}
		objs.sort((a, b) => (a.zindex || 0) - (b.zindex || 0));

		for (const obj of objs) {
			this._drawObject(ctx, obj);
		}

		this._drawParticleEmitters(ctx, world);

		// debug overlays
		if (this.debug) {
			for (const obj of objs) {
				if (this.showAABB) this._drawAABB(ctx, obj);
				if (this.showVelocity) this._drawVelocity(ctx, obj);
			}
		}

		ctx.restore(); // restore camera transform

		if (this.lighting && typeof this.lighting.render === 'function') {
			this.lighting.render(world, canvas, ctx);
		}
	}

	_drawObject(ctx, obj) {
		const pos = obj.transform.position;
		const rot = obj.transform.rotation || 0;
		const scale = obj.transform.scale || new Vec2(1, 1);
		const sx = scale.x;
		const sy = scale.y;
		const w = obj.size?.x ?? 0;
		const h = obj.size?.y ?? 0;

		ctx.save();
		ctx.translate(pos.x, pos.y);
		ctx.rotate(rot);
		ctx.scale(sx, sy);

		if (obj.texture instanceof Texture && obj.texture.isReady()) {
			this._drawTexture(ctx, obj);
		} else if (obj.primitiveType === 'circle' || obj.collisionShape === 'circle' || obj.primitiveType === 'circle') {
			this._drawCircle(ctx, obj, w, h);
		} else {
			this._drawRect(ctx, obj, w, h);
		}

		ctx.restore();
	}

	_collectRenderableObjects(world) {
		const out = [];
		const seen = new Set();
		const visit = (obj) => {
			if (!obj || seen.has(obj) || obj._destroyed) return;
			seen.add(obj);

			if (!obj.isLight && obj.visible !== false && (typeof obj.isActive !== 'function' || obj.isActive())) {
				out.push(obj);
			}

			if (Array.isArray(obj.children)) {
				for (const child of obj.children) visit(child);
			}
		};

		for (const obj of world.objects || []) visit(obj);
		return out;
	}

	_drawRect(ctx, obj, w, h) {
		const halfW = w * 0.5;
		const halfH = h * 0.5;

		if (obj.texture instanceof Texture && obj.texture.isReady()) {
			this._drawTexture(ctx, obj);
			return;
		}

		ctx.fillStyle = obj.color?.toRGBAString?.() || 'white';
		ctx.globalAlpha = obj.opacity ?? 1.0;
		ctx.fillRect(-halfW, -halfH, w, h);
		ctx.globalAlpha = 1.0;
	}

	_drawCircle(ctx, obj, w, h) {
		const radius = Math.max(w, h) * 0.5;
		ctx.fillStyle = obj.color?.toRGBAString?.() || 'white';
		ctx.globalAlpha = obj.opacity ?? 1.0;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1.0;
	}

	_drawTexture(ctx, obj) {
		const tex = obj.texture;
		if (!tex || !tex.isReady()) return;

		const region = tex.getRegion();
		const w = obj.size?.x ?? region.width;
		const h = obj.size?.y ?? region.height;
		const halfW = w * 0.5;
		const halfH = h * 0.5;

		ctx.globalAlpha = obj.opacity ?? 1.0;

		// handle flipping by adjusting scale
		ctx.save();
		if (tex.flipX || tex.flipY) {
			ctx.scale(tex.flipX ? -1 : 1, tex.flipY ? -1 : 1);
		}

		// draw image region if region is present
		if (region) {
			ctx.drawImage(tex.image, region.x, region.y, region.width, region.height, -halfW, -halfH, w, h);
		} else {
			ctx.drawImage(tex.image, -halfW, -halfH, w, h);
		}

		ctx.restore();
		ctx.globalAlpha = 1.0;
	}

	_drawParticles(ctx, particles) {
		if (!particles || particles.length === 0) return;
		const sorted = particles.slice().sort((a, b) => (a.zindex || 0) - (b.zindex || 0));
		for (const p of sorted) {
			ctx.save();
			const previousComposite = ctx.globalCompositeOperation;
			ctx.translate(p.position.x, p.position.y);
			ctx.rotate(p.rotation || 0);
			const size = p.size || 4;
			const width = size?.x ?? size;
			const height = size?.y ?? size;
			const halfW = width * 0.5;
			const halfH = height * 0.5;
			ctx.globalCompositeOperation = p.blendMode || 'source-over';
			ctx.globalAlpha = p.opacity ?? 1.0;
			if (p.texture && typeof p.texture.isReady === 'function' && p.texture.isReady()) {
				// draw texture centered
				const region = p.texture.getRegion?.();
				if (region) ctx.drawImage(p.texture.image, region.x, region.y, region.width, region.height, -halfW, -halfH, width, height);
				else ctx.drawImage(p.texture.image, -halfW, -halfH, width, height);
			} else {
				ctx.fillStyle = p.color?.toRGBAString?.() || 'white';
				if (p.primitiveShape === 'circle') {
					ctx.beginPath();
					ctx.arc(0, 0, Math.max(width, height) * 0.5, 0, Math.PI * 2);
					ctx.fill();
				} else {
					ctx.fillRect(-halfW, -halfH, width, height);
				}
			}
			ctx.globalCompositeOperation = previousComposite;
			ctx.restore();
		}
	}

	_drawParticleEmitters(ctx, world) {
		const emitters = Array.isArray(world.particleEmitters)
			? world.particleEmitters
			: (world.particleEmitter ? [world.particleEmitter] : []);
		for (const emitter of emitters) {
			if (emitter && typeof emitter.getParticles === 'function') {
				this._drawParticles(ctx, emitter.getParticles());
			}
		}
	}

	_drawAABB(ctx, obj) {
		const aabb = obj.getAABB();
		ctx.save();
		ctx.strokeStyle = 'rgba(0,255,0,0.75)';
		ctx.lineWidth = 1 / (obj.transform.scale?.x || 1);
		ctx.strokeRect(aabb.min.x, aabb.min.y, aabb.max.x - aabb.min.x, aabb.max.y - aabb.min.y);
		ctx.restore();
	}

	_drawVelocity(ctx, obj) {
		const p = obj.transform.position;
		const v = obj.velocity || new Vec2(0, 0);
		ctx.save();
		ctx.strokeStyle = 'rgba(255,0,0,0.9)';
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.lineTo(p.x + v.x, p.y + v.y);
		ctx.stroke();
		ctx.restore();
	}
}

export { Renderer };
