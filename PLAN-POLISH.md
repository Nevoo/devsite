# Polish sprint — leader-principle execution plan

Refines the jury-review remediation plan against the actual codebase on
`rework/threejs-portfolio`. Guardrails are unchanged and restated at the bottom.

The leader (main session) owns scoping, sequencing, arbitration and the final
call. Workers build inside one lane each. A verifier grades every lane before
the next wave starts. Nobody grades their own homework.

---

## 0. Premise corrections

The original plan was written from a black-box review. Five of its work items
describe things that already exist or cannot work as written. Correcting them
before assigning lanes, because two of them would have produced no-op commits.

| Plan claim | Reality | Consequence |
|---|---|---|
| "Mobile lightbox: no next/previous controls — add them" | Buttons and swipe both exist (`Lightbox.tsx:72-91`, `:51-59`). They are hidden on mobile by `.lightbox-nav { display: none }` inside the `@media (max-width: 900px)` block (`site.css:2153`, not ≤640px as first written — Gate 1 correction), with the comment "swipe instead" | Work is **unhide + size + gesture-harden**, not build. Roughly a third of the estimated effort. |
| "Custom cursor leaking into non-interactive areas / body text" | Cursor only labels elements matching `.closest('[data-cursor]')` and is already gated to `(pointer: fine)` (`Cursor.tsx:28,40-50`) | Leak over body text is **not reproducible from the code**. The real defect is narrower: `mode` is only recomputed on `pointermove`, so it goes stale when a route changes, a lightbox opens, or the pointer leaves the window. Fix the lifecycle, do not rewrite as a six-state machine. |
| "Prefetch likely destinations on hover" | Only `CanvasRoot` is lazy (`App.tsx:21`). Every route is in the main bundle | Prefetch is a **no-op**. Cut it, or replace with the real question: should routes be split at all? (They shouldn't — the bundle is dominated by three.js.) |
| "Add a reduced-motion path" | Already exists — `useTransitionNavigate` skips the wipe entirely under `prefersReducedMotion()` (`TransitionLink.tsx:178-183`) | Work is **audit + extend to the lightbox and gallery parallax**, not add. |
| "Transitions take 1.9–2.8s, cut to 800–1050ms" | True, and **deliberate**. `REVEAL_AT_MS = 1200` is a floor with the comment "slow paints extend the stillness, fast paints never shorten the destination's reading interval" (`TransitionLink.tsx:55-57`), and `COVER.still` has a documented stillness tail | This is an **art-direction reversal, not a defect fix**. Needs Rouven's explicit call before any worker touches it. See Decision D1. |

Two further findings the review missed:

- **`public/images/categories/events/gallery/` exists on disk with one frame and
  no declared category** (`outings.ts:152-153` already flags it). The photography
  edit must resolve it, not step around it.
- **No test, lint, or measurement harness exists.** No vitest, no Playwright, no
  lint script. `npm run build` (`tsc -b && vite build`) is the only gate in the
  repo. Phase 1's "record the complete scroll, measure page height, collect
  traces" has nothing to run on. This is Wave 0's real deliverable.

---

## 1. Decisions that gate the work

These are Rouven's, not a worker's. Lanes are blocked on them where noted.

**D1 — Transition duration. → DECIDED: keep the storyboard, fix the faults.**
`REVEAL_AT_MS` and the `COVER`/`REVEAL` constants are frozen. Wave 2 is a
correctness lane only: WebGL freeze across the swap, popstate through the same
lifecycle, the duplicate-click window, and an error path. The review's
800–1050ms target is explicitly **not** an acceptance criterion — the site's
motion identity outranks it. Any worker proposing a constant change escalates
rather than edits.

**D2 — Photography edit authority.** Cutting frames from 28 is a taste call. A
worker can produce a contact sheet and a ranked shortlist with reasons; it cannot
decide what stays. Leader presents, Rouven cuts. *Blocks Wave 3 content lane.*

**D3 — Baseline fidelity. → DECIDED: proxy now, real device at Wave 5.**
Wave 0 builds headless Chrome over CDP with 4× CPU throttle and Slow 4G, across
5 routes × 3 viewports, plus the transition and memory probes. Real iOS Safari
and Android Chrome enter once, at the Wave 5 jury pass. Perf targets in Wave 4
are therefore measured under throttled emulation and re-confirmed on hardware at
the end; a Wave 4 pass is provisional until Wave 5 signs it off.

---

## 2. Lane discipline

Parallelism here is limited by one file: `src/styles/site.css` is 2,280 lines and
is the write target for the lightbox, the nav, gallery pacing, and responsive
type. Two agents editing different regions of the same file still collide — the
second one's read goes stale and its edit fails or clobbers.

**Rule: one CSS owner per wave.** Everything else parallelises freely.

`isolation: "worktree"` is the escape hatch if a wave genuinely needs two CSS
writers, but it buys parallelism at the cost of a merge in a 2,280-line file.
Not worth it below three concurrent lanes.

### File ownership map

| Lane | Owns (exclusive write) | May read |
|---|---|---|
| α Lightbox + nav | `components/Lightbox.tsx`, `components/Header.tsx`, `stores/ui.ts`, **`styles/site.css`** | all |
| β Cursor lifecycle | `components/Cursor.tsx` | `stores/ui.ts`, `App.tsx` |
| γ Baseline harness | `scripts/`, `PLAN-POLISH-BASELINE.md` | all |
| δ Transition lifecycle | `components/TransitionLink.tsx`, `App.tsx` | all |
| ε Gallery pacing + type | **`styles/site.css`**, `styles/global.css` | all |
| ζ Content | `content/categories.ts`, `pages/About.tsx`, `pages/Contact.tsx`, `components/Footer.tsx` | all |
| η Perf + a11y | `canvas/*`, `components/WebGLImage.tsx`, `vite.config.ts`, `index.html` | all |

β must not write `stores/ui.ts` — it subscribes to the existing `lightbox` field
rather than adding one, precisely so it can run alongside α.

### Who builds what

`worker-codex` (cross-model, so verification stays independent) takes the
mechanical, spec-tight lanes: **α, δ, ε, η**. `worker-builder` takes **γ**.
Lane **ζ** stays with the leader — content voice and photo cuts are not
delegable, and the Voice DNA rules apply to every user-facing line.

`verifier` gates every wave against the acceptance criteria as written. A lane
that cannot be verified against a number does not ship.

---

## Wave 0 — Measurement harness and baseline

**Lane γ.** Read-only against `src/`; writes only `scripts/` and the baseline doc.

Deliverable is a repeatable script, not a set of recordings. Recordings are for
Rouven's eyes at Wave 5; the gates need numbers.

Build `scripts/audit.mjs` driving headless Chrome over CDP:

- Routes `/`, `/work`, `/work/nature`, `/about`, `/contact` × 1440×900, 390×844,
  320×568.
- Per route: full document height, LCP, CLS, longest task, JS heap after load.
- Every interactive element: bounding box, computed font-size, tab order,
  whether a focus ring is visible.
- Overflow probe: any element whose `scrollWidth` exceeds the viewport.
- Transition probe: 10 scripted route changes, recording click→first-paint-of-
  cover, cover→route-commit, route-commit→reveal-end, and post-run heap.
- Memory probe: 20 route changes, heap sampled every 5.

Output one JSON per run to `scripts/audit-out/`, plus a markdown diff of two
runs. This is the acceptance instrument for every later wave — "the gallery is
tighter" becomes "nature went 7,822px → 6,100px" without anyone eyeballing it.

**Then** capture the baseline run and record the known findings as the frozen
comparison set: nature at 7,822px, nav targets 23.5–28.5px, nav text 12.8px,
transitions 1.9–2.8s.

**Gate 0:** verifier re-runs `audit.mjs` cold on a clean checkout and confirms
the numbers reproduce within 5%. A harness that isn't reproducible is worse than
none, because every later gate inherits its noise.

Also lands in Wave 0, leader-owned: add `"typecheck": "tsc -b --noEmit"` and wire
`npm run build` into the gate checklist. Every wave ends green.

---

## Wave 1 — Interaction defects (parallel: α, β)

Runs concurrently with nothing blocking it. Not blocked on D1.

### α.1 Mobile lightbox

Starting point is working desktop code (`Lightbox.tsx`), not a blank file.

- Remove `.lightbox-nav { display: none }` at ≤640px. Give the buttons a ≥44×44px
  hit area via padding, keeping the existing `←` `→` glyphs and 0.7 opacity at
  rest — the desktop arrow language is the vocabulary, unchanged.
- Position prev/next so neither overlaps the horizontal centre third of the image
  at 390×844 in either orientation.
- Harden the existing swipe (`:51-59`): require ≥48px **and** `|dx| > |dy| * 1.5`,
  so a vertical flick can never advance the frame. Current 60px threshold has no
  axis test at all.
- Preload `index ± 1` via a hidden `new Image()` on index change.
- Focus trap: move focus into the dialog on open, cycle within it, restore to the
  originating gallery button on close (the opener already knows the index —
  `Gallery.tsx:78`).
- Replace the static `aria-label` with a polite live region announcing
  "photo N of M" on each step. The current label is set once at open.
- Replace `document.body.style.overflow = 'hidden'` (`:23`) with a class, so it
  composes with the lenis stop instead of racing it.

**Acceptance (measured by `audit.mjs`):** all four controls ≥44×44px at 390×844;
every frame reachable by touch, button and keyboard producing identical index
sequences; zero layout shift on advance (CLS delta 0 across 6 steps); portrait
and landscape both fit within the viewport without cropping; close returns scroll
position to within 2px of the opening position.

### α.2 Navigation touch targets

Current: `.site-header-nav a { padding-block: 0.25rem }` (`site.css:79-82`) with
`font-size: 0.8rem` under 640px (`:73-76`), producing the measured 23.5–28.5px.

- Raise hit area to ≥44px via `padding-block` plus a negative margin so the
  capsule's own height is unchanged. The `::after` underline is positioned at
  `bottom: 0` and will need re-anchoring to the text box, not the padded box.
- Keep font sizes as they are. Growing the text changes the capsule proportions,
  which is a guardrail violation.
- Verify ≥8px gap between adjacent targets after padding at 320px.
- `rouvens.work` logo must still fit at 320px alongside three nav links.

**Acceptance:** all four targets ≥44px tall at every breakpoint 320–1440; no
element with `scrollWidth > clientWidth` at 320px; the capsule's rendered height
within 2px of baseline.

### β Cursor lifecycle

Not a state machine rewrite. `Cursor.tsx` already resolves mode correctly on
move; it just never clears when something happens that isn't a move.

Clear mode on: route change, `lightbox` becoming non-null, `popOpen` becoming
true, `pointerleave` on the document, `visibilitychange` to hidden, and
`blur` on the window. Each of these currently leaves the last-hovered label
frozen on screen.

Add a re-resolve on `pointerover` as well as `pointermove`, so a DOM change under
a stationary pointer (a card unmounting during a transition) updates the badge.

**Acceptance:** scripted probe in `audit.mjs` — hover a gallery card, open the
lightbox without moving the pointer, assert `data-mode` is absent; hover a card,
navigate, assert absent after reveal; hover a card, blur the window, assert
absent. Coarse-pointer gate unchanged and still asserted.

**Gate 1:** verifier runs `audit.mjs`, `npm run build`, and manually exercises the
lightbox on a real 390px viewport. Diffs α and β against the baseline JSON.

---

## Wave 2 — Transition lifecycle (serial: δ)

**D1 decided: the storyboard is frozen.** `COVER`, `REVEAL` and `REVEAL_AT_MS`
are read-only in this lane. This is a correctness pass, not a timing pass.

The current sequence (`TransitionLink.tsx:99-161`) is already close to the plan's
ideal ordering: cover → navigate → scroll reset → await paint → refresh triggers
→ hold → reveal. What it lacks:

- **No WebGL freeze.** Nothing stabilises the canvas across the swap. This is the
  likeliest cause of the observed `/work → /work/nature` tearing, since
  `WebGLImage` planes unmount and remount underneath a still-live render loop.
  Freeze or `frameloop="never"` the canvas for the covered interval.
- **No cursor clear at transition start** — β adds the listener, δ fires it.
- **popstate is unhandled.** Back/forward bypasses `runTransition` entirely and
  lands on the raw route with `ScrollTrigger.refresh()` from
  `RouteChangeEffects` (`App.tsx:26-29`). Route the same lifecycle through a
  `useNavigationType` check or a popstate listener.
- **Duplicate-click guard is partial.** `transitioning` blocks re-entry
  (`:176`), but `pointer-events: all` on the overlay (`:101`) is set at timeline
  start, leaving a window before the overlay covers anything. Set it
  synchronously before the timeline builds.
- **`finally` resets transforms unconditionally** (`:162-168`) — if `navigate`
  throws, the overlay snaps back with the old route still mounted. Add an error
  path that hard-navigates.
- Reduced-motion path exists but does a bare `navigate` with no visual
  acknowledgement. Add the short opacity fade the plan asks for.

**Acceptance:** the 10-transition probe reports zero frames where the outgoing
canvas and incoming DOM are both visible; the masked interval stays within 5% of
the frozen storyboard's baseline (it must not drift, in either direction);
back/forward produce the same
phase-timing signature as a click within 10%; heap after 20 transitions within
15% of after 2; reduced-motion run shows no wipe and a bounded fade.

*Leader amendments (Gate 2):* timing rows are graded against contemporaneous
pristine-HEAD runs, interleaved, per PLAN-POLISH-BASELINE §9 — the unfreeze must
be scheduled inside the hold so the reveal still starts at `REVEAL_AT_MS` and
maskedMs carries no structural drift. On POP the commit precedes the cover by
construction (BrowserRouter applies it before any code can mask it), so the
"same signature" criterion is `totalMs` within 10% of the click path plus an
identical reveal shape; commit→reveal-end is exempt on POP. The POP cover is a
snap, not the animated storyboard — the destination never paints uncovered
(verified same-frame at Gate 2); the shape goes to Rouven with the Wave 5
recordings. Heap: growth over 20 navigations must not exceed contemporaneous
HEAD's beyond the environmental band.

**Gate 2:** verifier runs the transition probe 3× and confirms no variance
between click-nav and popstate paths. Manual: 10 rapid double-clicks on nav.

---

## Wave 3 — Pacing, type, content (parallel: ε, ζ)

ε and ζ are file-disjoint. ζ is blocked on D2; ε is not.

### ε Gallery pacing and responsive type

The blank space is the art direction. Tune, do not normalise.

- `.gallery-flow` gap is `clamp(4rem, 10vw, 9rem)` (`site.css:1667`). Reduce the
  upper bound and the vw term by 15–25%, holding the lower bound so mobile
  separation is untouched.
- Keep `.gallery-item-0/1/2` asymmetric alignment and all individual image
  scales (`:1677-1688`). Only the rhythm between frames moves.
- Tighten the last-photo → `.gallery-next` distance
  (`.gallery-next` padding, `:2069`).
- `.page-heading-sub` and the `clamp(0.82rem, 1vw, 0.98rem)` metadata scale
  (recurring at `:485, :702, :802, :1081`) produce the measured 13.76px on mobile.
  Raise the floor to `0.9rem` — that lands at ~14.4px and is a one-token change
  affecting every mono metadata site consistently.
- Leave `[ 01 ]` index treatment alone.

**Acceptance:** nature document height at 1440×900 drops from 7,822px into the
6,000–6,600px band (≈7 viewports); no `font-size` below 14px anywhere in the
`audit.mjs` element sweep; no overflow at 320px; mobile never shows more than one
viewport of empty space between consecutive frames.

*Leader amendment (Wave 3):* the 6,000–6,600 band is mathematically unreachable
under this wave's own guardrails — the six nature images sum to ~5,000px of
scale-protected height, flooring the page at ~6,900px even with zero gaps. The
guardrails outrank the number (same hierarchy as D1). Revised CSS acceptance:
−160px at 1440 (7,823 → 7,663) with floors, asymmetry and image scales intact.
The remaining distance to ≈7 viewports belongs to the D2 photo cuts — removing
the two flagged near-duplicate nature frames lands ≈6,250px, inside the
original band. The 14px criterion carries the standing exemptions: nav fonts
(α.2 guardrail), the `[ 01 ]` index treatment, `span.chip` (flagged to Rouven
as taste), and the mono instrument-register family (globe/hero/log HUD).

### ζ Content (leader-owned)

- **Photo edit:** produce a contact sheet of all 28 across 6 categories, plus the
  orphan `events/` frame. Rank within category, flag near-duplicates, flag any
  cover that isn't the strongest frame in its set. Present to Rouven; he cuts.
  No minimum count per category. Resolve `events/` — promote or delete.
- **Taglines:** the `Category.tagline` doc comment (`categories.ts:20-28`) already
  states the standard — a stance, not a wall label. Audit all six against it.
  Single sentences stay single sentences.
- **`/about` credibility:** one concrete thing built, one clear statement of the
  responsibility held leading teams, one tangible Arlou outcome. Inside the
  existing structure. Personal register, not résumé.
- **`/contact` duplication:** keep the main block; suppress the large footer CTA
  on this route only. Marquee and socials stay if the ending still has rhythm
  without the CTA.
- Voice DNA applies to every line: short paragraphs, contractions, no em dashes,
  no "This isn't X. This is Y.", no AI clichés.

**Acceptance:** every visible sentence carries information not already on screen;
the development claim has at least one verifiable proof point; `/contact` makes
its request once.

**Gate 3:** verifier checks ε numerically and reads ζ against the Voice DNA rules
and the tagline doc comment. Content and motion are in separate commits — mixing
them makes both regressions and taste judgements harder to isolate.

---

## Wave 4 — Performance and accessibility (serial: η)

Profile before changing anything; the harness from Wave 0 makes this cheap.

**Images.** 12MB of `.jpeg` in `public/images`, no WebP/AVIF, no `srcset`. The
fallback `<img>` already has `loading="lazy"` (`WebGLImage.tsx:202`), but the
WebGL path loads full-resolution textures regardless of display size. Generate
AVIF/WebP derivatives at 2–3 widths, add `srcset`/`sizes` to the fallback, and
size the texture request to the plane. Biggest single LCP lever available.

**WebGL.** Clamp DPR on mobile; pause rendering on `visibilitychange` and when
the canvas is offscreen; audit `Globe.tsx` (1,347 lines) for React state writes
inside the frame loop; confirm geometry/material reuse and texture disposal
across route changes.

*Transferred from Wave 2 (leader ruling):* the transition freeze
(`FreezeGate` → `setFrameloop('never'/'always')`) retains ~1MB extra heap over
20 navigations (+80% growth vs +64% at HEAD). δ's bisection pinned the
mechanism — a no-op FreezeGate closes ~90% of the gap, and bypassing
`setFrameloop`'s clock reset changes nothing, so the leak rides on actually
stopping/restarting the render loop, with the allocation site in the canvas
tree (`View.Port`/`WebGLImage`/`GlobeView` behaviour around a paused loop).
η owns the fix; the freeze itself stays (it guarantees the zero-tearing
result). Wave 4's heap gate must land growth back inside the HEAD band.

**Accessibility.** Full keyboard pass; visible focus on every interactive
element; heading hierarchy per route; descriptive alts (currently
`"${category.title} photo ${i+1}"` — generic, and worth improving alongside the
Wave 3 photo edit); contrast in every motion state including mid-wipe;
`body.no-webgl` fallback renders meaningful content.

**Targets:** LCP < 2.5s on throttled mobile, INP < 200ms, CLS < 0.1, heap stable
across 20 navigations, zero console errors or WebGL warnings.

**Gate 4:** verifier reruns the full harness and diffs against the Wave 0
baseline on every metric, not just the ones η targeted. Regressions elsewhere
count.

---

## Wave 5 — Jury pass (leader)

Repeat the original review exactly, plus the harness diff. Real iOS Safari and
Android Chrome. Keyboard-only, reduced-motion, slow-network passes. Side-by-side
before/after recordings for the motion changes, since those are the ones numbers
can't settle.

The final artefact is a baseline-vs-final table from `audit.mjs`, with the
recordings attached for the judgement calls.

---

## Sequencing and effort

| Wave | Lanes | Parallel | Est. |
|---|---|---|---|
| 0 Harness + baseline | γ | — | 0.5–1d |
| 1 Interaction | α, β | yes | 0.5–1d |
| 2 Transition | δ | no | 1–1.5d |
| 3 Pacing + content | ε, ζ | yes | 1–1.5d |
| 4 Perf + a11y | η | no | 1.5–2d |
| 5 Jury | leader | — | 0.5–1d |

**5–8 days.** Lower than the original 6–9 because the lightbox and reduced-motion
work is smaller than assumed and Wave 1 parallelises. The harness costs half a
day up front and pays for itself at every gate.

Largest remaining uncertainties, unchanged: the WebGL freeze in the transition
lifecycle, and real mid-range Android performance.

---

## Definition of done

Every criterion below is checked by `audit.mjs` or by a named manual pass. No
criterion is met by inspection alone.

- Mobile lightbox: visible ≥44px controls, axis-tested swipe, keyboard, focus
  trap, focus restore, live-region announcement
- All four nav targets ≥44px at every breakpoint 320–1440, capsule proportions
  unchanged
- Cursor mode clears on route change, lightbox open, pop open, window blur,
  visibility change, and pointer leave
- Transitions technically airtight: no tearing, no double-fire, popstate matches
  click, reduced-motion path acknowledged — with the storyboard's timing
  unchanged from baseline
- Nature gallery ≈7 desktop viewports with asymmetry and image scale intact
- No text below 14px; no overflow at 320px
- Development claim carries one concrete proof point; `/contact` asks once
- LCP < 2.5s throttled, INP < 200ms, CLS < 0.1, stable heap over 20 navigations
- Real iOS Safari and Android Chrome pass clean
- Rerunning the jury review surfaces no usability failure severe enough to cap
  the design and creativity scores

---

## Guardrails (unchanged)

Charcoal, warm white, scarlet. Lowercase display type, mono metadata. WebGL
globe. Homepage log and grading comparison. Film grain, indices, stars,
marquees. Asymmetric photography layouts. Scarlet page-transition wipe. Drenched
contact/footer treatment.

No new pages, visual motifs, typefaces, palettes, decorative effects, or homepage
sections. The only new visible interface elements are functional necessities —
principally the mobile lightbox controls, which reuse the existing desktop arrow
language rather than introducing a new one.
