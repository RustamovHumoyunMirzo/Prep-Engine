function randomUUID() {
    return crypto.randomUUID();
}

// helper: random in range [min, max)
function randRange(min, max) {
    return min + Math.random() * (max - min);
}

export { randomUUID, randRange };