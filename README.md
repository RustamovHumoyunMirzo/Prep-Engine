# Prep Engine

Prep Engine is a lightweight, top-down 2D game engine written in plain JavaScript. It provides a small core for scene management, a simple physics system (AABB and circle support), a central renderer, and utilities to build interactive examples quickly.

This repository is intentionally minimal and focused on being a clean, easy-to-read starting point for prototyping and learning engine systems.

Key features
- Core loop and world management (`PrepEngine`, `World`, `GameObject`)
- Simple physics: integration, AABB collision resolution, spatial-hash broadphase (`PhysicsEngine`)
- Raycasting and collision helpers (`Ray`, `World.raycast`, `World.isColliding`)
- Central renderer with camera support (`Renderer`, `Texture`) and debug overlays
- Small math utilities: `Vec2`, `RGBA`

See the [`docs/`](docs/) folder for detailed usage, API reference, and examples.

Contributing
- Keep the code simple and readable. This project prefers clarity over micro-optimizations.
- Add tests or examples to [`examples/`](examples/) when you add new APIs.

# Status
The engine is currently in early development.

# License
Prep is licensed under the MIT License. See [LICENSE](LICENSE) for more information.