import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';
import { CONTENT } from './content.js';

gsap.registerPlugin(Flip);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const KIND_TO_CARD = { notebook: 'about', clipboard: 'experience', sticky: 'contact', cv: 'resume' };
const LONG_PRESS_MS = 550;

/**
 * Reading cards + desk interactions while "inside" the screen.
 * Clicking an object lifts it in 3D, then an HTML card grows out of its
 * projected screen rect with GSAP Flip, and shrinks back into it on close.
 */
export function createUI({ desk, sfx, onLeave, reduced }) {
  const layer = document.getElementById('cards');
  const note = document.getElementById('mug-note');
  const DUR = reduced ? 0.01 : 0.8;

  let open = null; // { item, card, lenis }
  let busy = false;
  let pressTimer = null;
  let longPressed = false;
  let downItem = null;

  // ------------------------------------------------------------ pointer (from main.js, canvas only)
  function pointerMove(ndc) {
    if (open || busy) return desk.setHover(null);
    const it = desk.pick(ndc);
    const hoverable = it && it.kind !== 'deco' ? it : null;
    desk.setHover(hoverable);
    document.body.style.cursor = hoverable ? 'pointer' : '';
  }

  function pointerDown(ndc) {
    downItem = open || busy ? null : desk.pick(ndc);
    longPressed = false;
    clearTimeout(pressTimer);
    if (downItem?.kind === 'mug') {
      pressTimer = setTimeout(() => {
        longPressed = true;
        toggleSound();
      }, LONG_PRESS_MS);
    }
  }

  function pointerUp(ndc) {
    clearTimeout(pressTimer);
    if (busy) return;
    if (open) return closeCard();
    const it = desk.pick(ndc);
    if (!it || it !== downItem) {
      if (!it && desk.isFanned()) desk.setFan(false).then(() => {});
      return;
    }
    activate(it);
  }

  function activate(it) {
    switch (it.kind) {
      case 'polaroid':
        if (!desk.isFanned()) { sfx.sFlick?.(); desk.setFan(true); }
        else openCard(it, 'project', it.index);
        break;
      case 'mug':
        if (!longPressed) mugNote();
        break;
      case 'clock':
        sfx.sClick();
        onLeave();
        break;
      default:
        if (KIND_TO_CARD[it.kind]) openCard(it, KIND_TO_CARD[it.kind]);
    }
  }

  // ------------------------------------------------------------ cards
  async function openCard(item, type, index) {
    if (busy || open) return;
    busy = true;
    desk.setHover(null);
    document.body.style.cursor = '';
    sfx.sPaper?.();
    await desk.lift(item);

    const r = desk.screenRect(item);
    const ghost = document.createElement('div');
    ghost.className = 'card-ghost';
    ghost.dataset.flipId = 'reading-card';
    Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    layer.appendChild(ghost);

    const card = document.createElement('article');
    card.className = `card card-${type}`;
    card.dataset.flipId = 'reading-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.innerHTML = renderCard(type, index);
    layer.classList.add('active');

    const state = Flip.getState(ghost);
    ghost.remove();
    layer.appendChild(card);
    wireCard(card, type, index);

    await new Promise((res) =>
      Flip.from(state, {
        targets: card,
        duration: DUR,
        ease: 'power3.inOut',
        scale: true,
        onComplete: res,
      })
    );
    gsap.fromTo(card.querySelectorAll('.reveal'), { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.35 * (reduced ? 0.01 : 1) });

    const scroller = card.querySelector('.card-scroll');
    const lenis = scroller ? new Lenis({ wrapper: scroller, content: scroller.firstElementChild, smoothWheel: true }) : null;
    if (lenis) gsap.ticker.add(lenisTick(lenis));

    open = { item, card, lenis, type };
    card.querySelector('.card-close')?.focus({ preventScroll: true });
    busy = false;
  }

  const lenisTicks = new WeakMap();
  function lenisTick(lenis) {
    const fn = (t) => lenis.raf(t * 1000);
    lenisTicks.set(lenis, fn);
    return fn;
  }

  async function closeCard() {
    if (!open || busy) return;
    busy = true;
    const { item, card, lenis } = open;
    if (lenis) { gsap.ticker.remove(lenisTicks.get(lenis)); lenis.destroy(); }
    sfx.sTap?.();

    // Shrink back into the object's current on-screen rect.
    const r = desk.screenRect(item);
    const ghost = document.createElement('div');
    ghost.className = 'card-ghost';
    Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    layer.appendChild(ghost);
    layer.classList.remove('active');
    await new Promise((res) =>
      Flip.fit(card, ghost, { duration: DUR * 0.75, ease: 'power3.inOut', scale: true, onComplete: res })
    );
    gsap.to(card, { opacity: 0, duration: 0.12, onComplete: () => card.remove() });
    ghost.remove();
    open = null;
    await desk.putBack(item);
    busy = false;
  }

  function wireCard(card, type, index) {
    card.querySelector('.card-close')?.addEventListener('click', closeCard);
    card.addEventListener('pointerdown', (e) => e.stopPropagation());

    if (type === 'project') {
      const p = CONTENT.projects[index];
      let shot = 0;
      const img = card.querySelector('.pol-img');
      const cap = card.querySelector('.pol-caption');
      const count = card.querySelector('.pol-count');
      const show = (n) => {
        shot = (n + p.shots.length) % p.shots.length;
        img.src = p.shots[shot].src;
        cap.textContent = p.shots[shot].caption;
        count.textContent = `${shot + 1} / ${p.shots.length}`;
      };
      card.querySelector('.pol-prev').addEventListener('click', () => show(shot - 1));
      card.querySelector('.pol-next').addEventListener('click', () => show(shot + 1));
      const flipper = card.querySelector('.pol-flipper');
      let back = false;
      card.querySelectorAll('.pol-flip').forEach((b) =>
        b.addEventListener('click', () => {
          back = !back;
          sfx.sFlick?.();
          gsap.to(flipper, { rotateY: back ? 180 : 0, duration: DUR * 0.8, ease: 'power3.inOut' });
          card.querySelector('.pol-front').inert = back;
          card.querySelector('.pol-back').inert = !back;
        })
      );
      card.querySelector('.pol-back').inert = true;
    }

    if (type === 'contact') {
      const btn = card.querySelector('.copy-email');
      const stamp = card.querySelector('.stamp');
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(CONTENT.contact.email); } catch { /* insecure context */ }
        sfx.sClick();
        gsap.fromTo(stamp, { scale: 1.6, opacity: 0, rotate: -18 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.3, ease: 'back.out(3)' });
        gsap.to(stamp, { opacity: 0, delay: 1.6, duration: 0.4 });
      });
    }
  }

  // ------------------------------------------------------------ card markup
  function renderCard(type, index) {
    const close = '<button class="card-close" type="button" aria-label="Put it back">×</button>';
    const C = CONTENT;
    if (type === 'about') {
      const a = C.about;
      return `${close}
        <div class="card-scroll"><div class="spread">
          <section class="page page-left">
            <img class="reveal photo" src="${a.photo}" alt="Dithered portrait of Faisal" />
            <p class="reveal place">${esc(a.location)}</p>
            <p class="reveal badge">● ${esc(a.status)}</p>
          </section>
          <section class="page page-right">
            <h2 class="reveal">${esc(a.greeting)}</h2>
            <p class="reveal role">${esc(a.role)}</p>
            ${a.bio.map((b) => `<p class="reveal">${esc(b)}</p>`).join('')}
            <div class="reveal stickers">${a.skills.map((s, i) => `<span style="--r:${((i * 37) % 11) - 5}deg">${esc(s)}</span>`).join('')}</div>
          </section>
        </div></div>`;
    }
    if (type === 'experience') {
      return `${close}<div class="clip" aria-hidden="true"></div>
        <div class="card-scroll"><div>
          <h2 class="reveal">Experience</h2>
          ${C.experience.map((e) => `
            <section class="reveal role-block">
              <p class="kicker">${esc(e.kind)}</p>
              <h3>${esc(e.role)} <span>· ${esc(e.org)}</span></h3>
              <p>${esc(e.text)}</p>
              <ol>${e.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
            </section>`).join('')}
        </div></div>`;
    }
    if (type === 'contact') {
      const c = C.contact;
      return `${close}
        <h2 class="reveal">say hi!</h2>
        <p class="reveal">Got a project in mind? Let's build something useful.</p>
        <div class="reveal email-row">
          <button class="copy-email" type="button">${esc(c.email)} <small>tap to copy</small></button>
          <span class="stamp" aria-live="polite">COPIED</span>
        </div>
        <p class="reveal"><a href="mailto:${esc(c.email)}">open mail app →</a></p>
        <p class="reveal"><a href="${c.github.href}" target="_blank" rel="noopener">${esc(c.github.label)}</a></p>
        <p class="reveal">${esc(c.handle)} · ${esc(c.place)}</p>`;
    }
    if (type === 'resume') {
      return `${close}
        <h2 class="reveal">Resume</h2>
        <p class="reveal">The printable CV is on its way. For now, drop me a line and I'll send it over.</p>
        <p class="reveal"><a href="mailto:${esc(C.contact.email)}?subject=Resume%20request">request my resume →</a></p>`;
    }
    // project polaroid (front: dithered shots, back: details)
    const p = C.projects[index];
    return `${close}
      <div class="pol-flipper">
        <section class="pol-face pol-front">
          <div class="pol-photo">
            <img class="pol-img" src="${p.shots[0].src}" alt="${esc(p.title)} screenshot" />
            <button class="pol-prev" type="button" aria-label="Previous screenshot">‹</button>
            <button class="pol-next" type="button" aria-label="Next screenshot">›</button>
          </div>
          <p class="pol-title">${esc(p.title)}</p>
          <p class="pol-caption">${esc(p.shots[0].caption)}</p>
          <div class="pol-foot"><span class="pol-count">1 / ${p.shots.length}</span><button class="pol-flip" type="button">flip ↻</button></div>
        </section>
        <section class="pol-face pol-back">
          <div class="card-scroll"><div>
            <p class="kicker">${esc(p.tag)} · ${esc(p.role)}</p>
            <h2>${esc(p.title)}</h2>
            <p>${esc(p.summary)}</p>
            <div class="stats">${p.stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
            <ol>${p.contributions.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
            <div class="stickers">${p.tech.map((t, i) => `<span style="--r:${((i * 37) % 11) - 5}deg">${esc(t)}</span>`).join('')}</div>
          </div></div>
          <div class="pol-foot"><span></span><button class="pol-flip" type="button">flip ↻</button></div>
        </section>
      </div>`;
  }

  // ------------------------------------------------------------ mug
  let noteTimer = null;
  function mugNote() {
    desk.puff();
    sfx.sClick();
    const pt = desk.screenPoint(desk.mug, 0.55);
    note.innerHTML = `☕ <b>Available for work!</b><br><a href="mailto:${CONTENT.contact.email}">${CONTENT.contact.email}</a><small>hold the mug to ${sfx.isMuted() ? 'unmute' : 'mute'}</small>`;
    note.hidden = false;
    const w = note.offsetWidth;
    note.style.left = Math.min(window.innerWidth - w - 10, Math.max(10, pt.x - w / 2)) + 'px';
    note.style.top = Math.max(10, pt.y - note.offsetHeight - 10) + 'px';
    gsap.fromTo(note, { y: 8, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
    clearTimeout(noteTimer);
    noteTimer = setTimeout(hideNote, 3600);
  }
  function hideNote() {
    gsap.to(note, { opacity: 0, duration: 0.25, onComplete: () => (note.hidden = true) });
  }

  function toggleSound() {
    const m = !sfx.isMuted();
    sfx.setMuted(m);
    desk.setSteam(!m);
    document.dispatchEvent(new CustomEvent('mute-change', { detail: m }));
    note.innerHTML = m ? '🔇 sound off <small>(hold again to turn on)</small>' : '🔊 sound on';
    note.hidden = false;
    const pt = desk.screenPoint(desk.mug, 0.55);
    note.style.left = Math.max(10, pt.x - note.offsetWidth / 2) + 'px';
    note.style.top = Math.max(10, pt.y - note.offsetHeight - 10) + 'px';
    gsap.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    clearTimeout(noteTimer);
    noteTimer = setTimeout(hideNote, 1800);
  }

  // ------------------------------------------------------------ keyboard nav (hidden until focused)
  document.querySelectorAll('#desk-nav [data-open]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!document.body.classList.contains('inside') || busy) return;
      const kind = b.dataset.open;
      if (kind === 'leave') return onLeave();
      if (kind === 'project') {
        const it = desk.itemFor('polaroid', Number(b.dataset.index));
        desk.setFan(true).then(() => openCard(it, 'project', it.index));
        return;
      }
      const it = desk.itemFor(kind);
      if (kind === 'mug') return mugNote();
      openCard(it, KIND_TO_CARD[kind]);
    })
  );

  return {
    pointerMove,
    pointerDown,
    pointerUp,
    isOpen: () => !!open,
    closeCard,
    async closeAll() {
      if (open) await closeCard();
      if (desk.isFanned()) await desk.setFan(false);
      hideNote();
    },
  };
}
