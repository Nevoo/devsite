#!/usr/bin/env node
/**
 * devsite measurement harness — Wave 0, lane γ (PLAN-POLISH.md §"Wave 0").
 *
 *   node scripts/audit.mjs --label baseline
 *
 * Builds `dist/` if it is missing, serves it from a throwaway node server with
 * SPA fallback, drives its own headless Chrome over raw CDP, and writes one
 * JSON per run to scripts/audit-out/. No npm dependencies, no test framework,
 * no attaching to the browser you happen to have open.
 *
 * What it measures — see the README block at the bottom of PLAN-POLISH-BASELINE.md.
 *
 * Four things this script knows that cost real time to learn:
 *
 * 1. READINESS. There is no global "page settled" flag. `--ink` is not it: it
 *    is set on the home page's `.process` section only (Home.tsx:187), it never
 *    reaches :root, and it stays unset on /work, /about, /contact. The reliable
 *    signal on every route is the LoadingScreen veil, which is never removed
 *    from the DOM — it is display:none'd after its fade (LoadingScreen.tsx:71).
 *    So: computed display of `.loading-screen` === 'none' AND document.fonts
 *    settled. Gating on the element's *absence* never fires.
 * 2. --disable-gpu leaves every WebGL surface empty. ANGLE + SwiftShader
 *    renders for real (see cdp.mjs).
 * 3. prefers-reduced-motion is forced to no-preference on every session anyway.
 *    Current Chrome headless reports no-preference by default, but older builds
 *    reported `reduce`, which silently deletes every animation on this site.
 * 4. This is a PRODUCTION build, so `window.gsap` does not exist (gsap.ts:11
 *    only exposes it in DEV). Transition phases are therefore read off the DOM:
 *    an rAF sampler on the computed transform of `.page-transition-accent` /
 *    `.page-transition-base`, plus a patched history.pushState for the route
 *    commit and a capture-phase click listener for the true t0.
 */
import { mkdirSync, existsSync, writeFileSync, copyFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CDP, launchChrome, startStaticServer, evaluate, sleep } from './cdp.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const DIST = join(ROOT, 'dist')
const OUT_DIR = join(HERE, 'audit-out')

/* ---------------------------------------------------------------- matrix */

const ROUTES = ['/', '/work', '/work/nature', '/about', '/contact']

const VIEWPORTS = [
  { label: '1440x900', width: 1440, height: 900, dsf: 1, mobile: false, touch: false },
  { label: '390x844', width: 390, height: 844, dsf: 2, mobile: true, touch: true },
  { label: '320x568', width: 320, height: 568, dsf: 2, mobile: true, touch: true },
]

/** Slow 4G, the Lighthouse profile. */
const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
}
const CPU_THROTTLE = 4

const TRANSITION_CLICKS = 10
const MEMORY_CLICKS = 20
/** generous on purpose: / under Slow 4G takes ~45s to lift its veil */
const SETTLE_TIMEOUT_MS = 90000
/** quiet time after the veil lifts before anything is measured */
const POST_SETTLE_MS = 2000

/* ------------------------------------------------------- page instrument */

/**
 * Installed with Page.addScriptToEvaluateOnNewDocument, so the observers are
 * buffered from the first paint and history is patched before react-router
 * ever calls it.
 */
