# Wave 0 baseline — measurement harness and frozen numbers

Lane γ deliverable for `PLAN-POLISH.md` §"Wave 0". Everything below comes from
`scripts/audit.mjs`, run twice back to back on `rework/threejs-portfolio`
(commit `e631eadb`, working tree dirty with the in-flight rework changes).

Nothing in `src/` was touched to produce it.

---

## 1. Running it

```bash
node scripts/audit.mjs --label baseline          # full run, writes scripts/audit-out/<stamp>-baseline.json
node scripts/audit.mjs --label after-wave-1      # any later run
node scripts/audit-diff.mjs scripts/audit-baseline.json scripts/audit-out/<stamp>-after-wave-1.json
```

A full run takes about eight minutes (477s and 470s for the two accepted runs)
and needs nothing installed. It builds `dist/` if it's missing, serves it from
its own node http server with SPA fallback, launches its own headless Chrome
against a throwaway profile in the OS temp dir, and kills both on exit. It never
attaches to a Chrome you already have open.

Useful flags while iterating:

| flag | effect |
|---|---|
| `--label <name>` | names the output file |
| `--phases loadMetrics,sweeps,transitions,memory,cursor,reducedMotion` | run a subset |
| `--routes /work,/work/nature` | restrict the matrix |
| `--tcount 3 --mcount 6` | shorten the transition and memory probes |
| `--no-build` | measure the existing `dist/` instead of rebuilding it |
| `--promote` | also copy the result over `scripts/audit-baseline.json` |

**`dist/` is rebuilt on every run** unless `--no-build` is passed. A run against
a stale build silently measures code that's no longer in the tree, and every
later gate inherits that. `--no-build` exists for measuring an existing build
while `src/` is being edited underneath you; it refuses to run if `dist/` is
missing rather than quietly building one. Each run JSON records which happened
as `builtThisRun`, so a grader can tell whether the numbers match HEAD.

`audit-diff.mjs` takes `--tolerance <pct>` (default 5), `--only regressions` and
`--ignore-noisy`, prints a markdown table, and exits 1 if anything moved beyond
tolerance in the wrong direction. That exit code is the gate.

It knows which direction is good per metric (page height down is an
improvement, minimum font size up is), and it treats the transition medians as
**flat** — any movement beyond tolerance is `DRIFT`, in either direction, which
is how D1's frozen storyboard gets policed. Counts, booleans and CLS are
compared in absolute terms rather than in percent.

`--ignore-noisy` excludes the metrics listed in §3 from the exit code. They're
still printed and still marked, so nothing is hidden.

A metric present in only one of the two files renders as `new metric` or
`removed metric` and never gates. The frozen baseline predates any metric added
to the harness later, and a harness improvement must not read as a site
regression. As of this writing that applies to `headerMinTargetPx`,
`headerMinFontSizePx`, `cursor.clearsOnPopOpen`,
`cursor.clearsOnVisibilityHidden` and `cursor.popOpenReached`, which exist in
new runs but not in `scripts/audit-baseline.json`.

Output lives in `scripts/audit-out/` (gitignored). `scripts/audit-baseline.json`
is the frozen comparison set and **is** committed.

Files: `scripts/audit.mjs`, `scripts/audit-diff.mjs`, `scripts/cdp.mjs`.

---

## 2. What one run measures

**Matrix.** Routes `/`, `/work`, `/work/nature`, `/about`, `/contact` ×
viewports 1440×900 (desktop, DPR 1), 390×844 and 320×568 (both `mobile: true`,
touch enabled, DPR 2).

**Throttle.** The load-metrics pass runs at CPU 4× and Slow 4G (150ms RTT,
1.6 Mbps down, 750 Kbps up) with the HTTP cache disabled, so every route is a
genuine cold load of that route. The geometry, type, focus and overflow sweeps
run unthrottled for speed — geometry doesn't care about bandwidth. Each result
carries a `throttled` flag, and `run.config` lists which phases are which.

**Six phases:**

1. `loadMetrics` (throttled) — document `scrollHeight`, LCP + LCP element, CLS,
   longest task, JS heap after load plus a 2s settle, time for the loading veil
   to lift.
2. `sweeps` (unthrottled) — every `a, button, [role=button], input, select,
   textarea, summary, [tabindex]` with its bounding box, computed font size, tab
   order and focus-ring state; the minimum computed font size across every
   visible text node with the offending selectors; an overflow probe over every
   element plus the document.
