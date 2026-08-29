# DUST-PLAN — porting the particle work from /lab/particles into the site

## What the lab established (facts worth keeping)

The sandbox (`/lab/particles`, dev-only) landed on a three-part system:

1. **Curl-noise ambience** — stateless GPGPU: a float FBO holds positions
   re-derived every frame as `f(baseSphere, time)`, drawn as soft fake-DoF
   point sprites (size and alpha follow distance from a focus plane — no
   postprocessing anywhere). Rouven's tuned preset lives in
   `src/canvas/dustSettings.ts` (near-still field, curl 0.45, additive).
2. **The parting** — the pointer is treated as a camera→cursor *ray*; ambience
   dots are pushed radially clear of that ray at their own depth, force
   follows hand speed and releases slowly. This is the interaction that
   *reads*: it carves a visible channel through the dense cloud.
3. **Rapier motes** — a few hundred real rigid bodies (zero-g, damped,
   impulse-pulled home, kinematic capsule collider along the cursor ray)
   rendered with the same sprite look. Genuine collision response: bump,
   tumble, settle.

**The hard-won lesson: readability beats mechanism.** Three interaction
implementations in a row were judged "only the back reacts" — all three
worked. In a dense additive cloud the saturated core cannot show individual
motion; only a *mass* response (the parting) is legible there. Any future
tuning question should be asked as "can I see it in a screenshot diff", not
"is the physics right". The probe (`scratchpad dust-probe.mjs` pattern:
synthetic in-page pointermove sweep + before/during/after captures against
the dev server) is how we verify.

## Design stance

**Dust is the air of the darkroom, never the data.** The globe's dots,
borders, arcs, pins are the instrument — plotted, exact, trustworthy. Dust is
atmosphere: it drifts, catches light, parts around the hand. Therefore:

- Dust NEVER displaces the globe's data dots. The parting applies to
  atmosphere layers only. Geography does not blow around.
- Dust carries no information. No counts, no meaning in its density. It may
  *respond* to state (the dive thickening the air) but never encode it.
- The lab preset is a showpiece ball; production dust is sparse. Numbers will
  come down by an order of magnitude and that is expected, not a loss.

This stance is metaphor-agnostic on purpose: the globe-lab sprint (Gate 2
pending) may reframe the primary space, but "air that parts around the
cursor" survives any of the candidate metaphors — globe, photo field,
timeline, or archive. Nothing below couples dust to globe geometry.

## Stage D1 — extract a production `<Dust>` (no visual change yet)

Promote the lab code into a reusable layer; the lab keeps working as the
testbed on top of it.

- `src/canvas/Dust.tsx`: the ambience + parting, minus the panel, minus all
  lab assumptions. Key generalisation: the lab hardcodes camera z=6 / fov 25
  and unprojects analytically. Production mounts inside existing Views with
  their own cameras (the globe's plate camera is `[0, 0.3, 4.6]` fov 32, from
  `plate.ts`), so the cursor ray must derive from the actual view camera's
  matrices, and the pointer arrives through the existing `GlobePointer`
  frame-relative contract instead of a window listener.
- Props: a `DustPreset` (the settings object, baked, no sliders), a bounds
  shape (ball / shell / slab — the hero wants a horizon band, the plate wants
  a table-depth slab, the lab wants its ball), particle budget, and the
  pointer ref.
- Gating: renders nothing under `softwareGL()` (the audit harness runs
  SwiftShader — dust must not exist there, same branch as MSAA), nothing
  under `prefers-reduced-motion` (a static sparse sprinkle is acceptable if
  total absence reads as a bug — taste call), and the sim FBO pass rides the
  existing frameloop arbiter for free.
- Shader program joins the `ShaderProgramWarmup` list in CanvasRoot so Home
  remounts don't cold-link it.
- Budgets: 64² sim texture (4k particles) is the production ceiling per view;
  the lab proved 128² but the hero shares a frame budget with the globe.

