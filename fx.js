/* One-time signal event, adapted from The Transmission Hypothesis "scrambled
   signal" effect (SVG turbulence displacement + RGB channel split).

   Timeline, randomized per page load, runs once and never again:
   1. Burst: somewhere in the first ~7.5s, a short stutter of wave/RGB flickers.
   2. Event: 10-15s after the burst, the wave climbs, the page tears apart and
      decomposes, the image behind it flickers through and holds ~3s, then it all
      reverses and re-locks with Transmission's overshoot ring.

   Testing: add ?fx=now (burst at 0.5s, event 3s later) or ?fx=big (event at 1.5s). */
(() => {
  'use strict';

  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const reveal = $('reveal');
  const waveNoise = $('fxWaveNoise');
  const wave = $('fxWave');
  const sliceNoise = $('fxSliceNoise');
  const slice = $('fxSlice');
  const redOff = $('fxRed');
  const blueOff = $('fxBlue');
  const rotNoise = $('fxRotNoise');
  const rotMask = $('fxRotMask');
  if (!app || !reveal || !wave) return;

  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => t * t * (3 - 2 * t);

  // Wave sizes from Transmission (baseFrequency; lower = larger waves).
  const WAVE_SIZES = {
    tight: [[0.015, 0.025], [0.004, 0.008]],
    medium: [[0.006, 0.012], [0.0015, 0.003]],
    large: [[0.002, 0.005], [0.0005, 0.0015]],
    massive: [[0.0008, 0.002], [0.0002, 0.0006]]
  };
  const MASK_REST = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1';

  function waveConfig(sizes) {
    const [fx, fy] = WAVE_SIZES[pick(sizes)];
    return {
      freqX: R(fx[0], fx[1]),
      freqY: R(fy[0], fy[1]),
      octaves: Math.floor(R(1, 3)),
      speed: R(0.6, 2.5) * (Math.random() < 0.5 ? -1 : 1),
      chroma: R(18, 70),
      angle: Math.random() * Math.PI * 2
    };
  }

  let seed = Math.random() * 1000;
  let sliceSeed = Math.random() * 1000;

  // Push one frame of parameters into the filter.
  function apply(cfg, { intensity = 0, sliceAmt = 0, dissolve = 0, revealOpacity = 0, ref = 1 }) {
    seed += cfg.speed;
    sliceSeed += cfg.speed * 0.6;
    waveNoise.setAttribute('numOctaves', cfg.octaves);
    waveNoise.setAttribute('baseFrequency', `${cfg.freqX} ${cfg.freqY}`);
    if (intensity !== 0) waveNoise.setAttribute('seed', Math.floor(seed));
    wave.setAttribute('scale', intensity.toFixed(1));

    const c = cfg.chroma * (intensity / ref);
    const rx = Math.cos(cfg.angle) * c;
    const ry = Math.sin(cfg.angle) * c;
    redOff.setAttribute('dx', rx.toFixed(1));
    redOff.setAttribute('dy', ry.toFixed(1));
    blueOff.setAttribute('dx', (-rx).toFixed(1));
    blueOff.setAttribute('dy', (-ry).toFixed(1));

    if (sliceAmt > 0) sliceNoise.setAttribute('seed', Math.floor(sliceSeed));
    slice.setAttribute('scale', sliceAmt.toFixed(1));

    // Decomposition: noise-thresholded alpha eats the page away in torn bands.
    if (dissolve <= 0) {
      rotMask.setAttribute('values', MASK_REST);
    } else {
      const thr = -0.05 + dissolve * 1.1;
      rotMask.setAttribute('values', `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  24 0 0 0 ${(-24 * thr).toFixed(2)}`);
      if (Math.random() < 0.25) rotNoise.setAttribute('seed', Math.floor(R(0, 999)));
    }

    reveal.style.opacity = revealOpacity.toFixed(3);
  }

  // While the effect runs, the page is pinned to the viewport (scrolled to where
  // the reader was), so the filter only processes what's on screen, not the
  // whole page.
  const root = document.documentElement;
  const syncScroll = () => { app.scrollTop = window.scrollY; };

  function start() {
    rotMask.setAttribute('values', MASK_REST);
    const y = window.scrollY;
    root.classList.add('fx-running');   // reveal joins the page first, so the scroll isn't clamped
    // Line the image up with the reader: the body of the spire (about 45% down
    // the image) lands mid-screen. They can scroll up or down for the rest.
    const imgH = reveal.offsetHeight;
    reveal.style.top = `${Math.max(0, y + window.innerHeight / 2 - imgH * 0.45)}px`;
    app.classList.add('fx-on');
    window.scrollTo(0, y);
    app.scrollTop = y;
    window.addEventListener('scroll', syncScroll, { passive: true });
  }

  function stop() {
    window.removeEventListener('scroll', syncScroll);
    const y = app.scrollTop;
    app.classList.remove('fx-on');
    root.classList.remove('fx-running');
    window.scrollTo(0, y);
    wave.setAttribute('scale', '0');
    slice.setAttribute('scale', '0');
    for (const el of [redOff, blueOff]) { el.setAttribute('dx', '0'); el.setAttribute('dy', '0'); }
    rotMask.setAttribute('values', MASK_REST);
    reveal.style.opacity = '0';
  }

  // Run a timeline function frame by frame until it reports done.
  function run(frame, onDone) {
    const t0 = performance.now();
    start();
    const tick = (now) => {
      const params = frame(now - t0);
      if (!params) { stop(); if (onDone) onDone(); return; }
      apply(params.cfg, params);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 1. the burst ---------- */

  function burst(onDone) {
    const cfg = waveConfig(['tight', 'medium', 'large']);
    const peak = R(60, 150);
    const pulses = [];
    let t = 0;
    const count = Math.floor(R(2, 5));
    for (let i = 0; i < count; i++) {
      const len = R(70, 260);
      pulses.push({ at: t, len, amp: R(0.45, 1) });
      t += len + R(30, 220);
    }
    const total = t;

    run((ms) => {
      if (ms >= total) return null;
      let k = 0;
      for (const p of pulses) {
        const local = (ms - p.at) / p.len;
        if (local >= 0 && local <= 1) k = Math.max(k, p.amp * (local < 0.2 ? local / 0.2 : Math.pow(1 - (local - 0.2) / 0.8, 0.6)));
      }
      const stutter = Math.random() < 0.15 ? R(0, 0.3) : 1;
      return { cfg, intensity: peak * k * stutter, ref: peak };
    }, onDone);
  }

  /* ---------- 2. the event ---------- */

  function event() {
    const cfg = waveConfig(['large', 'massive', 'medium']);
    const d = {
      ramp: R(1400, 2200),
      deep: R(900, 1400),
      hold: R(2800, 3300),
      recompose: R(1600, 2200),
      resolve: R(900, 1300)
    };
    const t1 = d.ramp;
    const t2 = t1 + d.deep;
    const t3 = t2 + d.hold;
    const t4 = t3 + d.recompose;
    const t5 = t4 + d.resolve;
    const deepScale = R(380, 520);
    const ref = deepScale;
    let resolveBase = null;

    run((ms) => {
      if (ms >= t5) return null;
      const stutter = Math.random() < 0.15 ? R(0, 0.35) : 1;

      if (ms < t1) {
        // Wave climbs; the image starts flickering through in stray frames.
        const p = ms / t1;
        const intensity = (30 + (deepScale * 0.55 - 30) * ease(p)) * stutter;
        const show = Math.random() < 0.08 + p * 0.25;
        return { cfg, ref, intensity, sliceAmt: 40 * p, revealOpacity: show ? R(0.12, 0.5) * p : 0 };
      }
      if (ms < t2) {
        // Deep distortion; the page starts to decompose, the image surges.
        const p = (ms - t1) / d.deep;
        const intensity = (deepScale * (0.55 + 0.45 * ease(p))) * stutter;
        const flick = Math.random() < 0.18 ? R(0.3, 0.7) : 1;
        return { cfg, ref, intensity, sliceAmt: 40 + 140 * p, dissolve: ease(p), revealOpacity: clamp01((0.45 + 0.55 * p) * flick) };
      }
      if (ms < t3) {
        // The page is gone; the image holds, still flickering, with stray fragments of the page.
        const flick = Math.random() < 0.06 ? R(0.55, 0.85) : 1;
        const ghost = Math.random() < 0.04 ? R(0.7, 0.85) : 1;
        return { cfg, ref, intensity: deepScale * R(0.85, 1.1), sliceAmt: 180, dissolve: ghost, revealOpacity: flick };
      }
      if (ms < t4) {
        // Recompose: the page comes back through the wave, the image flickers out.
        const p = (ms - t3) / d.recompose;
        const flick = Math.random() < 0.2 ? R(0, 0.5) : 1;
        return {
          cfg, ref,
          intensity: (deepScale - (deepScale - 120) * ease(p)) * stutter,
          sliceAmt: 180 * (1 - p),
          dissolve: 1 - ease(p),
          revealOpacity: clamp01((1 - ease(p)) * flick)
        };
      }
      // Re-lock: Transmission's damped overshoot ring back to a clean page.
      const rp = (ms - t4) / d.resolve;
      if (resolveBase === null) resolveBase = 120;
      return { cfg, ref, intensity: resolveBase * Math.exp(-4.2 * rp) * Math.cos(rp * Math.PI * 2.2) };
    });
  }

  /* ---------- schedule (once) ---------- */

  const mode = new URLSearchParams(location.search).get('fx');
  if (mode === 'big') {
    setTimeout(event, 1500);
  } else {
    const burstAt = mode === 'now' ? 500 : R(1500, 7500);
    const gap = mode === 'now' ? 3000 : R(10000, 15000);
    setTimeout(() => burst(() => setTimeout(event, gap)), burstAt);
  }
})();