const INSTRUMENT = String.raw`
(() => {
  const A = (window.__audit = {
    lcp: 0, lcpEl: '', cls: 0, shifts: 0, longest: 0, tasks: 0,
    nav: [], clicks: [], errors: [], consoleErrors: 0,
  });

  const obs = (type, cb) => {
    try { new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type, buffered: true }) }
    catch (e) {}
  };

  const describe = (el) => {
    if (!el || !el.tagName) return '';
    let s = el.tagName.toLowerCase();
    const cls = typeof el.className === 'string' ? el.className.trim() : '';
    if (cls) s += '.' + cls.split(/\s+/).slice(0, 3).join('.');
    return s;
  };

  /** stable-ish structural path, used as the identity of a metric across runs */
  const path = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 5 && node !== document.body) {
      let s = node.tagName.toLowerCase();
      const cls = typeof node.className === 'string' ? node.className.trim() : '';
      if (cls) s += '.' + cls.split(/\s+/).slice(0, 2).join('.');
      const parent = node.parentElement;
      if (parent) {
        const sibs = Array.prototype.filter.call(parent.children, (c) => c.tagName === node.tagName);
        if (sibs.length > 1) s += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')';
      }
      parts.unshift(s);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };
  window.__path = path;

  obs('largest-contentful-paint', (e) => {
    if (e.startTime >= A.lcp) { A.lcp = e.startTime; A.lcpEl = describe(e.element) || e.url || ''; }
  });
  obs('layout-shift', (e) => { if (!e.hadRecentInput) { A.cls += e.value; A.shifts++; } });
  obs('longtask', (e) => { A.tasks++; if (e.duration > A.longest) A.longest = e.duration; });

  for (const name of ['pushState', 'replaceState']) {
    const orig = history[name];
    history[name] = function (s, t, u) {
      A.nav.push({ type: name, t: performance.now(), url: String(u) });
      return orig.apply(this, arguments);
    };
  }
  addEventListener('popstate', () => A.nav.push({ type: 'popstate', t: performance.now(), url: location.pathname }));
  addEventListener('click', (e) => A.clicks.push({ t: performance.now(), trusted: e.isTrusted, target: describe(e.target) }), true);
  addEventListener('error', (e) => { if (A.errors.length < 10) A.errors.push(String(e.message || e.type)); }, true);

  /* Liveness counter. Everything the transition storyboard does is driven by
     requestAnimationFrame, so if this stops advancing the page is wedged and
     no amount of waiting will commit a route. Reading it from the harness is
     the difference between "the click was dropped" and "the page is frozen". */
  A.rafTicks = 0;
  const spin = () => { A.rafTicks++; requestAnimationFrame(spin); };
  requestAnimationFrame(spin);

  window.__diag = () => ({
    path: location.pathname,
    rafTicks: A.rafTicks,
    idle: window.__wipeIdle(),
    hidden: document.hidden,
    visibility: document.visibilityState,
    lightbox: !!document.querySelector('.lightbox'),
    hasH1: !!document.querySelector('main h1'),
  });

  /* ---- readiness -------------------------------------------------- */

  window.__ready = () => {
    const veil = document.querySelector('.loading-screen');
    const cs = veil && getComputedStyle(veil);
    return {
      veilHidden: !veil || cs.display === 'none' || parseFloat(cs.opacity) === 0,
      fonts: document.fonts ? document.fonts.status : 'n/a',
      hasH1: !!document.querySelector('main h1'),
      path: location.pathname,
    };
  };

  /* ---- wipe sampler ----------------------------------------------- */

  const yPct = (el) => {
    if (!el) return null;
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
    const ty = m.length === 6 ? m[5] : m[13];
    const h = el.offsetHeight || 1;
    return Math.round((ty / h) * 1000) / 10;
  };

  window.__wipeStart = () => {
    const overlay = document.getElementById('page-transition');
    const accent = overlay && overlay.querySelector('.page-transition-accent');
    const face = overlay && overlay.querySelector('.page-transition-base');
    const S = (window.__wipe = {
      t0: performance.now(), samples: [], running: true,
      navFrom: A.nav.length, clickFrom: A.clicks.length,
    });
    let last = null;
    const tick = () => {
      if (!S.running) return;
      const a = yPct(accent), f = yPct(face);
      const pe = overlay ? getComputedStyle(overlay).pointerEvents : '';
      if (!last || Math.abs(a - last.a) > 0.3 || Math.abs(f - last.f) > 0.3 || pe !== last.pe) {
        last = { t: performance.now(), a, f, pe };
        S.samples.push(last);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return S.t0;
  };

  window.__wipeStop = () => {
    const S = window.__wipe || { samples: [], navFrom: 0, clickFrom: 0 };
    S.running = false;
    return { samples: S.samples, nav: A.nav.slice(S.navFrom), clicks: A.clicks.slice(S.clickFrom) };
  };

  /** resolves (page clock) once the path is committed, its h1 exists and 2 rAFs have passed */
  window.__settle = (path) =>
    new Promise((res) => {
      const t0 = performance.now();
      const check = () => {
        if (location.pathname === path && document.querySelector('main h1')) {
          requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now())));
        } else if (performance.now() - t0 > 9000) res(-1);
        else requestAnimationFrame(check);
      };
      check();
    });

  /* ---- sweeps ------------------------------------------------------ */

  const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, summary, [tabindex]';

  window.__collect = () => {
    window.__els = [];
    const out = [];
    for (const el of document.querySelectorAll(INTERACTIVE)) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 && r.height < 1) continue;
      window.__els.push(el);
      out.push({
        selector: path(el),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        fontSize: Math.round(parseFloat(cs.fontSize) * 100) / 100,
        restOutline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
        restShadow: cs.boxShadow,
        opacity: parseFloat(cs.opacity),
        tabindex: el.getAttribute('tabindex'),
        tabOrder: -1,
        focusRing: false,
        focusOutline: '',
        focusShadow: '',
      });
    }
    return out;
  };

  window.__focusInfo = () => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return { i: -1, tag: '' };
    const i = window.__els ? window.__els.indexOf(el) : -1;
    const cs = getComputedStyle(el);
    return {
      i,
      tag: describe(el),
      outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
      shadow: cs.boxShadow,
    };
  };

  /**
   * A point inside the element that is actually inside the viewport, because a
   * synthesised mouse event at y=1300 on a 900px viewport hits nothing at all.
   * Gallery cards are taller than the screen, so this uses the centre of the
   * element-viewport intersection and only scrolls when there isn't one.
   */
  window.__pointFor = (sel, allowScroll) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const vw = innerWidth, vh = innerHeight;
    const inter = (r) => ({
      left: Math.max(r.left, 0), top: Math.max(r.top, 0),
      right: Math.min(r.right, vw), bottom: Math.min(r.bottom, vh),
    });
    let r = el.getBoundingClientRect();
    let i = inter(r);
    if ((i.right - i.left < 4 || i.bottom - i.top < 4) && allowScroll) {
      scrollTo(0, Math.max(0, scrollY + r.top - vh / 2 + Math.min(r.height, vh) / 2));
      r = el.getBoundingClientRect();
      i = inter(r);
    }
    if (i.right - i.left < 2 || i.bottom - i.top < 2) return { x: null, y: null, offscreen: true, w: r.width, h: r.height };
    const x = Math.round((i.left + i.right) / 2);
    const y = Math.round((i.top + i.bottom) / 2);
    const hit = document.elementFromPoint(x, y);
    return {
      x, y, w: r.width, h: r.height, offscreen: false,
      hitsTarget: !!hit && (hit === el || el.contains(hit)),
      hit: hit ? describe(hit) : '',
      cursorTarget: hit && hit.closest('[data-cursor]') ? hit.closest('[data-cursor]').getAttribute('data-cursor') : null,
    };
  };

  /**
   * The overlay owns pointer-events for exactly the length of a transition
   * (set on the first tick, cleared in the finally block), which makes it the
   * only observable "a wipe is in flight" flag in a production build. Clicking
   * during one is silently dropped by the module-level transitioning guard.
   */
  window.__wipeIdle = () => {
    const o = document.getElementById('page-transition');
    return !o || getComputedStyle(o).pointerEvents === 'none';
  };

  window.__blurAll = () => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.scrollTo(0, 0); };

  window.__minFont = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Map();
    let min = Infinity;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.nodeValue || !n.nodeValue.trim()) continue;
      const p = n.parentElement;
      if (!p) continue;
      if (p.closest('.loading-screen, .page-transition, [aria-hidden="true"] .visually-hidden')) continue;
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
      const r = p.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const fs = Math.round(parseFloat(cs.fontSize) * 100) / 100;
      if (fs < min) min = fs;
      const key = path(p) + '@' + fs;
      if (!seen.has(key)) seen.set(key, { selector: path(p), fontSize: fs, sample: n.nodeValue.trim().slice(0, 32) });
    }
    const all = [...seen.values()].sort((a, b) => a.fontSize - b.fontSize);
    return {
      min: min === Infinity ? null : min,
      below14: all.filter((e) => e.fontSize < 14),
      smallest: all.slice(0, 8),
      distinctSizes: [...new Set(all.map((e) => e.fontSize))].sort((a, b) => a - b),
    };
  };

  window.__overflow = () => {
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.loading-screen, .page-transition')) continue;
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
        const cs = getComputedStyle(el);
        bad.push({
          selector: path(el),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          over: el.scrollWidth - el.clientWidth,
          overflowX: cs.overflowX,
          intentional: cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden',
        });
      }
    }
    bad.sort((a, b) => b.over - a.over);
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      documentOverflows: document.documentElement.scrollWidth > window.innerWidth + 1,
      count: bad.length,
      unintentionalCount: bad.filter((b) => !b.intentional).length,
      elements: bad.slice(0, 15),
    };
  };

  window.__geometry = () => ({
    scrollHeight: document.documentElement.scrollHeight,
    bodyScrollHeight: document.body.scrollHeight,
    viewports: Math.round((document.documentElement.scrollHeight / window.innerHeight) * 100) / 100,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  });

  window.__media = () => ({
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    pointerFine: matchMedia('(pointer: fine)').matches,
    pointerCoarse: matchMedia('(pointer: coarse)').matches,
    hover: matchMedia('(hover: hover)').matches,
    noWebGL: document.body.classList.contains('no-webgl'),
    dpr: devicePixelRatio,
  });

  window.__cursorState = () => {
    const el = document.querySelector('.cursor');
    if (!el) return { present: false };
    const cs = getComputedStyle(el);
    return {
      present: true,
      display: cs.display,
      mode: el.dataset.mode ?? null,
      label: (el.querySelector('.cursor-label')?.textContent ?? '').trim(),
      opacity: parseFloat(cs.opacity),
    };
  };
})();
`

