# Rendering

Prep Engine uses a central `Renderer` that draws all objects in the `World` using a camera transform. Rendering is canvas 2D based and intentionally minimal.

Features
- Centralized draw: `Renderer.render(world, canvas, ctx)`
- Camera: `World.mainCamera` is used to shift/zoom/rotate the scene
- Sorting: objects are sorted by `zindex` before drawing
- Textures: `Texture` wraps an `Image` and supports atlas regions, flipping, simple transforms
- Debug overlays: AABB and velocity vectors

Best practices
- Use sensible `size` values for objects (pixels). The renderer uses `size` to determine draw extents when no texture is provided.
- Assign `zindex` for draw ordering when layering is required.
- For large numbers of objects, implement simple frustum culling using `World.queryAABB` before drawing (the renderer can be extended to do this).
