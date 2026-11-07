import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { CONTENT } from './content.js';
import * as T from './textures.js';

const MODELS = `${import.meta.env.BASE_URL}models/`;
const FOV = 32;
const VIEW_DIR = new THREE.Vector3(0, 1, 0.46).normalize(); // camera looks down at ~25° from vertical
const TILT_X = -Math.atan2(VIEW_DIR.z, VIEW_DIR.y); // rotation that faces a flat object toward the camera

// Arrangements: x right, z toward the viewer. ry = rotation around Y.
const LAYOUTS = {
  landscape: {
    bounds: { w: 5.3, d: 3.0 },
    notebook: [-1.55, -0.15, 0.12],
    stack: [-0.2, -0.45],
    fan: [[-1.0, -0.35, 0.2], [-0.15, -0.55, -0.03], [0.7, -0.35, -0.22]],
    clipboard: [1.2, -0.2, -0.08],
    sticky: [0.3, 0.78, 0.22],
    cv: [-0.8, 0.85, -0.16],
    mug: [2.05, 0.65, 0],
    clock: [1.2, 0.95, -0.28],
    plant: [-2.25, -1.1, 0],
    cookie: [2.35, 0.15, 0.6],
    books: [2.15, -1.0, 0.4],
    mouse: [-2.3, 0.95, -0.3],
  },
  portrait: {
    bounds: { w: 2.7, d: 4.7 },
    notebook: [-0.62, -1.55, 0.1],
    stack: [0.62, -1.4],
    fan: [[-0.72, -0.55, 0.16], [0.02, -0.75, 0], [0.74, -0.55, -0.16]],
    clipboard: [-0.58, 0.05, -0.06],
    sticky: [0.66, -0.1, 0.2],
    cv: [0.6, 0.72, -0.14],
    mug: [-0.62, 1.4, 0],
    clock: [0.55, 1.5, -0.2],
    plant: [-1.0, 2.1, 0],
    cookie: [0.05, 1.05, 0.5],
    books: [1.0, -2.2, 0.3],
    mouse: [1.05, 2.15, -0.3],
  },
};