/* ------------------------------------------------------------- utilities */

const round = (n, d = 1) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** d) / 10 ** d)
const median = (xs) => {
  const a = xs.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((x, y) => x - y)
  if (!a.length) return null
  const m = a.length >> 1
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}

const log = (...m) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m)

/* ------------------------------------------------------------- page setup */

/**
 * Fresh target per measurement so nothing (heap, caches, ScrollTrigger state)
 * leaks between routes. `media` overrides go on before the first navigation.
 */
async function newPage(cdp, { viewport, throttle, reducedMotion = false, cacheDisabled = true }) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })

  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Network.enable', {}, sessionId)
  await cdp.send('HeapProfiler.enable', {}, sessionId)
  await cdp.send('Page.setLifecycleEventsEnabled', { enabled: true }, sessionId)

  await cdp.send(
    'Emulation.setEmulatedMedia',
    {
      features: [
        { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
        { name: 'prefers-color-scheme', value: 'dark' },
      ],
    },
    sessionId
  )
  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.dsf,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    },
    sessionId
  )
  await cdp.send(
    'Emulation.setTouchEmulationEnabled',
    { enabled: !!viewport.touch, maxTouchPoints: viewport.touch ? 5 : 1 },
    sessionId
  )
  await cdp.send('Network.setCacheDisabled', { cacheDisabled }, sessionId)
  await cdp.send(
    'Network.emulateNetworkConditions',
    throttle ? SLOW_4G : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
    sessionId
  )
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle ? CPU_THROTTLE : 1 }, sessionId)
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT }, sessionId)
  // a target that isn't foreground gets its rAF throttled, which stalls the
  // GSAP ticker mid-transition and silently wedges the `transitioning` guard
  await cdp.send('Page.bringToFront', {}, sessionId).catch(() => {})

  const errors = []
  const off = cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text)
    }
  })

  return {
    sessionId,
    targetId,
    errors,
    close: async () => {
      off()
      await cdp.send('Target.closeTarget', { targetId }).catch(() => {})
    },
  }
}

/** Navigate and block until the veil is down, the fonts are in and the h1 exists. */
async function loadRoute(cdp, page, url, path) {
  const t0 = Date.now()
  await cdp.send('Page.navigate', { url }, page.sessionId)
  let ready = null
  let timedOut = true
  while (Date.now() - t0 < SETTLE_TIMEOUT_MS) {
    await sleep(100)
    try {
      ready = await evaluate(cdp, page.sessionId, () => (window.__ready ? window.__ready() : null))
    } catch {
      continue
    }
    if (ready && ready.veilHidden && ready.fonts !== 'loading' && ready.hasH1 && ready.path === path) {
      timedOut = false
      break
    }
  }
  return { settleMs: Date.now() - t0, timedOut, ready }
}

async function heapUsed(cdp, sessionId) {
  await cdp.send('HeapProfiler.collectGarbage', {}, sessionId).catch(() => {})
  await sleep(120)
  const r = await cdp.send('Runtime.getHeapUsage', {}, sessionId)
  return Math.round(r.usedSize / 1024)
}

/* --------------------------------------------------------------- clicking */

/** Real trusted mouse click on a point that is genuinely inside the viewport. */
async function clickSelector(cdp, sessionId, selector, { scroll = false } = {}) {
  const box = await evaluate(cdp, sessionId, (sel, s) => window.__pointFor(sel, s), selector, scroll)
  if (!box || box.offscreen) throw new Error(`no clickable point for ${selector}`)
  const common = { x: box.x, y: box.y, button: 'left', clickCount: 1, buttons: 1 }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...common, buttons: 0 }, sessionId)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...common }, sessionId)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...common, buttons: 0 }, sessionId)
  return box
}

