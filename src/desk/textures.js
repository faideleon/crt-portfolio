import * as THREE from 'three';

export const PAL = {
  ink: '#2b2420',
  deepTeal: '#2f5d5a',
  teal: '#5e8f8a',
  paleTeal: '#a9c9c2',
  beige: '#d9cdb0',
  cream: '#f6ecd6',
  coral: '#e8735a',
  mustard: '#e9b949',
  sticky: '#f3d36b',
};
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.redraw = (fn) => { fn(g, w, h); tex.needsUpdate = true; };
  return tex;
}

const loadImg = (src) =>
  new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Warm wood desk with long grain. */
export function woodTexture() {
  const tex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#7a5438';
    g.fillRect(0, 0, w, h);
    // Planks
    const plank = 256;
    for (let p = 0; p < w / plank; p++) {
      const x0 = p * plank;
      g.fillStyle = `hsl(25, ${38 + (p % 2) * 4}%, ${30 + ((p * 7) % 5)}%)`;
      g.fillRect(x0, 0, plank, h);
      // Grain lines
      for (let i = 0; i < 70; i++) {
        const gx = x0 + Math.random() * plank;
        g.strokeStyle = `rgba(${Math.random() < 0.5 ? '40,22,12' : '150,105,70'},${0.08 + Math.random() * 0.12})`;
        g.lineWidth = 0.6 + Math.random() * 1.8;
        g.beginPath();
        for (let y = 0; y <= h; y += 16) {
          const xx = gx + Math.sin(y * 0.006 + i) * 6 + Math.sin(y * 0.031 + i * 3) * 1.5;
          y === 0 ? g.moveTo(xx, y) : g.lineTo(xx, y);
        }
        g.stroke();
      }
      g.fillStyle = 'rgba(25,14,8,0.55)';
      g.fillRect(x0, 0, 2, h); // plank seam
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  return tex;
}

/** Notebook cover: cloth color, label, and skill stickers. */
export function notebookCover(skills) {
  return canvasTex(540, 720, (g, w, h) => {
    g.fillStyle = PAL.deepTeal;
    g.fillRect(0, 0, w, h);
    // cloth weave
    g.globalAlpha = 0.07;
    g.fillStyle = '#fff';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.globalAlpha = 1;
    // elastic band + spine shade
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, 38, h);
    g.fillStyle = PAL.coral;
    g.fillRect(w - 70, 0, 18, h);
    // label
    rr(g, 90, 90, 330, 130, 10);
    g.fillStyle = PAL.cream;
    g.fill();
    g.fillStyle = PAL.ink;
    g.font = `700 44px ${MONO}`;
    g.fillText('ABOUT', 120, 150);
    g.font = `400 24px ${MONO}`;
    g.fillText('F. D. Khan', 122, 192);
    // stickers
    const colors = [PAL.mustard, PAL.coral, PAL.paleTeal, PAL.cream, PAL.sticky];
    let x = 80, y = 290;
    skills.forEach((s, i) => {
      g.font = `700 24px ${MONO}`;
      const tw = g.measureText(s).width + 32;
      if (x + tw > w - 90) { x = 80; y += 74; }
      g.save();
      g.translate(x + tw / 2, y + 24);
      g.rotate(((i * 37) % 11 - 5) * 0.02);
      rr(g, -tw / 2, -24, tw, 48, 24);
      g.fillStyle = colors[i % colors.length];
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = PAL.ink;
      g.stroke();
      g.fillStyle = PAL.ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(s, 0, 2);
      g.restore();
      x += tw + 14;
    });
  });
}