export function createDesk({ reduced }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#24170f');
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  const target = new THREE.Vector3();

  // ---------------------------------------------------------- lights
  scene.add(new THREE.HemisphereLight('#fff1dc', '#3b2a1f', 1.1));
  const sun = new THREE.DirectionalLight('#ffe0b5', 2.3);
  sun.position.set(-2.6, 6, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 15 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 5;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#a9d6d0', 0.35);
  rim.position.set(3, 4, -3);
  scene.add(rim);

  // ---------------------------------------------------------- desk
  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ map: T.woodTexture(), roughness: 0.72 })
  );
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  // ---------------------------------------------------------- helpers
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  /** Box with a printed top face (BoxGeometry face order: +x,-x,+y,-y,+z,-z). */
  const printedBox = (w, h, d, topTex, sideColor, bottomColor = sideColor) => {
    const side = std({ color: sideColor });
    return shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
      side, side, std({ map: topTex }), std({ color: bottomColor }), side, side,
    ]));
  };

  const items = [];
  const pickables = [];
  /** An item = outer (layout / open animation) > inner (hover lift) > meshes. */
  function makeItem(kind, meta = {}) {
    const outer = new THREE.Group();
    const inner = new THREE.Group();
    outer.add(inner);
    scene.add(outer);
    const item = { kind, outer, inner, hover: 0, base: { x: 0, y: 0, z: 0, ry: 0 }, ...meta };
    outer.userData.item = item;
    items.push(item);
    return item;
  }
  const addPick = (item) => pickables.push(item.outer);

  // ---------------------------------------------------------- objects
  // Notebook (About)
  const notebook = makeItem('notebook');
  notebook.inner.add(printedBox(0.9, 0.07, 1.2, T.notebookCover(CONTENT.about.skills), '#efe6d2', T.PAL.deepTeal));
  notebook.restY = 0.035;
  addPick(notebook);

  // Polaroids (Projects)
  const polaroids = CONTENT.projects.map((p, i) => {
    const it = makeItem('polaroid', { index: i });
    it.inner.add(printedBox(0.62, 0.012, 0.74, T.polaroidFront(p), '#f4efe4'));
    it.restY = 0.006 + (2 - i) * 0.014; // Zer0ed on top
    addPick(it);
    return it;
  });
  let fanned = false;

  // Clipboard (Experience)
  const clipboard = makeItem('clipboard');
  clipboard.inner.add(shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.03, 1.16, 2, 0.02), std({ color: '#9b6b43', roughness: 0.6 }))));
  const paper = printedBox(0.74, 0.006, 0.96, T.clipboardPaper(CONTENT.experience), '#f4efe4');
  paper.position.set(0, 0.018, 0.06);
  clipboard.inner.add(paper);
  const clip = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.06, 0.12, 2, 0.02), std({ color: '#b9b9b4', metalness: 0.7, roughness: 0.3 })));
  clip.position.set(0, 0.04, -0.5);
  clipboard.inner.add(clip);
  clipboard.restY = 0.015;
  addPick(clipboard);

  // Sticky-note pile (Contact)
  const sticky = makeItem('sticky');
  for (let i = 0; i < 5; i++) {
    const top = i === 4;
    const note = top
      ? printedBox(0.46, 0.006, 0.46, T.stickyTop(CONTENT.contact), '#e9c75c')
      : shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.006, 0.46), std({ color: i % 2 ? '#f0cf66' : '#e9c75c' })));
    note.position.y = i * 0.007;
    note.rotation.y = (i - 2) * 0.06 * (i % 2 ? 1 : -1);
    sticky.inner.add(note);
  }
  sticky.restY = 0.003;
  addPick(sticky);

  // Folded CV
  const cv = makeItem('cv');
  const cvTex = T.cvPaper();
  const front = printedBox(0.62, 0.005, 0.42, cvTex, '#efe8d8');
  cv.inner.add(front);
  const flap = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.005, 0.2), std({ color: '#f1ebdc' })));
  flap.geometry.translate(0, 0, -0.1);
  flap.position.set(0, 0.003, -0.21);
  flap.rotation.x = 0.35; // half-open fold
  cv.inner.add(flap);
  cv.restY = 0.003;
  addPick(cv);

  // Desk clock (Power / leave)
  const clock = makeItem('clock');
  const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.26, 0.3, 3, 0.05), std({ color: T.PAL.deepTeal, roughness: 0.5 })));
  body.position.y = 0.13;
  clock.inner.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.2), new THREE.MeshBasicMaterial({ map: T.clockFace(), toneMapped: false }));
  face.position.set(0, 0.13, 0.151);
  clock.inner.add(face);
  const btn = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20), std({ color: T.PAL.coral, roughness: 0.4 })));
  btn.position.set(0.17, 0.27, 0);
  clock.inner.add(btn);
  clock.restY = 0;
  addPick(clock);

  // Mug (CC0 model) + steam
  const mug = makeItem('mug');
  mug.restY = 0;
  addPick(mug);
  const steamTex = T.blobTexture();
  const steam = Array.from({ length: 5 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.phase = i / 5;
    mug.inner.add(s);
    return s;
  });
  let steamOn = true;
  let puffUntil = 0;

  // Decorations (CC0 models, not interactive)
  const deco = { plant: makeItem('deco'), cookie: makeItem('deco'), books: makeItem('deco'), mouse: makeItem('deco') };

  const loader = new GLTFLoader();
  const loadModel = (file, item, size) =>
    loader.loadAsync(MODELS + file).then((gltf) => {
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const dim = box.getSize(new THREE.Vector3());
      const s = size / Math.max(dim.x, dim.z);
      m.scale.setScalar(s);
      const b2 = new THREE.Box3().setFromObject(m);
      const c = b2.getCenter(new THREE.Vector3());
      m.position.set(-c.x, -b2.min.y, -c.z);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      item.inner.add(m);
      return { height: b2.max.y - b2.min.y };
    }).catch((e) => console.warn('model failed', file, e));

  loadModel('cup-coffee.glb', mug, 0.42).then((r) => {
    const h = r?.height ?? 0.35;
    steam.forEach((s) => (s.userData.baseY = h));
  });
  loadModel('plantSmall1.glb', deco.plant, 0.5);
  loadModel('cookie.glb', deco.cookie, 0.22);
  loadModel('books.glb', deco.books, 0.6);
  loadModel('computerMouse.glb', deco.mouse, 0.22);

  // ---------------------------------------------------------- layout
  let layoutName = 'landscape';
  let aspect = 1;

  function place(item, [x, z, ry = 0], y = item.restY ?? 0) {
    item.base = { x, y, z, ry };
    item.outer.position.set(x, y, z);
    item.outer.rotation.set(0, ry, 0);
  }

  function stackPose(i) {
    const L = LAYOUTS[layoutName];
    const jitter = [[0, 0, 0.12], [0.04, -0.03, -0.1], [-0.03, 0.04, 0.05]][i];
    return [L.stack[0] + jitter[0], L.stack[1] + jitter[1], jitter[2]];
  }

  function applyLayout() {
    const L = LAYOUTS[layoutName];
    place(notebook, L.notebook);
    place(clipboard, L.clipboard);
    place(sticky, L.sticky);
    place(cv, L.cv);
    place(clock, L.clock);
    place(mug, L.mug);
    for (const k of Object.keys(deco)) place(deco[k], L[k], 0);
    polaroids.forEach((p, i) => {
      if (fanned) place(p, L.fan[i], 0.12 + i * 0.01);
      else place(p, stackPose(i));
    });
  }

  function fitCamera() {
    const { w, d } = LAYOUTS[layoutName].bounds;
    const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(d / 2 / half, w / aspect / 2 / half) * 1.04;
    camera.userData.dist = dist;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function resize(a) {
    aspect = a;
    const next = a < 0.85 ? 'portrait' : 'landscape';
    if (next !== layoutName) layoutName = next;
    applyLayout();
    fitCamera();
  }

  // ---------------------------------------------------------- picking / hover
  const ray = new THREE.Raycaster();
  function pick(ndc) {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    let o = hit?.object;
    while (o && !o.userData.item) o = o.parent;
    return o?.userData.item ?? null;
  }
  let hovered = null;
  const setHover = (item) => (hovered = item);

  // ---------------------------------------------------------- animations
  const D = reduced ? 0.01 : 1;
  const tween = (obj, vars) => new Promise((res) => gsap.to(obj, { ...vars, duration: (vars.duration ?? 0.5) * D, onComplete: res }));

  /** Lift an object toward the camera before its reading card opens. */
  function lift(item) {
    gsap.killTweensOf([item.outer.position, item.outer.rotation, item.outer.scale]);
    return Promise.all([
      tween(item.outer.position, { y: item.base.y + 0.55, duration: 0.45, ease: 'power3.out' }),
      tween(item.outer.rotation, { x: TILT_X * 0.85, y: 0, duration: 0.45, ease: 'power3.out' }),
      tween(item.outer.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.45, ease: 'power3.out' }),
    ]);
  }

  function putBack(item) {
    const b = item.base;
    return Promise.all([
      tween(item.outer.position, { x: b.x, y: b.y, z: b.z, duration: 0.6, ease: 'power3.inOut' }),
      tween(item.outer.rotation, { x: 0, y: b.ry, z: 0, duration: 0.6, ease: 'power3.inOut' }),
      tween(item.outer.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'power3.inOut' }),
    ]);
  }

  function setFan(open) {
    if (open === fanned) return Promise.resolve();
    fanned = open;
    const L = LAYOUTS[layoutName];
    return Promise.all(
      polaroids.map((p, i) => {
        const [x, z, ry] = open ? L.fan[i] : stackPose(i);
        const y = open ? 0.12 + i * 0.01 : p.restY;
        p.base = { x, y, z, ry };
        const delay = (open ? i : 2 - i) * 0.06;
        return Promise.all([
          tween(p.outer.position, { x, y, z, duration: 0.8, delay, ease: 'power3.inOut' }),
          tween(p.outer.rotation, { x: 0, y: ry, z: 0, duration: 0.8, delay, ease: 'power3.inOut' }),
        ]);
      })
    );
  }

  /** Screen rect (CSS px) of an item's current bounds, for the Flip origin. */
  const _box = new THREE.Box3();
  const _v = new THREE.Vector3();
  function screenRect(item) {
    _box.setFromObject(item.outer);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      _v.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z).project(camera);
      const sx = (_v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-_v.y * 0.5 + 0.5) * window.innerHeight;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }

  function screenPoint(item, yOffset = 0.4) {
    _v.set(item.outer.position.x, item.outer.position.y + yOffset, item.outer.position.z).project(camera);
    return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight };
  }

  // ---------------------------------------------------------- per frame
  function update(dt, time, tilt) {
    const k = 1 - Math.exp(-dt * 10);
    for (const it of items) {
      const goal = it === hovered ? 0.06 : 0;
      it.hover += (goal - it.hover) * k;
      it.inner.position.y = it.hover;
    }

    // Camera: look down at the desk, gently tilted by cursor/gyro.
    const dist = camera.userData.dist ?? 6;
    const tx = reduced ? 0 : tilt.x, ty = reduced ? 0 : tilt.y;
    camera.position.set(target.x + tx * 0.35, target.y + VIEW_DIR.y * dist, target.z + VIEW_DIR.z * dist + ty * 0.3);
    camera.lookAt(target);

    // Steam: visible while sound is on, stronger right after a puff.
    const boost = time < puffUntil ? 1.8 : 1;
    steam.forEach((s) => {
      const p = (time * 0.35 + s.userData.phase) % 1;
      const base = s.userData.baseY ?? 0.35;
      s.position.set(Math.sin(p * 6 + s.userData.phase * 9) * 0.04, base + p * 0.5 * boost, 0);
      s.scale.setScalar(0.12 + p * 0.22);
      s.material.opacity = (steamOn || time < puffUntil ? 1 : 0) * Math.sin(p * Math.PI) * 0.35 * boost;
    });
  }

  resize(window.innerWidth / window.innerHeight);

  return {
    scene,
    camera,
    resize,
    update,
    pick,
    setHover,
    lift,
    putBack,
    setFan,
    isFanned: () => fanned,
    itemFor: (kind, index = 0) => items.filter((i) => i.kind === kind)[index],
    screenRect,
    screenPoint,
    mug,
    setSteam: (on) => (steamOn = on),
    puff: () => (puffUntil = performance.now() / 1000 + 2.2),
  };
}