/** Trusted pointer move onto an element — the only thing Cursor.tsx listens to. */
async function moveMouseTo(cdp, sessionId, selector, { scroll = true } = {}) {
  const box = await evaluate(cdp, sessionId, (sel, s) => window.__pointFor(sel, s), selector, scroll)
  if (!box) throw new Error(`no element for ${selector}`)
  if (box.offscreen) throw new Error(`${selector} is outside the viewport`)
  // two moves: some handlers only react to a delta, and the first move after a
  // route change can land before the destination has finished mounting
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x - 2, y: box.y - 2, buttons: 0 }, sessionId)
  await sleep(60)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, buttons: 0 }, sessionId)
  await sleep(160)
  return box
}

/** Blocks until no wipe is in flight, so a click can't be eaten by the guard. */
async function waitIdle(cdp, sessionId, timeout = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (await evaluate(cdp, sessionId, () => window.__wipeIdle())) return true
    await sleep(100)
  }
  return false
}

/**
 * Node-side settle poll. `window.__settle` is driven by rAF and gives an exact
 * page-clock timestamp, which the transition probe needs — but it hangs
 * forever if rAF stalls, and an awaitPromise evaluate hangs with it. Anywhere
 * the timestamp is not the measurement, poll from here instead.
 */
async function pollUntilRoute(cdp, sessionId, to, timeout = 12000) {
  const t0 = Date.now()
  let last = null
  while (Date.now() - t0 < timeout) {
    last = await evaluate(cdp, sessionId, () => window.__diag())
    if (last.path === to && last.hasH1) return { ok: true, ms: Date.now() - t0, diag: last }
    await sleep(100)
  }
  return { ok: false, ms: Date.now() - t0, diag: last }
}

/**
 * Navigate by calling .click() on the link rather than by moving the mouse to
 * it — the whole point of the cursor probes is that the pointer never moves.
 */
async function navigateProgrammatically(cdp, sessionId, selector, to, attempts = 3) {
  let diag = null
  for (let i = 0; i < attempts; i++) {
    await waitIdle(cdp, sessionId)
    await evaluate(cdp, sessionId, (sel) => document.querySelector(sel).click(), selector)
    const r = await pollUntilRoute(cdp, sessionId, to)
    diag = r.diag
    await sleep(1200) // the reveal runs on past the route commit
    await waitIdle(cdp, sessionId)
    if (r.ok) return r.ms
  }
  throw new Error(
    `click on ${selector} never committed ${to} after ${attempts} attempts — ${JSON.stringify(diag)}`
  )
}

async function pressKey(cdp, sessionId, key, code, vk) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sessionId)
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }, sessionId)
}

/* ------------------------------------------------- transition phase maths */

/**
 * Turns one rAF sample series into the phase durations the plan asks for.
 * `a` is the orange underprint (leads, COVER.underprint.at = 0), `f` the
 * charcoal face. Resting yPercent is +100 (below the fold), covering is 0,
 * lifted is -100.
 *
 * Two markers are exact rather than threshold-based, and they are the ones the
 * gate should be read off: `pointer-events` flips to `all` on the first tick of
 * the cover timeline (TransitionLink.tsx:101) and back to `none` in the
 * `finally` block the instant the reveal timeline resolves (:165). Everything
 * derived from a transform threshold carries the easing's dead zone with it —
 * COVER uses power4.in, so the sheet has moved less than 0.5% of the viewport
 * for the first ~140ms of its own tween. `clickToCoverPaintMs` is therefore
 * "first perceptible movement", not "timeline start"; `clickToWipeStartMs` is
 * the timeline start.
 */
function phasesFrom(samples, nav, clicks, targetPath, settledAt) {
  const click = clicks.find((c) => c.trusted) ?? clicks[0]
  const t0 = click?.t
  if (t0 == null) return { error: 'no click recorded' }
  const after = samples.filter((s) => s.t >= t0 - 5)
  const wipeStart = after.find((s) => s.pe === 'all')
  const wipeEnd = wipeStart ? after.find((s) => s.t > wipeStart.t && s.pe !== 'all') : null
  const firstMove = after.find((s) => s.a < 99.5 || s.f < 99.5)
  const coverComplete = after.find((s) => s.f <= 0.6)
  const commit = nav.find((n) => n.t >= t0 && String(n.url).endsWith(targetPath))
  const liftStart = coverComplete ? after.find((s) => s.t > coverComplete.t + 30 && s.f < -0.6) : null
  let revealMotionEnd = null
  for (const s of after) {
    if (s.f < -50) revealMotionEnd = s
    else if (revealMotionEnd && s.f > 50) break
  }
  const end = wipeEnd ?? revealMotionEnd
  return {
    wiped: !!firstMove,
    clickToWipeStartMs: wipeStart ? round(wipeStart.t - t0) : null,
    clickToCoverPaintMs: firstMove ? round(firstMove.t - t0) : null,
    clickToCoverCompleteMs: coverComplete ? round(coverComplete.t - t0) : null,
    coverCompleteToCommitMs: coverComplete && commit ? round(commit.t - coverComplete.t) : null,
    commitToRevealEndMs: commit && end ? round(end.t - commit.t) : null,
    revealMotionEndMs: revealMotionEnd ? round(revealMotionEnd.t - t0) : null,
    maskedMs: coverComplete && liftStart ? round(liftStart.t - coverComplete.t) : null,
    totalMs: end ? round(end.t - t0) : null,
    commitAtMs: commit ? round(commit.t - t0) : null,
    settleFromClickMs: settledAt > 0 ? round(settledAt - t0) : null,
    samples: after.length,
  }
}

/* ------------------------------------------------------------------ phases */

