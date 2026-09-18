# Audit harness

Headless measurement harness for the production build: `scripts/audit.mjs`, `scripts/audit-diff.mjs`, `scripts/cdp.mjs`. `scripts/audit-baseline.json` is the frozen comparison set.

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
| `--routes /journal,/journal/nature` | restrict the matrix |
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

`--ignore-noisy` excludes the metrics marked noisy in `audit-diff.mjs` from the exit code. They're
still printed and still marked, so nothing is hidden.

A metric present in only one of the two files renders as `new metric` or
`removed metric` and never gates. The frozen baseline predates any metric added
to the harness later, and a harness improvement must not read as a site
regression. As of this writing that applies to `headerMinTargetPx`,
`headerMinFontSizePx`, `cursor.clearsOnPopOpen`,
`cursor.clearsOnVisibilityHidden` and `cursor.popOpenReached`, which exist in
new runs but not in `scripts/audit-baseline.json`.

Output lives in `scripts/audit-out/` (gitignored). `scripts/audit-baseline.json`

## 2. What one run measures

**Matrix.** Routes `/`, `/journal`, `/journal/nature`, `/about`, `/contact` ×
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
5. `cursor` — all six cursor-lifecycle
   triggers, one cold page each.
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
