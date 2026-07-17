# The Story of Us

A pure HTML / CSS / JS cinematic experience. No React. No build step.

## Run locally
Open `index.html` through any static server (the page uses ES modules
and CDN imports, so `file://` won't work in most browsers).

Inside this project it's served automatically at **/story/**.

## Customize (no code changes needed)
1. Edit `config.js` — your name, birthday, unlock word, and letter text.
2. Drop files into:
   - `assets/photos/` — used by the Memories planet
   - `assets/videos/` — used in modals + the final cinematic
   - `assets/voice/`  — used by the Voice planet
   - `assets/music/`  — background music per scene
3. List them in `assets/media.js`.
4. Edit `timeline`, `reasons`, `museum` arrays in `media.js` — any count works.

## Structure
```
public/story/
├── index.html
├── config.js
├── css/style.css
├── assets/media.js
└── js/
    ├── main.js
    ├── engine/
    │   ├── audioManager.js   (Howler cross-fade)
    │   ├── sceneManager.js   (GSAP transitions)
    │   └── particleEngine.js (Three.js starfield)
    └── scenes/rooms.js       (planet renderers)
```