/** Phase 1 — throttled (CPU 4x + Slow 4G) cold load metrics per route × viewport. */
async function phaseLoadMetrics(cdp, origin, routes) {
  const results = {}
  for (const vp of VIEWPORTS) {
    for (const route of routes) {
      const key = `${route}|${vp.label}`
      const page = await newPage(cdp, { viewport: vp, throttle: true })
      try {
        const { settleMs, timedOut } = await loadRoute(cdp, page, origin + route, route)
        await sleep(POST_SETTLE_MS)
        const a = await evaluate(cdp, page.sessionId, () => ({
          ...window.__audit,
          nav: undefined,
          clicks: undefined,
          geometry: window.__geometry(),
          media: window.__media(),
        }))
        const heapKb = await heapUsed(cdp, page.sessionId)
        results[key] = {
          route,
          viewport: vp.label,
          throttled: true,
          settleMs,
          settleTimedOut: timedOut,
          scrollHeight: a.geometry.scrollHeight,
          viewportsTall: a.geometry.viewports,
          lcpMs: round(a.lcp),
          lcpElement: a.lcpEl,
          cls: round(a.cls, 4),
          layoutShifts: a.shifts,
          longestTaskMs: round(a.longest),
          longTasks: a.tasks,
          heapKb,
          pageErrors: page.errors.length,
          errorSample: page.errors.slice(0, 3),
          media: a.media,
        }
        log(
          `load ${key}: h=${a.geometry.scrollHeight} lcp=${round(a.lcp)}ms cls=${round(a.cls, 4)} longest=${round(a.longest)}ms heap=${heapKb}kb settle=${settleMs}ms`
        )
      } catch (e) {
        results[key] = { route, viewport: vp.label, error: String(e.message) }
        log(`load ${key}: FAILED ${e.message}`)
      } finally {
        await page.close()
      }
    }
  }
  return results
}

/** Phase 2 — unthrottled geometry / type / focus / overflow sweeps. */
async function phaseSweeps(cdp, origin, routes) {
  const results = {}
  for (const vp of VIEWPORTS) {
    for (const route of routes) {
      const key = `${route}|${vp.label}`
      const page = await newPage(cdp, { viewport: vp, throttle: false })
      const s = page.sessionId
      try {
        const { settleMs, timedOut } = await loadRoute(cdp, page, origin + route, route)
        await sleep(POST_SETTLE_MS)

        const geometry = await evaluate(cdp, s, () => window.__geometry())
        const elements = await evaluate(cdp, s, () => window.__collect())

        // Tab order + focus rings: real Tab presses, so :focus-visible actually
        // matches. Programmatic .focus() does not reliably trigger it.
        await evaluate(cdp, s, () => window.__blurAll())
        const maxTabs = Math.min(elements.length + 4, 60)
        const seen = new Set()
        for (let i = 0; i < maxTabs; i++) {
          await pressKey(cdp, s, 'Tab', 'Tab', 9)
          const info = await evaluate(cdp, s, () => window.__focusInfo())
          if (info.i == null || info.i < 0) continue
          if (seen.has(info.i)) break
          seen.add(info.i)
          const el = elements[info.i]
          el.tabOrder = seen.size
          el.focusOutline = info.outline
          el.focusShadow = info.shadow
          const outlineChanged = info.outline !== el.restOutline
          const shadowChanged = info.shadow !== el.restShadow
          const hasOutline = !/^none/.test(info.outline) && parseFloat(info.outline.split(' ')[1]) > 0
          el.focusRing = (outlineChanged && hasOutline) || (shadowChanged && info.shadow !== 'none')
        }
        await evaluate(cdp, s, () => window.__blurAll())

        const fonts = await evaluate(cdp, s, () => window.__minFont())
        const overflow = await evaluate(cdp, s, () => window.__overflow())
        const media = await evaluate(cdp, s, () => window.__media())

        const small = elements.filter((e) => Math.min(e.w, e.h) < 44)
        results[key] = {
          route,
          viewport: vp.label,
          throttled: false,
          settleMs,
          settleTimedOut: timedOut,
          scrollHeight: geometry.scrollHeight,
          viewportsTall: geometry.viewports,
          media,
          interactive: {
            count: elements.length,
            tabReachable: elements.filter((e) => e.tabOrder > 0).length,
            withFocusRing: elements.filter((e) => e.focusRing).length,
            belowMinTarget44: small.length,
            minTargetPx: elements.length ? round(Math.min(...elements.map((e) => Math.min(e.w, e.h)))) : null,
            minFontSizePx: elements.length ? Math.min(...elements.map((e) => e.fontSize)) : null,
            elements,
          },
          text: fonts,
          overflow,
        }
        log(
          `sweep ${key}: els=${elements.length} <44px=${small.length} ring=${results[key].interactive.withFocusRing} minFont=${fonts.min} overflow=${overflow.unintentionalCount}/${overflow.count} doc=${overflow.documentOverflows}`
        )
      } catch (e) {
        results[key] = { route, viewport: vp.label, error: String(e.message) }
        log(`sweep ${key}: FAILED ${e.message}`)
      } finally {
        await page.close()
      }
    }
  }
  return results
}

/**
 * The route cycle used by both the transition and memory probes. Each entry is
 * a selector that exists on the page you are standing on and a destination.
 * Header links cover four of the five routes; the gallery is reached the way a
 * visitor reaches it, by clicking a work card.
 */
const CYCLE = [
  { from: '/', selector: '.site-header-nav a[href="/work"]', to: '/work' },
  { from: '/work', selector: '.work-grid a[href="/work/nature"]', to: '/work/nature' },
  { from: '/work/nature', selector: '.site-header-nav a[href="/about"]', to: '/about' },
  { from: '/about', selector: '.site-header-nav a[href="/contact"]', to: '/contact' },
  { from: '/contact', selector: '.site-header-logo', to: '/' },
]

