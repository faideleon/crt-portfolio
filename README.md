# CRT Portfolio

Faisal D. Khan's portfolio as a cozy CRT entrance: click the beige computer's screen to dive into a
live 3D desk. Each object on the desk opens part of the portfolio.

| Object | Opens |
|---|---|
| Notebook | About + skills |
| Polaroid stack | Projects (click to fan out, click one to open, "flip" for details) |
| Clipboard | Experience |
| Sticky notes | Contact (tap the email to copy) |
| Folded paper | Resume (placeholder) |
| Coffee mug | "Available for work!" note. Hold to mute or unmute |
| Desk clock | Power off / zoom back out (Esc works too) |

```bash
npm install
npm run dev        # http://localhost:5173
npm run dither     # re-dither screenshots from assets-src/ into public/img/dithered/
npm run build
```

Dev only: `?slow=8` plays the zoom in slow motion.

## How it fits together
- `src/main.js`: the room, the CRT dive, and the render loop. The desk renders into a render target used as
  the CRT image. After the zoom, the same camera renders the desk straight to the screen, so there's no visible switch.
- `src/desk/deskScene.js`: the desk, objects, landscape/portrait layouts, lift and fan animations.
- `src/desk/ui.js`: reading cards that grow out of objects with GSAP Flip, Lenis scrolling, mug and keyboard nav.
- `src/desk/content.js`: all portfolio text and image paths.

Models are CC0 from Kenney (see `CREDITS.md`).