3. `transitions` — 10 scripted route changes driven by real trusted mouse
   clicks, phase-timed off the wipe overlay.
4. `memory` — 20 route changes cycling all five routes, heap sampled every 5.
5. `cursor` — lane β's acceptance instrument, all six Definition-of-Done
   triggers, one cold page each (§6).
6. `reducedMotion` — one route change under `prefers-reduced-motion: reduce`.

Tab order and focus rings come from real `Tab` key presses rather than
`element.focus()`, because programmatic focus doesn't reliably match
`:focus-visible`.

Transition phases are read off the DOM, not off GSAP: this is a production
build and `window.gsap` only exists in DEV (`src/motion/gsap.ts:11`). An rAF
sampler records the computed transform of `.page-transition-accent` and
`.page-transition-base` whenever it changes, `history.pushState` is patched at
document start to timestamp the route commit, and a capture-phase click listener
gives the true `t0`.

Two of those markers are exact rather than threshold-based, and they're the ones
to read the gate off: the overlay's `pointer-events` flips to `all` on the first
tick of the cover timeline (`TransitionLink.tsx:101`) and back to `none` in the
`finally` block the instant the reveal resolves (`:165`).

---

## 3. Reproducibility — Gate 0

Two consecutive full runs, same machine, same commit, nothing else changed.

| | |
|---|---|
| metrics compared | 294 |
| bit-identical | 217 |
| within 5% | 63 |
| outside 5% | 14 |

All 30 `scrollHeight` metrics are identical. All 6 cursor metrics are identical.
164 of 165 sweep metrics are identical. Every transition median is within 5%
(`totalMs` 1876.8 vs 1876.9).

The 14 movers, plus the one sweep metric that moved without leaving the 5%
band, are the ones you'd expect:

- **`longestTaskMs`** (11 of the 14). Absolute swings of 5–95ms on 70–260ms
  tasks. It's a single sample of the worst task in a cold load under a 4× CPU
  throttle; treat it as an order-of-magnitude signal, not a gate.
- **`cls` on `/about`** (0.0009 → 0.0026 at 1440, 0.0021 → 0.0054 at 390). Large
  in percent, meaningless in absolute terms — both runs are three orders of
  magnitude under the 0.1 target. The diff compares CLS against a 0.01 absolute
  floor for exactly this reason, so it doesn't flag these.
- **`reducedMotion.navToSettledMs`** (124 → 62.8ms). A sub-frame measurement of
  a navigation with no animation in it.
- One sweep metric moved: `sweep./|390x844.textNodesBelow14` (112 → 109). The
  home globe's waypoint overlay is live, so which pins are on screen when the
  sweep fires differs between runs. Home's interactive-element geometry has the
  same ±1 wobble for the same reason. **Every other route sweeps identically.**

Only three home counters are treated as noisy — `textNodesBelow14`,
`interactiveCount` and `belowMinTarget44` — which leaves **24 of home's 33 sweep
metrics gating**, including its height, its minimum font size, its focus-ring
count and its overflow count. Across all three runs to date the only home
metrics that ever moved are two of those three counters
(`textNodesBelow14` 112 → 109, `belowMinTarget44` 31 → 30). Suppressing every
`sweep./|…` key, as an earlier revision did, would have exempted the whole home
page from the instrument.

Those four groups are what `audit-diff.mjs` marks `(noisy)` and what
`--ignore-noisy` drops from the exit code. Running the gate on the two accepted
runs:

```bash
node scripts/audit-diff.mjs scripts/audit-baseline.json \
  scripts/audit-out/2026-08-10T14-23-05-repro.json --ignore-noisy   # exit 0
```

Without `--ignore-noisy` it exits 1 on seven `longestTaskMs` rows, all of them
5–17% swings on 70–163ms values, all of them marked.

Verdict: the harness reproduces. Geometry and type metrics are exact and can
gate; timing metrics need the 5% band; `longestTaskMs` and home's live-overlay
counts should be read as indicators.

---

## 4. Baseline numbers

Source: `scripts/audit-baseline.json` (run label `baseline`, 2026-08-10T14:07Z,
Chrome 151.0.7922.108, Node v25.2.1).

