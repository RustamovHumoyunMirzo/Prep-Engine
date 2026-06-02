import { PrepEngine } from './engine/core/Engine.js';
import { World } from './engine/core/World.js';
import { GameObject, Transform, Camera, Rectangle, Circle, Ray } from './engine/core/Object.js';
import { randomUUID } from './engine/utils/random.js';
import { Vec2, RGBA } from './engine/utils/units.js';
import { PhysicsEngine } from './engine/physics/Core.js';
import { Texture } from './engine/core/Texture.js';
import { Renderer } from './engine/renderer/Renderer.js';
import { EventEmitter, Event } from './engine/core/Events.js';
import { PointLight, SpotLight, DirectionalLight } from './engine/core/Lighting.js';

const Utils = {
    randomUUID,
    Vec2,
    RGBA
};

export { PrepEngine, World, GameObject, Transform, Utils, PhysicsEngine, Camera, Texture, Rectangle, Circle, Ray, Renderer, EventEmitter, Event, PointLight, SpotLight, DirectionalLight };
export const version = '0.2.0';