/** Phase 3 — 10 scripted route changes, phase-timed off the overlay transform. */
async function phaseTransitions(cdp, origin, count = TRANSITION_CLICKS) {
  const vp = VIEWPORTS[0]
  const page = await newPage(cdp, { viewport: vp, throttle: false, cacheDisabled: false })
  const s = page.sessionId
  const runs = []
  try {
    await loadRoute(cdp, page, origin + '/', '/')
    await sleep(POST_SETTLE_MS)
    const heapBefore = await heapUsed(cdp, s)

    for (let i = 0; i < count; i++) {
      const step = CYCLE[i % CYCLE.length]
      let phases = null
      let retries = 0
      // a click landing inside a still-running wipe is dropped by the guard;
      // that is a harness artefact, not a measurement, so it is retried rather
      // than recorded
      for (; retries < 3 && !phases; retries++) {
        try {
          await waitIdle(cdp, s)
          await evaluate(cdp, s, () => window.scrollTo(0, 0))
          await sleep(150)
          await evaluate(cdp, s, () => window.__wipeStart())
          await clickSelector(cdp, s, step.selector)
          // page-clock settle: the transition probe is the one place the exact
          // in-page timestamp is the measurement, so it keeps the rAF promise
          const settledAt = await evaluate(cdp, s, (p) => window.__settle(p), step.to, {
            __evalTimeout: 15000,
          })
          await sleep(1400) // let the reveal finish and the overlay reset
          await waitIdle(cdp, s)
          const { samples, nav, clicks } = await evaluate(cdp, s, () => window.__wipeStop())
          const at = await evaluate(cdp, s, () => location.pathname)
          if (at === step.to) phases = phasesFrom(samples, nav, clicks, step.to, settledAt)
        } catch (e) {
          log(`transition ${i + 1} attempt ${retries + 1} failed: ${e.message}`)
        }
      }
      if (!phases) throw new Error(`transition ${i + 1} never committed ${step.to}`)
      runs.push({ index: i + 1, from: step.from, to: step.to, retries: retries - 1, ...phases })
      log(
        `transition ${i + 1} ${step.from} → ${step.to}: cover@${phases.clickToCoverPaintMs} complete@${phases.clickToCoverCompleteMs} commit+${phases.coverCompleteToCommitMs} reveal+${phases.commitToRevealEndMs} total=${phases.totalMs}`
      )
    }
    const heapAfter = await heapUsed(cdp, s)
    const pick = (k) => runs.map((r) => r[k]).filter((v) => v != null)
    return {
      viewport: vp.label,
      throttled: false,
      count,
      heapBeforeKb: heapBefore,
      heapAfterKb: heapAfter,
      heapDeltaKb: heapAfter - heapBefore,
      medians: {
        clickToWipeStartMs: round(median(pick('clickToWipeStartMs'))),
        clickToCoverPaintMs: round(median(pick('clickToCoverPaintMs'))),
        clickToCoverCompleteMs: round(median(pick('clickToCoverCompleteMs'))),
        coverCompleteToCommitMs: round(median(pick('coverCompleteToCommitMs'))),
        commitToRevealEndMs: round(median(pick('commitToRevealEndMs'))),
        maskedMs: round(median(pick('maskedMs'))),
        totalMs: round(median(pick('totalMs'))),
        settleFromClickMs: round(median(pick('settleFromClickMs'))),
      },
      minTotalMs: round(Math.min(...pick('totalMs'))),
      maxTotalMs: round(Math.max(...pick('totalMs'))),
      wipedCount: runs.filter((r) => r.wiped).length,
      retriesTotal: runs.reduce((n, r) => n + (r.retries ?? 0), 0),
      pageErrors: page.errors.length,
      errorSample: page.errors.slice(0, 3),
      runs,
    }
  } catch (e) {
    return { error: String(e.message), runs }
  } finally {
    await page.close()
  }
}

/** Phase 4 — 20 route changes, heap every 5. */
async function phaseMemory(cdp, origin, count = MEMORY_CLICKS) {
  const vp = VIEWPORTS[0]
  const page = await newPage(cdp, { viewport: vp, throttle: false, cacheDisabled: false })
  const s = page.sessionId
  const samples = []
  try {
    await loadRoute(cdp, page, origin + '/', '/')
    await sleep(POST_SETTLE_MS)
    samples.push({ after: 0, heapKb: await heapUsed(cdp, s) })
    for (let i = 0; i < count; i++) {
      const step = CYCLE[i % CYCLE.length]
      let ok = false
      let diag = null
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        await waitIdle(cdp, s)
        await evaluate(cdp, s, () => window.scrollTo(0, 0))
        await clickSelector(cdp, s, step.selector)
        const r = await pollUntilRoute(cdp, s, step.to)
        ok = r.ok
        diag = r.diag
        await sleep(1200)
        await waitIdle(cdp, s)
      }
      if (!ok) throw new Error(`nav ${i + 1} never committed ${step.to} — ${JSON.stringify(diag)}`)
      if ((i + 1) % 5 === 0) {
        const heapKb = await heapUsed(cdp, s)
        samples.push({ after: i + 1, heapKb })
        log(`memory after ${i + 1} navs: ${heapKb}kb`)
      }
    }
    const final = await heapUsed(cdp, s)
    samples.push({ after: count, heapKb: final, final: true })
    const first = samples[0].heapKb
    return {
      viewport: vp.label,
      count,
      samples,
      startKb: first,
      finalKb: final,
      growthKb: final - first,
      growthPct: round(((final - first) / first) * 100, 1),
      pageErrors: page.errors.length,
    }
  } catch (e) {
    return { error: String(e.message), samples }
  } finally {
    await page.close()
  }
}

/**
 * Phase 5 — cursor lifecycle. This is lane β's acceptance instrument and it is
 * EXPECTED TO FAIL at baseline: Cursor.tsx only recomputes on pointermove, so
 * every one of these leaves the last-hovered badge frozen. Recording the actual
 * values, not fixing anything.
 *
 * Contract read off Cursor.tsx: `.cursor` is the root, `data-mode` is set only
 * when the hovered [data-cursor] value has a word in LABELS ('view' | 'grade'),
 * and `.cursor-label` carries the word.
 */
