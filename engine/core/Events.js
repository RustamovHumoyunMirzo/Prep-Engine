class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(handler);
    }

    off(event, handler) {
        const set = this.events.get(event);
        if (!set) return;
        set.delete(handler);
    }

    emit(event, data) {
        const set = this.events.get(event);
        if (!set) return;
        for (const handler of set) {
            handler(data);
        }
    }

    once(event, handler) {
        const wrapper = (data) => {
            handler(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

// Lightweight event object for world/canvas events
class Event {
    constructor({ type, target = null, position = null, screenPosition = null }) {
        this.type = type;
        this.target = target;
        this.position = position; // world space Vec2
        this.screenPosition = screenPosition; // canvas/screen Vec2
        this.consumed = false;
    }

    stopPropagation() {
        this.consumed = true;
    }
}

export { EventEmitter, Event };