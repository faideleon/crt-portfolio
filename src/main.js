import * as THREE from 'three';
import { createScene } from './scene.js';
import { createComputer, SCREEN } from './computer.js';
import { createCrtMaterial } from './crtMaterial.js';
import { createDesk } from './desk/deskScene.js';
import { createUI } from './desk/ui.js';
import * as sfx from './audio.js';
import { createGyro } from './gyro.js';
import { clamp01, lerp, smoothstep, easeOutCubic, easeDive, damp } from './tween.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const noHover = window.matchMedia('(hover: none)').matches;
const slow = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('slow')) || 1 : 1;
const ZOOM_DUR = (reduced ? 0.35 : 1.6) * slow;

// ---------------------------------------------------------------- scenes
const S = createScene(document.getElementById('stage'), { reduced });

// The desk renders into this target, which is the CRT's screen image. It always
// has the viewport's aspect, so after the zoom the same view can go straight to
// the canvas with no visible switch.
const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4 });
rt.texture.colorSpace = THREE.SRGBColorSpace;

const crt = createCrtMaterial(rt.texture);
const pc = createComputer(crt);
S.scene.add(pc.group);
const desk = createDesk({ reduced });

const hint = document.getElementById('hint');
const prism = document.getElementById('prism');
const muteBtn = document.getElementById('mute');

const ui = createUI({ desk, sfx, onLeave: zoomOut, reduced });

// Gyro tilt on phones (iOS needs a permission tap).
const gyro = createGyro();
const tiltBtn = document.getElementById('tilt');
if (gyro.needsPermission && noHover) {
  setTimeout(() => { if (!gyro.state.active) tiltBtn.hidden = false; }, 1200);
  tiltBtn.addEventListener('click', async () => {
    sfx.unlockAudio();
    const ok = await gyro.requestPermission();
    tiltBtn.textContent = ok ? 'tilt: on' : 'tilt: blocked';
    setTimeout(() => (tiltBtn.hidden = true), 1200);
  });
}

// ---------------------------------------------------------------- state
// intro → idle → zoomIn → inside → zoomOut → idle
let state = 'intro';
const introStart = performance.now();
let anim = null;
let lampOnPlayed = false;
let powerPlayed = false;

const mouse = new THREE.Vector2();
const ndc = new THREE.Vector2(9, 9);
const ray = new THREE.Raycaster();
let hover = false;
let hoverAmt = 0;
const camTarget = new THREE.Vector3();
const tilt = { x: 0, y: 0 };

// ---------------------------------------------------------------- poses
function idlePose() {
  const A = window.innerWidth / window.innerHeight;
  const target = new THREE.Vector3(0, 0.52, 0.3);
  const dir = new THREE.Vector3(0.3, 0.22, 1).normalize();
  const dist = 3.1 * Math.max(1, Math.pow(1.35 / A, 0.75));
  S.scene.fog.near = dist + 1.2;
  S.scene.fog.far = dist + 6.5;
  return { pos: target.clone().addScaledVector(dir, dist), target };
}

/** Camera pose where the viewport-shaped part of the screen exactly fills the view. */
function screenPose() {
  const rot = pc.group.rotation.y;
  pc.group.rotation.y = 0;
  pc.group.updateMatrixWorld(true);
  const center = pc.screen.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(pc.screen.getWorldQuaternion(new THREE.Quaternion()));
  pc.group.rotation.y = rot;
  pc.group.updateMatrixWorld(true);
  const A = window.innerWidth / window.innerHeight;
  const SA = SCREEN.w / SCREEN.h;
  const visH = A >= SA ? SCREEN.w / A : SCREEN.h;
  const d = visH / 2 / Math.tan(THREE.MathUtils.degToRad(S.camera.fov / 2));
  return { pos: center.clone().addScaledVector(normal, d), target: center };
}

const bezier = (a, c, b, t, out) => {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z
  );
};

// ---------------------------------------------------------------- sizing
let idleScreenPx = 200;
const PX_PER_LINE = 3;

/** Scanlines (~3px each) and the idle screen's pixel height. */
function measureScreen() {
  const p = idlePose();
  const cam = S.camera.clone();
  cam.position.copy(p.pos);
  cam.lookAt(p.target);
  cam.updateMatrixWorld();
  pc.group.updateMatrixWorld(true);
  const top = pc.screen.localToWorld(new THREE.Vector3(0, SCREEN.h / 2, 0)).project(cam);
  const bot = pc.screen.localToWorld(new THREE.Vector3(0, -SCREEN.h / 2, 0)).project(cam);
  idleScreenPx = (Math.abs(top.y - bot.y) / 2) * window.innerHeight;
  crt.uniforms.uLines.value = Math.round(Math.min(230, Math.max(40, idleScreenPx / PX_PER_LINE)));

  const A = window.innerWidth / window.innerHeight;
  const SA = SCREEN.w / SCREEN.h;
  crt.uniforms.uRect.value.set(A >= SA ? 1 : A / SA, A >= SA ? SA / A : 1);
}