### 4.1 Load metrics — CPU 4×, Slow 4G, cold, cache disabled

| route | viewport | height px | LCP ms | CLS | longest task ms | heap kB | veil lift ms |
|---|---|---:|---:|---:|---:|---:|---:|
| / | 1440×900 | 5737 | 3196 | 0.0001 | 213 | 6692 | 44801 |
| / | 390×844 | 4866 | 2296 | 0.0002 | 258 | 6585 | 36013 |
| / | 320×568 | 4334 | 2244 | 0.0006 | 152 | 6573 | 36049 |
| /work | 1440×900 | 4380 | 2256 | 0.0002 | 80 | 6318 | 18816 |
| /work | 390×844 | 4155 | 2204 | 0.0008 | 80 | 6327 | 18747 |
| /work | 320×568 | 3751 | 2184 | 0.0005 | 70 | 6232 | 18793 |
| /work/nature | 1440×900 | **7823** | 2260 | 0.0001 | 109 | 6189 | 17698 |
| /work/nature | 390×844 | 4183 | 2232 | 0.0001 | 107 | 6209 | 18810 |
| /work/nature | 320×568 | 3717 | 2212 | 0.0003 | 91 | 6261 | 18810 |
| /about | 1440×900 | 2082 | 2208 | 0.0009 | 79 | 5261 | 11415 |
| /about | 390×844 | 1792 | 2196 | 0.0021 | 75 | 5307 | 11398 |
| /about | 320×568 | 1790 | 2184 | 0.0002 | 71 | 5329 | 11395 |
| /contact | 1440×900 | 1888 | 2184 | 0 | 71 | 4674 | 8514 |
| /contact | 390×844 | 1484 | 2200 | 0.0001 | 81 | 4743 | 8518 |
| /contact | 320×568 | 1354 | 2208 | 0.0002 | 90 | 4703 | 8477 |

CLS is effectively zero everywhere. LCP sits at 2.2s on every route except home
at desktop (3.2s), and the LCP element is the page heading on all of them — the
photographs are never the LCP candidate, which means the Wave 4 image work will
move total load time and heap without moving LCP much.

The "veil lift" column is the one to stare at. It's the time from `Page.navigate`
until `.loading-screen` is `display: none`, fonts have settled and the route's
`h1` exists. On Slow 4G that's **45 seconds on home** and **19 seconds on the
galleries**. `LoadingScreen.tsx:43-48` holds the veil on
`Promise.all([document.fonts.ready, preloadImage(heroPhoto.src)])`, and
`heroPhoto` is loaded on every route, including the four that never show it.
That's a Wave 4 lever the review didn't name.

### 4.2 Sweeps — geometry, targets, type, overflow (unthrottled)

| route | viewport | height | viewports tall | interactive | <44px | min target px | min font px | text nodes <14px | doc overflows |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| / | 1440×900 | 5737 | 6.37 | 41 | 13 | 19.7 | 7.32 | 110 | no |
| / | 390×844 | 4866 | 5.77 | 39 | 31 | 20.0 | 7.32 | 112 | no |
| / | 320×568 | 4334 | 7.63 | 39 | 31 | 20.0 | 7.32 | 109 | no |
| /work | 1440×900 | 4380 | 4.87 | 15 | 8 | 22.8 | 12.48 | 12 | no |
| /work | 390×844 | 4155 | 4.92 | 15 | 8 | 22.8 | 12.48 | 15 | no |
| /work | 320×568 | 3751 | 6.60 | 15 | 8 | 22.8 | 12.48 | 15 | no |
| /work/nature | 1440×900 | 7823 | **8.69** | 17 | 9 | 22.8 | 12.48 | 20 | no |
| /work/nature | 390×844 | 4183 | 4.96 | 17 | 9 | 22.8 | 12.48 | 23 | no |
| /work/nature | 320×568 | 3717 | 6.54 | 17 | 9 | 22.8 | 12.48 | 23 | no |
| /about | 1440×900 | 2082 | 2.31 | 11 | 10 | 22.8 | 13.60 | 6 | no |
| /about | 390×844 | 1792 | 2.12 | 11 | 10 | 20.0 | 12.80 | 9 | no |
| /about | 320×568 | 1790 | 2.71 | 11 | 10 | 20.0 | 12.80 | 9 | no |
| /contact | 1440×900 | 1888 | 2.10 | 13 | 11 | 22.8 | 13.60 | 6 | no |
| /contact | 390×844 | 1484 | 1.76 | 13 | 11 | 22.8 | 12.80 | 9 | no |
| /contact | 320×568 | 1354 | 2.14 | 13 | 11 | 22.8 | 12.80 | 9 | no |