async function phaseCursor(cdp, origin) {
  const out = {}
  const vp = VIEWPORTS[0]

  /**
   * One cold page per assertion. Chaining them through wipe navigations made
   * the probe flaky (a click landing inside a running wipe is dropped, and the
   * next assertion then runs against the wrong route), and chaining also means
   * one failure loses every later result. A fresh load costs ~4s and every
   * assertion starts from the same state.
   */
  const probe = async (name, action) => {
    const page = await newPage(cdp, { viewport: vp, throttle: false, cacheDisabled: false })
    const s = page.sessionId
    const state = () => evaluate(cdp, s, () => window.__cursorState())
    try {
      await loadRoute(cdp, page, origin + '/work/nature', '/work/nature')
      await sleep(POST_SETTLE_MS)
      const r = { media: await evaluate(cdp, s, () => window.__media()) }
      r.hoverPoint = await moveMouseTo(cdp, s, '.gallery-flow .gallery-item')
      r.before = await state()
      // every "cleared" result below is a false pass if the hover never armed
      r.probeArmed = r.before.mode === 'view'
      r.extra = (await action(s, state)) ?? null
      r.after = await state()
      r.cleared = r.probeArmed ? r.after.mode == null : null
      r.diag = await evaluate(cdp, s, () => window.__diag())
      return r
    } catch (e) {
      return { error: String(e.message) }
    } finally {
      await page.close()
    }
  }

  // (a) open the lightbox without moving the pointer
  out.lightboxOpen = await probe('lightbox', async (s) => {
    await evaluate(cdp, s, () => document.querySelector('.gallery-flow .gallery-item').click())
    await sleep(700)
    return { lightboxOpen: await evaluate(cdp, s, () => !!document.querySelector('.lightbox')) }
  })

  // (b) navigate to another route without moving the pointer
  out.routeChange = await probe('route', async (s) => {
    await navigateProgrammatically(cdp, s, '.site-header-nav a[href="/about"]', '/about')
    return { path: await evaluate(cdp, s, () => location.pathname) }
  })

  // (c) blur the window
  out.windowBlur = await probe('blur', async (s) => {
    await evaluate(cdp, s, () => window.dispatchEvent(new Event('blur')))
    await sleep(400)
    return null
  })

  // (d) pointer leaves the document
  out.pointerLeave = await probe('pointerleave', async (s) => {
    await evaluate(cdp, s, () =>
      document.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }))
    )
    await sleep(400)
    return null
  })

  out.media = out.lightboxOpen.media ?? null
  out.hoverCard = out.lightboxOpen.before ?? null
  out.hoverProbeValid = !!out.lightboxOpen.probeArmed
  out.a_clearsOnLightboxOpen = out.lightboxOpen.cleared
  out.b_clearsOnRouteChange = out.routeChange.cleared
  out.c_clearsOnBlur = out.windowBlur.cleared
  out.d_clearsOnPointerLeave = out.pointerLeave.cleared
  out.errors = [out.lightboxOpen, out.routeChange, out.windowBlur, out.pointerLeave]
    .map((p) => p.error)
    .filter(Boolean)

  // coarse pointer: no custom cursor at all
  const mobile = await newPage(cdp, { viewport: VIEWPORTS[1], throttle: false, cacheDisabled: false })
  try {
    await loadRoute(cdp, mobile, origin + '/work/nature', '/work/nature')
    await sleep(1000)
    out.coarse = {
      media: await evaluate(cdp, mobile.sessionId, () => window.__media()),
      cursor: await evaluate(cdp, mobile.sessionId, () => window.__cursorState()),
    }
    out.coarse_noCustomCursor = out.coarse.cursor.display === 'none'
  } catch (e) {
    out.coarseError = String(e.message)
  } finally {
    await mobile.close()
  }
  log(
    `cursor: armed=${out.hoverProbeValid} clears lightbox=${out.a_clearsOnLightboxOpen} route=${out.b_clearsOnRouteChange} blur=${out.c_clearsOnBlur} pointerleave=${out.d_clearsOnPointerLeave} coarseDisplay=${out.coarse?.cursor?.display}${out.errors.length ? ' errors=' + JSON.stringify(out.errors) : ''}`
  )
  return out
}

/** Phase 6 — one route change under prefers-reduced-motion: reduce. */
async function phaseReducedMotion(cdp, origin) {
  const page = await newPage(cdp, {
    viewport: VIEWPORTS[0],
    throttle: false,
    reducedMotion: true,
    cacheDisabled: false,
  })
  const s = page.sessionId
  try {
    await loadRoute(cdp, page, origin + '/', '/')
    await sleep(POST_SETTLE_MS)
    const media = await evaluate(cdp, s, () => window.__media())
    await evaluate(cdp, s, () => window.__wipeStart())
    await clickSelector(cdp, s, '.site-header-nav a[href="/work"]')
    const settledAt = await evaluate(cdp, s, () => window.__settle('/work'))
    await sleep(800)
    const { samples, nav, clicks } = await evaluate(cdp, s, () => window.__wipeStop())
    const t0 = (clicks.find((c) => c.trusted) ?? clicks[0])?.t
    const moved = samples.filter((x) => x.a < 99.5 || x.f < 99.5)
    return {
      media,
      wipeOccurred: moved.length > 0,
      overlayMoveSamples: moved.length,
      navToSettledMs: t0 != null && settledAt > 0 ? round(settledAt - t0) : null,
      commitDelayMs: t0 != null && nav[0] ? round(nav[0].t - t0) : null,
      pageErrors: page.errors.length,
      errorSample: page.errors.slice(0, 3),
    }
  } catch (e) {
    return { error: String(e.message) }
  } finally {
    await page.close()
  }
}

/* ------------------------------------------------------------- flattening */