/** Polaroid front: white frame, dithered photo, handwritten caption. */
export function polaroidFront(project) {
  const tex = canvasTex(440, 520, (g, w, h) => paintPolaroid(g, w, h, project, null));
  loadImg(project.shots[0].src).then((img) => img && tex.redraw((g, w, h) => paintPolaroid(g, w, h, project, img)));
  return tex;
}
function paintPolaroid(g, w, h, project, img) {
  g.fillStyle = '#fbf7ee';
  g.fillRect(0, 0, w, h);
  const pad = 26, ph = w - pad * 2;
  g.fillStyle = PAL.ink;
  g.fillRect(pad, pad, ph, ph);
  if (img) {
    g.imageSmoothingEnabled = false;
    const s = Math.max(ph / img.width, ph / img.height);
    const iw = img.width * s, ih = img.height * s;
    g.save();
    g.beginPath();
    g.rect(pad, pad, ph, ph);
    g.clip();
    g.drawImage(img, pad + (ph - iw) / 2, pad + (ph - ih) / 2, iw, ih);
    g.restore();
  }
  g.fillStyle = PAL.ink;
  g.font = `700 40px ${HAND}`;
  g.textAlign = 'center';
  g.fillText(project.title, w / 2, h - 46);
}

/** Clipboard paper: header + faux lines. */
export function clipboardPaper(exp) {
  return canvasTex(480, 620, (g, w, h) => {
    g.fillStyle = '#fbf7ee';
    g.fillRect(0, 0, w, h);
    g.fillStyle = PAL.ink;
    g.font = `700 40px ${MONO}`;
    g.fillText('EXPERIENCE', 40, 120);
    g.fillStyle = PAL.coral;
    g.fillRect(40, 140, 120, 6);
    let y = 200;
    exp.forEach((e) => {
      g.fillStyle = PAL.ink;
      g.font = `700 28px ${MONO}`;
      g.fillText(e.org, 40, y);
      g.font = `400 22px ${MONO}`;
      g.fillStyle = '#6d6052';
      g.fillText(e.role, 40, y + 32);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = 'rgba(43,36,32,0.18)';
        g.fillRect(40, y + 62 + i * 26, 360 - (i % 2) * 90, 8);
      }
      y += 200;
    });
  });
}

/** Top sticky note: contact scribbles. */
export function stickyTop(contact) {
  return canvasTex(400, 400, (g, w, h) => {
    g.fillStyle = PAL.sticky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(0, 0, w, 50);
    g.fillStyle = PAL.ink;
    g.font = `700 46px ${HAND}`;
    g.fillText('say hi!', 40, 130);
    g.font = `400 24px ${HAND}`;
    g.fillText(contact.email, 40, 200);
    g.fillText(contact.handle, 40, 245);
    g.fillText('github/faideleon', 40, 290);
  });
}

/** Folded paper: "CV" label. */
export function cvPaper() {
  return canvasTex(480, 340, (g, w, h) => {
    g.fillStyle = '#f7f1e3';
    g.fillRect(0, 0, w, h);
    g.fillStyle = PAL.ink;
    g.font = `700 64px ${MONO}`;
    g.fillText('CV', 40, 120);
    g.font = `400 22px ${MONO}`;
    g.fillText('resume · F. D. Khan', 42, 160);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(43,36,32,0.16)';
      g.fillRect(42, 200 + i * 24, 380 - (i % 3) * 60, 7);
    }
  });
}

/** Desk clock LCD (redrawn each minute). */
export function clockFace() {
  const tex = canvasTex(320, 150, () => {});
  const paint = () =>
    tex.redraw((g, w, h) => {
      g.fillStyle = '#1d2b28';
      g.fillRect(0, 0, w, h);
      const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      g.fillStyle = '#8fe6c8';
      g.font = `700 76px ${MONO}`;
      g.textAlign = 'center';
      g.fillText(t, w / 2, 92);
      g.font = `400 20px ${MONO}`;
      g.fillStyle = PAL.mustard;
      g.fillText('DummyOS · power ⏻', w / 2, 132);
    });
  paint();
  setInterval(paint, 15_000);
  return tex;
}

/** Soft round blob used for steam puffs. */
export function blobTexture() {
  return canvasTex(64, 64, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, w);
  });
}