/** Render target size: small while it's only a tiny monitor, full during the zoom. */
function sizeTarget(full) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const vw = window.innerWidth, vh = window.innerHeight;
  let h = full ? vh * dpr : Math.min(vh * dpr, idleScreenPx * crt.uniforms.uRect.value.y * dpr * 1.6);
  h = Math.max(96, Math.round(h));
  rt.setSize(Math.round(h * (vw / vh)), h);
}

function resizeAll() {
  S.resize();
  desk.resize(window.innerWidth / window.innerHeight);
  measureScreen();
  sizeTarget(state !== 'idle' && state !== 'intro');
  if (state === 'inside') {
    const p = screenPose();
    S.camera.position.copy(p.pos);
    camTarget.copy(p.target);
    S.camera.lookAt(camTarget);
  }
}

// ---------------------------------------------------------------- init
{
  const p = idlePose();
  S.camera.position.copy(p.pos);
  camTarget.copy(p.target);
  S.camera.lookAt(camTarget);
}
resizeAll();

// ---------------------------------------------------------------- input
const toNdc = (e, out) => out.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);

window.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  toNdc(e, ndc);
  if (state === 'inside' && e.target === S.renderer.domElement && e.pointerType === 'mouse') ui.pointerMove(ndc);
});

window.addEventListener('pointerdown', (e) => {
  if (sfx.unlockAudio() && (state === 'idle' || state === 'zoomIn')) sfx.humStart();
  if (e.target !== S.renderer.domElement) return;
  toNdc(e, ndc);
  if (state === 'inside') return ui.pointerDown(ndc);
  if (state === 'idle' && hitScreen()) zoomIn();
});

window.addEventListener('pointerup', (e) => {
  if (state !== 'inside' || e.target !== S.renderer.domElement) return;
  toNdc(e, ndc);
  ui.pointerUp(ndc);
});

hint.addEventListener('click', () => {
  sfx.unlockAudio();
  if (state === 'idle') zoomIn();
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || state !== 'inside') return;
  if (ui.isOpen()) ui.closeCard();
  else zoomOut();
});

function setMuteLabel(m) {
  muteBtn.setAttribute('aria-pressed', String(m));
  muteBtn.textContent = m ? 'sound: off' : 'sound: on';
}
muteBtn.addEventListener('click', () => {
  const m = !sfx.isMuted();
  sfx.setMuted(m);
  desk.setSteam(!m);
  setMuteLabel(m);
});
document.addEventListener('mute-change', (e) => setMuteLabel(e.detail));

window.addEventListener('resize', resizeAll);

function hitScreen() {
  ray.setFromCamera(ndc, S.camera);
  return ray.intersectObject(pc.screen, false).length > 0;
}

// ---------------------------------------------------------------- transitions
const insideHint = noHover ? 'tap something on the desk · clock = leave' : 'click something on the desk · esc to leave';
const outsideHint = hint.textContent;

function zoomIn() {
  state = 'zoomIn';
  hint.classList.remove('show');
  document.body.style.cursor = '';
  sizeTarget(true);
  sfx.sClick();
  sfx.sWhoosh(ZOOM_DUR + 0.1);
  sfx.humStop(ZOOM_DUR);
  anim = {
    from: { pos: S.camera.position.clone(), target: camTarget.clone() },
    to: screenPose(),
    rot0: pc.group.rotation.y,
    start: performance.now() + 80,
    dir: 1,
  };
}

function finishZoomIn() {
  state = 'inside';
  anim = null;
  document.body.classList.add('inside');
  prism.classList.remove('bloom');
  void prism.offsetWidth;
  prism.classList.add('bloom');
  hint.textContent = insideHint;
  hint.classList.add('show');
  setTimeout(() => { if (state === 'inside') hint.classList.remove('show'); }, 4000);
}

async function zoomOut() {
  if (state !== 'inside') return;
  state = 'leaving';
  hint.classList.remove('show');
  await ui.closeAll();
  document.body.classList.remove('inside');
  document.body.style.cursor = '';
  desk.setHover(null);
  prism.classList.remove('bloom');
  state = 'zoomOut';
  crt.uniforms.uCrt.value = 0;
  sfx.sClick();
  sfx.sWhoosh(ZOOM_DUR, true);
  anim = { from: idlePose(), to: screenPose(), rot0: 0, start: performance.now(), dir: -1 };
}

function finishZoomOut() {
  state = 'idle';
  anim = null;
  sizeTarget(false);
  hint.textContent = outsideHint;
  hint.classList.add('show');
  sfx.humStart();
}

/** t: 0 = idle pose, 1 = inside the screen. */
function applyZoom(t) {
  const e = easeDive(t);
  const { from, to } = anim;
  const ctrl = new THREE.Vector3(to.pos.x + 0.05, to.pos.y + 0.08, to.pos.z + 1.0);
  bezier(from.pos, ctrl, to.pos, e, S.camera.position);
  camTarget.lerpVectors(from.target, to.target, easeOutCubic(clamp01(e * 1.5)));
  S.camera.lookAt(camTarget);
  pc.group.rotation.y = lerp(anim.rot0, 0, easeOutCubic(clamp01(t * 2)));
  crt.uniforms.uCrt.value = 1 - smoothstep(0.55, 1, t);
}