Gate: typecheck + audit harness unchanged (dust absent under SwiftShader by
construction) + lab still works riding the extracted component.

## Stage D2 — hero globe: air around the planet

The horizon planet gets atmosphere: a sparse band of motes above the horizon
line and thin room-air in the foreground, DoF-blurred against the page.

- Bounds: shell segment hugging the visible cap of the sphere + a shallow
  foreground slab. Density LOW — air, not spectacle. Likely normal blending,
  not additive (the additive glow competes with the scarlet accents; try
  both, screenshot, decide).
- The parting is active here — sweeping across the hero carves the channel
  through the atmosphere while the globe's data dots hold still underneath.
  That contrast (air moves, instrument doesn't) is the whole point.
- Entrance tie-in, optional flag: the sim's `uCondense` can pull the cloud
  onto a sphere — during the entrance flywheel the air could condense toward
  the forming planet and release. Build behind a boolean, judge by eye,
  delete without ceremony if it fights the existing choreography (the
  entrance already has a lot of story; more may be less).
- Pointer plumbing: `WorldGlobe` already writes a frame-relative pointer for
  the globe (`GlobePointer`); Dust reads the same ref. No new listeners.

Gate: S6-style perf probe on the home route (long-task budget unchanged,
frame time within family median), plus the sweep-probe screenshot diff
showing the parting works in situ. Then Rouven's taste gate.

## Stage D3 — detail view: the dive and the plate

The dive (`ScalePhase: world → dive → plate → return`) is where dust earns
depth. Keyed entirely off the existing `ScaleState` — no new state.

- During `dive` (presence rising): foreground motes streak past the camera —
  the sensation of falling *through* air toward the table. Density and blur
  scale with `presence`; the streak is just the DoF blur elongating with a
  per-frame velocity term, not a new system.
- At the `plate`: a table-depth slab of near-still dust above the plotted
  country, sparse, catching the wash. The parting follows the pointer over
  the table. **Respecting the v4 ruling (one overlapped gesture, one
  interaction): dust is not an interaction — it's a passive response.** It
  must never invite play at the plate; if testers start chasing dust instead
  of prints, density goes down until they stop.
- `return` runs the dive backwards; dust thins back to the hero band.

Gate: dive gate probes still green (S5 coverage, S6 long-task, soft-red envs
respected), sweep-probe at the plate, taste gate.

## Stage D4 — the rapier question (deferred, explicitly)

The bumping motes are the most delightful thing in the lab and the most
expensive thing in the plan: `@dimforge/rapier3d-compat` is a ~2 MB module
(wasm inlined; roughly 800 KB over the wire) plus a per-frame CPU world. That
buys real collisions for a garnish layer.

Decision now: **not in D2/D3.** The parting alone carried the lab once it was
readable. Rapier stays a flagged experiment (`?dust=rapier` on the lab route)
until the hero + dive dust has lived for a while and Rouven still wants the
extra 5%. If it does ship someday, it ships lazy-loaded on first pointer
entry into the hero, never on the critical path, and only on desktop —
which is also the only place a persistent cursor exists to justify it.

## What this does NOT touch

- `Globe.tsx` internals, plate fitting, the entrance choreography (except the
  optional D2 condense flag), the country atlas, projections, ticker, tour.
- The GPGPU shipping decision does not block on globe-lab Gate 2; D1 is
  metaphor-neutral and D2/D3 port to whatever wins.

## Open taste calls (Rouven)

1. Reduced-motion: no dust at all, or a static sparse sprinkle?
2. Hero blending: additive glow vs normal-blend smoke against the charcoal.
3. Does the entrance condense flag deserve a try, or is the entrance full?
4. Mobile/touch: no hover means no parting — ship the ambience alone there,
   or skip dust entirely below the desktop breakpoint?

## Order of work

D1 (extraction, no visible change) → D2 (hero) → taste gate → D3 (dive/plate)
→ taste gate → revisit D4. Each stage is one commit-able unit with its gate
run before the next starts.