### 4.3 Header targets (the α.2 gate)

| viewport | logo | work | about | contact | nav font |
|---|---|---|---|---|---|
| 1440×900 | 96 × 26.1 | 33.1 × 30.5 | 38.9 × 30.5 | 51.4 × 30.5 | 14.08px (logo 16.32) |
| 390×844 | 86.6 × **23.5** | 30.1 × **28.5** | 35.4 × 28.5 | 46.7 × 28.5 | **12.8px** (logo 14.72) |
| 320×568 | 86.6 × **23.5** | 30.1 × **28.5** | 35.4 × 28.5 | 46.7 × 28.5 | **12.8px** (logo 14.72) |

Identical across both runs to the tenth of a pixel.

α.2's gate reads straight off the diff table: every route × viewport emits
`sweep.<route>|<viewport>.headerMinTargetPx`, the shortest of those four
targets, plus `headerMinFontSizePx`. Baseline is **23.5px at 390 and 320**,
26.1px at 1440, four targets found on every route. The criterion is ≥44 at
every breakpoint with the font sizes unmoved, so `headerMinTargetPx` must rise
to ≥44 while `headerMinFontSizePx` stays at 12.8 / 14.08.

Both keys postdate the frozen baseline, so they show as `new metric` rows in a
diff against it until someone rebaselines.

### 4.4 Transitions — 10 clicks, unthrottled, 1440×900

| phase | median ms |
|---|---:|
| click → cover timeline start (`pointer-events: all`) | 31.1 |
| click → first perceptible cover movement | 197.6 |
| click → cover complete (face at 0%) | 610.3 |
| cover complete → route commit (`pushState`) | 350.3 |
| route commit → reveal end | 886.1 |
| masked interval (fully covered) | 641.8 |
| **click → transition end** | **1876.8** |
| click → destination settled (`h1` + 2 rAF) | 1031.8 |

Range across the 10: **1731–1898ms**, zero retries, zero page errors. Heap over
the 10 transitions: 6312 kB → 9164 kB.

The gap between "first perceptible movement" (198ms) and "timeline start"
(31ms) is `power4.in` doing what it's meant to: the sheet has travelled less
than 0.5% of the viewport for the first ~165ms of its own tween. That's the
storyboard, not latency.

### 4.5 Memory — 20 route changes

| after navigations | heap kB |
|---:|---:|
| 0 | 6306 |
| 5 | 8164 |
| 10 | 9174 |
| 15 | 9864 |
| 20 | 10485 |
| 20 (final, after GC) | 10487 |