// ---------------------------------------------------------------- loop
function lampLevel(t) {
  if (reduced) return t > 0.3 ? 1 : 0;
  if (t < 0.45) return 0;
  if (t < 0.5) return 0.7;
  if (t < 0.58) return 0.05;
  if (t < 0.63) return 0.9;
  if (t < 0.78) return 0.15;
  return Math.min(1, 0.65 + (t - 0.78) * 1.6);
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  const it = (now - introStart) / 1000;

  // Shared tilt input: gyro on phones, cursor on desktop, gentle sway otherwise.
  let tx = 0, ty = 0;
  if (!reduced) {
    if (gyro.state.active) { tiltBtn.hidden = true; tx = gyro.state.x; ty = gyro.state.y; }
    else if (noHover) { tx = Math.sin(time * 0.35) * 0.5; ty = Math.sin(time * 0.23) * 0.3; }
    else { tx = mouse.x; ty = mouse.y; }
  }
  const tk = damp(4, dt);
  tilt.x += (tx - tilt.x) * tk;
  tilt.y += (ty - tilt.y) * tk;

  // Desk scene always updates (it is either on the CRT or full-screen).
  desk.update(dt, time, tilt);

  if (state === 'inside' || state === 'leaving') {
    // Straight to the canvas: the CRT is out of view.
    S.renderer.setRenderTarget(null);
    S.renderer.toneMapping = THREE.NoToneMapping;
    S.renderer.render(desk.scene, desk.camera);
    return;
  }

  // Intro: lamp flickers on, then the monitor powers on.
  const lamp = lampLevel(it);
  S.setLamp(lamp);
  if (lamp > 0 && !lampOnPlayed) { lampOnPlayed = true; sfx.sLamp(); }
  const power = clamp01((it - 1.5) / (reduced ? 0.2 : 1.0));
  crt.uniforms.uPower.value = power;
  pc.setPowerLed(power > 0 ? 1 : 0);
  if (power > 0 && !powerPlayed) { powerPlayed = true; sfx.sPowerOn(); sfx.humStart(); }
  if (state === 'intro' && it > 2.7) {
    state = 'idle';
    hint.classList.add('show');
  }

  crt.uniforms.uTime.value = time;
  const flicker = reduced ? 0 : Math.sin(time * 37) * 0.04 + Math.sin(time * 11.3) * 0.05;
  const zoomT = anim ? clamp01((now - anim.start) / 1000 / ZOOM_DUR) : 0;
  S.glow.intensity = power * (0.55 + flicker * 0.5) * (1 - smoothstep(0.5, 1, zoomT));
  const sp = pc.screen.getWorldPosition(new THREE.Vector3());
  S.glow.position.set(sp.x, sp.y - 0.05, sp.z + 0.45);
  S.updateDust(time);

  if (state === 'intro' || state === 'idle') {
    let yaw = 0, camX = 0, camY = 0;
    if (!reduced) {
      if (gyro.state.active) { yaw = tilt.x * 0.18; camX = tilt.x * 0.12; camY = -tilt.y * 0.1; }
      else if (noHover) { yaw = tilt.x * 0.14; camY = tilt.y * 0.1; }
      else { yaw = tilt.x * 0.14; camX = tilt.x * 0.08; camY = -tilt.y * 0.08; }
    }
    const k = damp(4, dt);
    pc.group.rotation.y += (yaw - pc.group.rotation.y) * k;
    const p = idlePose();
    S.camera.position.x += (p.pos.x + camX - S.camera.position.x) * k;
    S.camera.position.y += (p.pos.y + camY - S.camera.position.y) * k;
    S.camera.position.z += (p.pos.z - S.camera.position.z) * k;
    camTarget.lerp(p.target, k);
    S.camera.lookAt(camTarget);

    const h = state === 'idle' && !noHover && hitScreen();
    if (h !== hover) {
      hover = h;
      document.body.style.cursor = h ? 'pointer' : '';
    }
  }
  hoverAmt += ((hover ? 1 : 0) - hoverAmt) * damp(10, dt);
  crt.uniforms.uHover.value = hoverAmt;

  if (anim) {
    const t = anim.dir === 1 ? zoomT : 1 - zoomT;
    applyZoom(t);
    if (zoomT >= 1) anim.dir === 1 ? finishZoomIn() : finishZoomOut();
  }

  // 1) desk → render target (the CRT image), 2) room → canvas.
  S.renderer.setRenderTarget(rt);
  S.renderer.render(desk.scene, desk.camera);
  S.renderer.setRenderTarget(null);
  S.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  if (state !== 'inside') S.renderer.render(S.scene, S.camera);
}

requestAnimationFrame(loop);

if (import.meta.env.DEV) window.__demo = { S, pc, crt, desk, ui, rt, get state() { return state; } };
