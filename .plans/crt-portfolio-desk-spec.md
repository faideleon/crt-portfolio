# CRT Portfolio: 3D Desk Inside the Screen (Spec)

A new copy of `retro-crt-demo`, named **crt-portfolio** (sibling folder). The beige-PC entrance stays the same, but the screen no longer shows a window-based OS. It shows **a live 3D top-down desk** whose objects hold Faisal's real portfolio content.
The originals stay untouched: `retro-crt-demo` (dummy, deployed) and `Desktop/Projects/Portfolio` (read-only source of content and images).
**Local only.** No repo and no deploy yet (`npm run dev`).

## Content source (from Desktop/Projects/Portfolio)
- **Name / role:** Faisal D. Khan, Full-Stack Developer, Baguio City · Philippines. "Available for work!"
- **Bio:** "I'm a full-stack developer building clean interfaces, PostgreSQL backends, and data-driven systems, from a crowdsourced transit map to a hand-built web portfolio, shipped end to end, solo."
- **Skills:** JavaScript, HTML & CSS, PostgreSQL, Supabase, PostGIS, Flutter, GSAP, C#
- **Experience:**
  - Software Engineer, Zer0ed (Unity, data-driven design, editor tooling). Highlights: Architecture & Logic, Data-Driven Design, End-to-End Development, Editor Tooling
  - Full-Stack Developer, Ruta (Flutter/Supabase/PostGIS). Highlights: Geospatial Architecture, Route Deduplication, Battery-Light Tracking, Full-Stack Delivery
- **Projects (3):**
  - **Zer0ed:** a 2D hex-map survival game with a real-time auto-battler, built solo in Unity. Contributions ×4, stats (3/4 phases built, 12 planned milestones), tech (Unity 6, C#, URP 2D, Tilemap, Input System, ScriptableObjects). Images: Zer0ed-day/battle/night.
  - **Ruta:** a live map and rider community for Baguio jeepney routes. Contributions ×4, stats (90% overlap auto-merge, ~40 KB GPS per 2-hour trip), tech (Flutter, Dart, Supabase, PostgreSQL, PostGIS). Images: Ruta-screens/post/travel (+ phone shots).
  - **Personal Portfolio:** hand-built in HTML/CSS/JS with GSAP and Lenis, plus live GitHub data. Contributions ×4, tech. Images: portfolio-hero/projects/detail.
- **Contact:** faideleon25@gmail.com · github.com/faideleon · @faii.dl
- **Resume:** placeholder (the source link is `#`)

## Branding and look
- The menu-bar name stays **DummyOS** (shown on the desk clock / boot text). The palette stays the retro beige/teal/coral from the demo.
- **Desk surface: warm wood**, matching the outer room's desk, as if you were looking down at your own desk.

## Rendering architecture
- **Live inner scene:** a second Three.js scene (`deskScene`) renders every frame into a `WebGLRenderTarget`, which feeds the CRT shader's `map` instead of the canvas texture. The inner render target is sized to the idle screen's on-screen pixels (×DPR, capped) while idle, and to full size during and after the zoom.
- **Hand-off:** the inner camera's aspect always equals the viewport aspect (same "crop rect" idea as now). At the end of the zoom, stop rendering the outer scene and render `deskScene` straight to the canvas with the same camera. That gives a pixel-identical hand-off, with no HTML crossfade.
- **Zoom out:** reverse. Render the desk to the target, re-enable the outer scene, and run the CRT effects back in.
- Scanline sizing logic stays (≈3px per line in idle).

## Desk objects (CC0 3D models)
- Source: **Kenney** (furniture / office kits) and **Poly Pizza**, CC0 only. Download the .glb files into `public/models/`. Each source, author and license goes in `CREDITS.md`. Report file names and sizes.
- Where a good CC0 model doesn't exist (e.g. polaroid, folded paper, sticky notes), build simple primitive meshes with textures. Paper objects are basically textured thin boxes anyway.
- Objects and what they open:

| Object | Opens | Notes |
|---|---|---|
| Notebook | **About**: bio, location, "Available for work" | Cover carries **skill stickers** (JS, PostgreSQL, Supabase, PostGIS, Flutter, GSAP, C#) |
| Polaroid stack (3) | **Projects** | Click to fan out the 3. Click one to flip it: front = dithered screenshot, back = role, contributions, stats, tech. Arrows cycle extra screenshots |
| Clipboard | **Experience** | Two roles with highlights |
| Sticky-note pile | **Contact** | Email (tap = copy + "copied" stamp; a second link opens mail), GitHub, @faii.dl |
| Folded paper "CV" | **Resume** | Placeholder link for now |
| Coffee mug | Easter egg | Click → steam puff + "Available for work!" note with email. Steam visible = sound on. Long-press toggles sound |
| Desk clock | Replaces the menu bar | Shows time + "DummyOS". Its Power button zooms back out (Esc also works) |

## Interaction
- **Desk camera:** top-down with a slight angle. Gently tilts a few degrees with cursor/gyro (reusing `gyro.js`). Dips slightly toward an object on click.
- **Hover (desktop):** the object lifts ~1cm with a soft shadow change. Pointer cursor.
- **Click, lift and zoom to read:** the object lifts, rotates flat toward the camera, and scales up (3D tween). Then an **HTML reading card** grows out of the object's projected screen rect using **GSAP Flip**, sized to fit the viewport. Click outside or press Esc to reverse it and put the object back.
- **Polaroids:** first click fans the stack out in a spread. Second click on one runs lift + flip (front/back). Next/prev arrows cycle that project's screenshots.
- **Tempo: floaty, about 0.8s** with gentle ease (`power3.inOut` / slight overshoot on settle).
- **Long reading views** (notebook, project backs) scroll with **Lenis**.

## Images
- Copy the needed screenshots from `Portfolio/assets` into `crt-portfolio/assets-src/`.
- **Pre-dither at build time** with an npm dithering library (ordered Bayer or Floyd–Steinberg) to a beige/teal/ink palette. Output to `public/img/dithered/`. Add an `npm run dither` script and run it once. The un-dithered originals aren't shipped.
- Polaroid fronts and reading cards use the dithered versions.

## Libraries
- `three` (existing), `gsap` + Flip plugin, `lenis`, a dithering lib (to pick: one that runs in Node over PNGs, e.g. a sharp-compatible ordered-dither or `image-q`-style quantizer).
- All pinned versions, installed via npm.

## Responsive
- **Portrait/phone:** objects **rearrange** into a taller layout (notebook + polaroids on top, clipboard + stickies in the middle, mug/clock/CV along the bottom) so they stay tappable. The layout is recomputed on resize.
- Reading cards: full-width sheets on phones.
- Reduced motion: lifts and flips become quick fades. No camera tilt.

## Sound (reuse audio.js)
- Paper rustle on lift, a soft tap on put-down, a polaroid "flick" on fan-out. The mug long-press toggles mute (in sync with the existing toggle).

## Out of scope (for now)
- Deploying or a repo for crt-portfolio
- A real resume file
- Changing the original Portfolio or retro-crt-demo

## Done when
- `npm run dev` in `crt-portfolio`: the intro and CRT dive work as before. The screen shows the live 3D desk from outside. The zoom hands off seamlessly to the full-screen desk.
- Every object opens the right content with lift + Flip reading cards. The polaroids fan out and flip with dithered screenshots. Copy email works. The mug note works and long-press mute works. The clock's Power zooms out.
- The portrait layout rearranges correctly. CREDITS.md lists every downloaded model.