**+66.3%.** The repro run measured +64.2%. Growth is monotonic and hasn't
plateaued by 20 navigations. The Wave 4 target ("heap stable across 20
navigations") fails at baseline by a wide margin. Every sample is taken after
an explicit `HeapProfiler.collectGarbage`, so this isn't uncollected garbage.

### 4.6 Reduced motion

| | |
|---|---|
| wipe occurred | **no** (0 overlay movement samples) |
| click → destination settled | 124ms (repro: 63ms) |
| route commit delay after click | 0.2ms |

The existing reduced-motion path works. It's also completely silent — the route
swaps in under two frames with no acknowledgement, which is the gap Wave 2 was
asked to close.

---

## 5. The review's claimed figures vs measured

| review claim | measured | verdict |
|---|---|---|
| nature page 7,822px @1440 | **7,823px** | confirmed (1px) |
| nav targets 23.5–28.5px | **23.5px logo, 28.5px links** at 390 and 320 | confirmed exactly |
| nav text 12.8px | **12.8px** at ≤640px | confirmed exactly |
| transitions 1.9–2.8s | **median 1.88s, range 1.73–1.98s** | partly wrong, see below |

Three of the four claims land on the nose. The transition figure doesn't.

Measured end to end — click to the moment the overlay hands pointer events back
— the wipe is **1.88s median**, 1731–1898ms in the baseline run and
1746–1981ms in the repro. Nothing in either accepted run reached 2.8s, and the
number is structural rather than incidental:
`REVEAL_AT_MS = 1200` plus a reveal timeline that runs 0.68s gives ~1.88s by
construction.

Two caveats worth carrying into Wave 2 rather than burying:

- Earlier revisions of this harness recorded **3.6s** on `/contact → /`
  specifically, twice, in two separate runs. Both accepted runs put that same
  transition at 1731–1774ms. The difference is main-thread blocking while the
  home globe mounts: when it stalls rAF, the reveal can't tick and the sheet
  hangs. It's load-dependent and it's the one transition number with real
  variance in it. If the review was clicking into home on a cold cache, 2.8s is
  entirely plausible.
- The measurement ends when the overlay releases pointer events. The visitor's
  sense of "done" may run a little past that, since the destination's own
  entrance animations start with the reveal.

So: the storyboard is 1.88s by design (D1 froze it), and the review's upper
bound is real but belongs to the globe mount, not the wipe constants. That
distinction matters — it moves the fix from Wave 2's frozen constants to Wave
4's WebGL work.

---

## 6. Cursor lifecycle — lane β's instrument (expected to fail here)

Each assertion gets its own cold page, arms the badge with a real trusted
pointer move onto a `[data-cursor]` target, then does one thing without moving
the pointer again. Isolated pages mean one failure can't poison the rest.

| assertion | route, armed word | baseline |
|---|---|---|
| hover arms the badge | `/work/nature`, `view` | yes — probe is valid |
| clears when the lightbox opens | `/work/nature`, `view` | **no** — still `view` |
| clears on route change (checked after the reveal, on `/about`) | `/work/nature`, `view` | **no** — still `view` |
| clears on window `blur` | `/work/nature`, `view` | **no** — still `view` |
| clears on document `pointerleave` | `/work/nature`, `view` | **no** — still `view` |
| clears when `popOpen` goes true | `/`, `grade` | **no** — still `grade` |
| clears when the tab goes hidden | `/work/nature`, `view` | **no** — still `view` |
| coarse pointer shows no custom cursor | `/work/nature` @390 | yes — `.cursor` computes to `display: none` |

That's all six Definition-of-Done triggers. After lane β, the six `no` rows must
read `yes` and the last row must not move.

**How faithfully each trigger is produced**, because it changes what a pass
means:

| trigger | production |
|---|---|
| lightbox open | real — `.click()` on a gallery card mounts the Lightbox |
| route change | real — `.click()` on a header link runs the whole wipe |
| `popOpen` | real — two taps on a globe pickup card mount `FramePop`, which is the only thing that writes `popOpen` (`FramePop.tsx:104`) |
| tab hidden | real — a sibling target is brought to the front and this one genuinely reports `visibilityState: "hidden"` |
| window `blur` | **synthetic** — `window.dispatchEvent(new Event('blur'))`. A headless target can't lose OS focus. `isTrusted` is false |
| `pointerleave` | **synthetic** — `document.dispatchEvent(new PointerEvent(…))`. A real one needs the pointer outside the viewport, which the CDP input domain can't express |

The store is not reachable from page scope in a production build — only `gsap`
is exposed on `window`, and only in DEV (`gsap.ts:11`) — so `popOpen` has no
shortcut and has to go through the real interaction. The probe confirms it
arrived: `cursor.popOpenReached` is 1 when `FramePop` actually mounted. If that
reads 0, the `clearsOnPopOpen` result is vacuous rather than passing. Baseline
run: 28 pickup cards found, `FramePop` mounted, badge still `grade`.

The tab-hidden probe records which path it took as
`cursor.visibilityHidden.extra.method`. Baseline: `real-target-switch`. If a
future Chrome stops backgrounding headless targets it falls back to overriding
`document.hidden` and `visibilityState` — the properties a listener reads, not
just the event — and says so.

In `flat` these are `cursor.clearsOnLightboxOpen`, `cursor.clearsOnRouteChange`,
`cursor.clearsOnBlur`, `cursor.clearsOnPointerLeave`, `cursor.clearsOnPopOpen`,
`cursor.clearsOnVisibilityHidden`, `cursor.popOpenReached` and
`cursor.coarseNoCustomCursor`, all 0/1, so the diff flags any movement. The last
three postdate the frozen baseline and show as `new metric` rows against it.

---

## 7. Findings the harness surfaced that aren't in the plan

Recorded, not acted on. Lane γ writes `scripts/` only.

- **Focus rings are the browser's, not the site's.** All 287 tab-reachable
  element measurements across the 15 route × viewport combinations report the
  identical `outline: auto 1px rgb(0, 95, 204)` — Chrome's default — and
  `box-shadow: none`. `site.css` has three `:focus-visible` rules: two on the
  globe pickup card, one on the gallery-next link. Wave 4's "visible focus on every
  interactive element" is technically already true and aesthetically not: it's a
  blue system ring on charcoal.
- **The home globe HUD carries 7.32px type.** `.globe-waypoint-code` is the
  smallest text on the site by a factor of nearly two (next smallest on home is
  8.17px). ε's "no font-size below 14px anywhere" would rewrite the globe's
  instrument register, which is a guardrail motif. Someone needs to decide
  whether the HUD is in scope before ε reads that criterion literally.
- **`/about` overflows horizontally at 320px.** `main` and
  `.about-body` report `scrollWidth` 372 against `clientWidth` 320 — 52px of
  content wider than the viewport. The document itself doesn't overflow, so it's
  being clipped rather than scrolled, which means something is cut off rather
  than reachable. `.page-heading` overflows its container by 7px at 320 on every
  route, and `.site-footer-cta-link` by 2px.
- **Per-element overflow counts on home are dominated by the globe pins.** 27 of
  the 28 flagged elements are `.globe-pickup` / `.globe-pickup-float` children
  exceeding their positioned parent. That's how the pins are built. Read
  `documentOverflows` for the real answer and the element list as a diagnostic.
- **The loader gates every route on the hero photograph** (§4.1). 355 kB that
  four of the five routes never display.
- **`/work/nature` is 8.69 desktop viewports tall**, not the ~7 the plan's ε
  target implies. The 6,000–6,600px band it asks for is ~6.7–7.3 viewports.

---

## 8. Harness notes — the things that cost time

Written down so the next person doesn't rediscover them.

1. **There is no global "settled" flag, and `--ink` is not one.** `--ink` is set
   on the home page's `.process` section only (`Home.tsx:187`), it never reaches
   `:root`, and it's absent on `/work`, `/about` and `/contact`. The reliable
   signal on every route is the loading veil, which is never removed from the
   DOM — it's `display: none`'d after its fade (`LoadingScreen.tsx:71`). So the
   harness waits on computed `display === 'none'` plus settled fonts plus the
   route's `h1`. Waiting for the element's *absence* never fires.
2. **Don't pass `--disable-gpu`.** It leaves every WebGL surface empty and
   silently zeroes the parts of the site that matter. `--use-gl=angle
   --use-angle=swiftshader --enable-unsafe-swiftshader` renders for real.
3. **`prefers-reduced-motion` is forced to `no-preference` on every session**
   except the dedicated reduced-motion run. Chrome 151 headless happens to
   report `no-preference` by default, but older builds reported `reduce`, and
   under `reduce` most of this site's motion doesn't exist. Desktop sessions
   report `(pointer: fine)` and `(hover: hover)` without help; mobile sessions
   get `mobile: true` plus touch emulation and correctly report coarse.
4. **The static server must 404 missing assets.** An SPA fallback that hands
   `index.html` to a `<script src>` throws `Unexpected token '<'` and poisons the
   error counts. `/_vercel/insights/script.js` is the one that bites, since
   Vercel injects it in production and nothing serves it locally.
5. **Text assets are served gzipped.** A network throttle against uncompressed
   bundles measures the wrong thing; production is compressed.
6. **Synthesised mouse events need a point inside the viewport.** Gallery cards
   are 1317px tall on a 900px screen, so their centre is off screen and a
   `mouseMoved` there hits nothing. The harness uses the centre of the
   element-viewport intersection and verifies with `elementFromPoint` which
   `[data-cursor]` it landed on.
7. **A click landing inside a running wipe is silently dropped** by the
   `transitioning` guard. Every probe waits for the overlay's `pointer-events`
   to return to `none` first, and retries.
8. **Never `await` an rAF-driven promise from CDP without a timeout.** If rAF
   stalls, the promise never settles, `Runtime.evaluate` hangs for its full
   timeout, and the phase dies. Anywhere the in-page timestamp isn't the
   measurement, the harness polls from node instead. `window.__diag()` exposes an
   rAF tick counter so a wedged page is distinguishable from a dropped click.
9. **Targets are brought to the front on creation.** A backgrounded target gets
   its rAF throttled, which stalls the GSAP ticker mid-transition.

### Known limits

- Desktop runs at DPR 1 and mobile at DPR 2. Neither matches a real retina
  laptop; geometry is in CSS pixels so it's unaffected, LCP is mildly optimistic.
- `longestTaskMs` is one sample per cold load and swings up to 37% between runs.
- Home's interactive-element counts and text-node counts wobble by ±1–3 because
  the globe overlay is live during the sweep.
- SwiftShader is not a GPU. Absolute WebGL timings are not comparable to
  hardware; deltas between runs are. D3 already books real devices for Wave 5.
- The transition and memory probes run with the HTTP cache enabled (a visitor
  clicking through a site has a warm cache) and unthrottled. Only `loadMetrics`
  is throttled.

## 9. Addendum (leader, post-Gate 1): supplementary timing baseline

Gate 1 proved the four environment-sensitive transition rows drifted at HEAD
itself between the 14:07 freeze and 15:11 — `settleFromClickMs` +7.5%,
`commitToRevealEndMs` +6.7%, `clickToWipeStartMs` −31%, and `maxTotalMs` +91%
(the `/contact → /` globe-mount stall, PLAN-POLISH-BASELINE §5, now fires
deterministically; it is Wave 4's target). A pristine-HEAD checkout measured
interleaved with the Wave 1 tree was indistinguishable from it on every row, so
the drift predates any lane and is not code.

Ruling: `scripts/audit-baseline.json` stays frozen for geometry, sweeps, cursor,
memory and the stable transition rows (`totalMs` +0.9%, `maskedMs` +1.3% — both
still gate against it). The four drifted timing rows are graded from Gates 2–4
against `scripts/audit-baseline-w1.json` — the Gate 1 verifier's own full run
(`2026-08-10T15-06-33-gate1`, Wave 1 tree, `builtThisRun: true`). Both files are
committed; nothing was regenerated or overwritten.

### 9.1 Expected diff flips after Wave 2 (leader note)

`reducedMotion.wipeOccurred` 0 → 1 and `overlayMoveSamples` 0 → 1 against both
committed baselines are the reduced-motion acknowledgement fade LANDING, not a
break: the metric derives from `yPct < 99.5` and cannot tell a sweep from a
cut. Gate 2b's transform census proved exactly two discrete transform values
(cut in, cut out) with an opacity-only tween between — no sweep. Future gates
read this row as expected-changed.

### 9.2 Gate 4 record corrections (leader)

- **The images were never the LCP lever.** The plan called the 12MB of JPEG
  "the biggest single LCP lever available"; Gate 4 measured LCP within ±40ms of
  baseline on every route because the LCP element is a text node
  (`span.hero-title-inner` and friends) on all 15 route × viewport pairs. The
  derivative work pays in bytes over the wire and in the veil lift, not in
  LCP. Veil attribution: 44.8s is the Wave 0 harness settle figure on the
  pre-sprint tree (γ's instrument, §4.1); on the final tree the same settle
  metric reads 19.2s (font-floor-bound — it waits on Inter's 785KB face) while
  the FELT veil lift, measured at the display flip by Gate 4, is ~3.1s. Two
  instruments, both quoted, not interchangeable. Desktop home LCP (~3.17s
  throttled) is font-bound and stays a recorded known limit.
- **The transition freeze produces no draw-call gap.** Gate 4's GL instrumentation
  found draws continuing through the covered interval on this tree AND on HEAD —
  `frameloop: 'never'` does not stop drei View invalidate-driven renders. The
  visibility pause (0 draws while hidden vs 100 on HEAD) works; the transition
  freeze's "mandatory for tear-free swap" claim in CanvasRoot.tsx is unevidenced
  (tearing is clean regardless, z-index stacking prevents mask-bleed). Follow-up:
  evidence it on hardware at Wave 5 or soften the comment.
- **`<Preload all />` removal** from CanvasRoot (unlogged by the lane) is
  accepted: coherent with ShaderProgramWarmup, no measured consequence.