/** Every numeric metric on one dotted key, so audit-diff.mjs can diff blindly. */
function flatten(run) {
  const f = {}
  for (const [key, r] of Object.entries(run.loadMetrics ?? {})) {
    if (r.error) continue
    const p = `load.${key}`
    f[`${p}.scrollHeight`] = r.scrollHeight
    f[`${p}.lcpMs`] = r.lcpMs
    f[`${p}.cls`] = r.cls
    f[`${p}.longestTaskMs`] = r.longestTaskMs
    f[`${p}.heapKb`] = r.heapKb
    f[`${p}.settleMs`] = r.settleMs
    f[`${p}.pageErrors`] = r.pageErrors
  }
  for (const [key, r] of Object.entries(run.sweeps ?? {})) {
    if (r.error) continue
    const p = `sweep.${key}`
    f[`${p}.scrollHeight`] = r.scrollHeight
    f[`${p}.viewportsTall`] = r.viewportsTall
    f[`${p}.interactiveCount`] = r.interactive.count
    f[`${p}.tabReachable`] = r.interactive.tabReachable
    f[`${p}.withFocusRing`] = r.interactive.withFocusRing
    f[`${p}.belowMinTarget44`] = r.interactive.belowMinTarget44
    f[`${p}.minTargetPx`] = r.interactive.minTargetPx
    f[`${p}.minFontSizePx`] = r.text.min
    f[`${p}.textNodesBelow14`] = r.text.below14.length
    f[`${p}.overflowUnintentional`] = r.overflow.unintentionalCount
    f[`${p}.docScrollWidth`] = r.overflow.docScrollWidth
  }
  const t = run.transitions ?? {}
  if (t.medians) {
    for (const [k, v] of Object.entries(t.medians)) f[`transition.median.${k}`] = v
    f['transition.minTotalMs'] = t.minTotalMs
    f['transition.maxTotalMs'] = t.maxTotalMs
    f['transition.wipedCount'] = t.wipedCount
    f['transition.heapDeltaKb'] = t.heapDeltaKb
    f['transition.pageErrors'] = t.pageErrors
  }
  const m = run.memory ?? {}
  if (m.finalKb) {
    f['memory.startKb'] = m.startKb
    f['memory.finalKb'] = m.finalKb
    f['memory.growthPct'] = m.growthPct
  }
  const c = run.cursor ?? {}
  f['cursor.hoverProducesMode'] = c.hoverCard?.mode ? 1 : 0
  f['cursor.clearsOnLightboxOpen'] = c.a_clearsOnLightboxOpen ? 1 : 0
  f['cursor.clearsOnRouteChange'] = c.b_clearsOnRouteChange ? 1 : 0
  f['cursor.clearsOnBlur'] = c.c_clearsOnBlur ? 1 : 0
  f['cursor.clearsOnPointerLeave'] = c.d_clearsOnPointerLeave ? 1 : 0
  f['cursor.coarseNoCustomCursor'] = c.coarse_noCustomCursor ? 1 : 0
  const rm = run.reducedMotion ?? {}
  f['reducedMotion.wipeOccurred'] = rm.wipeOccurred ? 1 : 0
  f['reducedMotion.navToSettledMs'] = rm.navToSettledMs
  return f
}

/* -------------------------------------------------------------------- main */

const USAGE = `devsite audit harness — see PLAN-POLISH-BASELINE.md

  node scripts/audit.mjs [--label <name>] [--phases a,b] [--routes /a,/b]
                         [--tcount N] [--mcount N] [--build] [--promote]

  --label     names the output file (default: run)
  --phases    subset of loadMetrics,sweeps,transitions,memory,cursor,reducedMotion
  --routes    restrict the route matrix
  --tcount    transition probe click count (default 10)
  --mcount    memory probe click count (default 20)
  --build     force npm run build first
  --promote   also copy the result over scripts/audit-baseline.json

Writes scripts/audit-out/<stamp>-<label>.json. A full run takes ~8 minutes.
Diff two runs with: node scripts/audit-diff.mjs <a.json> <b.json>
`

async function main() {
  if (arg('help') || arg('h')) {
    console.log(USAGE)
    process.exit(0)
  }
  const label = typeof arg('label') === 'string' ? arg('label') : 'run'
  const only = typeof arg('phases') === 'string' ? arg('phases').split(',') : null
  const wants = (p) => !only || only.includes(p)
  const routes = typeof arg('routes') === 'string' ? arg('routes').split(',') : ROUTES

  if (!existsSync(join(DIST, 'index.html')) || arg('build')) {
    log('dist/ missing — running npm run build')
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' })
    if (r.status !== 0) throw new Error('npm run build failed')
  }

  const started = Date.now()
  const server = await startStaticServer(DIST)
  log(`serving dist/ on ${server.origin}`)
  const chrome = await launchChrome()
  const cdp = await CDP.connect(chrome.wsUrl)
  const version = await cdp.send('Browser.getVersion')
  log(`chrome ${version.product}`)

  const run = {
    label,
    startedAt: new Date().toISOString(),
    git: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).stdout?.toString().trim(),
    gitDirty: (spawnSync('git', ['status', '--porcelain'], { cwd: ROOT }).stdout?.toString().trim().length ?? 0) > 0,
    chrome: version.product,
    node: process.version,
    config: {
      routes,
      viewports: VIEWPORTS,
      throttle: { cpuRate: CPU_THROTTLE, network: 'Slow 4G (150ms / 1.6Mbps / 750Kbps)' },
      throttledPhases: ['loadMetrics'],
      unthrottledPhases: ['sweeps', 'transitions', 'memory', 'cursor', 'reducedMotion'],
      postSettleMs: POST_SETTLE_MS,
      readinessSignal: '.loading-screen computed display === none + fonts settled + main h1 present',
    },
  }

  try {
    if (wants('loadMetrics')) run.loadMetrics = await phaseLoadMetrics(cdp, server.origin, routes)
    if (wants('sweeps')) run.sweeps = await phaseSweeps(cdp, server.origin, routes)
    if (wants('transitions'))
      run.transitions = await phaseTransitions(cdp, server.origin, Number(arg('tcount', TRANSITION_CLICKS)))
    if (wants('memory'))
      run.memory = await phaseMemory(cdp, server.origin, Number(arg('mcount', MEMORY_CLICKS)))
    if (wants('cursor')) run.cursor = await phaseCursor(cdp, server.origin)
    if (wants('reducedMotion')) run.reducedMotion = await phaseReducedMotion(cdp, server.origin)
  } finally {
    run.durationMs = Date.now() - started
    run.flat = flatten(run)
    mkdirSync(OUT_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const file = join(OUT_DIR, `${stamp}-${label}.json`)
    writeFileSync(file, JSON.stringify(run, null, 2))
    log(`wrote ${file} (${Math.round(run.durationMs / 1000)}s)`)
    if (arg('promote')) {
      copyFileSync(file, join(HERE, 'audit-baseline.json'))
      log('promoted to scripts/audit-baseline.json')
    }
    cdp.close()
    chrome.kill()
    await server.close()
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
