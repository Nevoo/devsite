# PLAN — the country unroll (CONCEPT-COUNTRY-ZOOM V2)

*Status: PLAN ONLY — nothing here is built. Written 2026-08-12 against the
code as of that day (Globe.tsx 1295 lines, dot-field architecture). Iterate
here first; execute in a fresh session, stage by stage, gates between.*

Companion: CONCEPT-COUNTRY-ZOOM.md holds the why. This file holds the how.

---

## 0. What the code actually is (read this before touching anything)

The plan below leans on five load-bearing facts of the current implementation:

1. **The globe is dots, not a textured sphere.** One `DotLayer` family
   (land ~36k samples pre-mask, sea, graticule) sharing one buffer discipline:
   `home` / `scatter` / `seeds` / `alpha` arrays, positions rewritten on the
   CPU during the entrance (`formLayer`), static afterwards. The route is the
   one stroke; pins and waypoints are DOM, projected per frame into
   `projectionRef` and placed by WorldGlobe's ticker loop.
2. **Occlusion is a live geometric test in the vertex shader**
   (`patchDotAlpha`: per-dot camera-ray vs. sphere, radius `uOccR`), never
   baked, never CPU state. The entrance owns exactly one scalar of it (the
   radius). This is the pattern the unroll must extend, not replace.
3. **The camera never moves** — [0, 0.3, 4.6], `PRESENT_BIAS` lifts the
   presentation point up the visible arc; all motion is group rotation
   (`spinRef` / `tiltRef` damped, tour steering in `useFrame`).
4. **Choreography is one wave, one clock.** Everything in the entrance orders
   itself by `sweepAt` (angular distance from the final front face) through
   `seeds`; labels lag their own ground (`LABEL_LAG`); handoffs carry
   momentum (`SPIN_RESIDUAL`). No layer gets its own clock. The unroll must
   speak this dialect or it will read as a different site.
5. **The DOM half never guesses.** `activeRef` / `selectedRef` /
   `projectionRef` are written canvas-side every frame; WorldGlobe writes
   transforms straight to nodes on the GSAP ticker. FramePop lifts a card by
   measuring the real DOM card. All of that survives unchanged at plate scale
   if plate-mode pins keep the same `PinProjection` contract.

And one fact of the data that kills the naive version: **world sampling
density is ~1° per dot. Germany owns ~60 land dots; the south island maybe
25.** A "zoom in" that only moves existing dots produces an empty table. The
plate therefore needs a RESEEDED dense layer, and the world dots' job during
the dive is continuity, not coverage.

---

## 1. Goal / non-goals

**Goal.** From the world globe, entering a congested spot (cluster chip or
its one pin) plays a single continuous motion: the sphere's local patch
peels flat into a topographic country plate under the camera, the member
pins spread to their true positions with room to breathe, their frames fan
as contact sheets, and `precision` renders as geometry (venue point, town
ring, island/fiord outline, country/region wash). Pulling back re-wraps the
plate onto the sphere and hands the tour its momentum back.

**Non-goals (V2).**
- No zoom *within* a plate, no street/city scale, no slippy-map pan-anywhere.
- No second canvas, no route change / URL per plate (open question §8).
- No new label text the data doesn't already carry.
- Not the mobile-default decision (concept §6) — build desktop-first, decide
  after it exists.

---

## 2. Architecture decisions (the ones to argue with)

**D1 — The morph is a GPU mix with a CPU mirror.** Extend `patchDotAlpha`'s
`onBeforeCompile` patch: new attribute `aPlate` (vec3 target position), new
uniforms `uMorph` (0..1) and `uFlat` (occlusion attenuation). Vertex position
becomes `mix(position, aPlate, uMorph)` before the occlusion test, and the
occlusion term itself fades with `uFlat` (a plate has no far side). The same
projection function exists once in TS for the ~20 CPU consumers (pin
projection, route vertices, camera framing). Why not CPU like `formLayer`:
the entrance rewrites buffers because every dot has a *different* schedule;
the morph is one scalar — exactly what a uniform is for. The world's 40k
dots morph free; the CPU touches only pins.

**D2 — The projection is azimuthal equidistant, not gnomonic.** Centered on
the cluster centroid `c` (unit vector, group space): for dot direction `d`,
angular distance `α = acos(d·c)`, tangent direction `t` = normalized
component of `d` ⊥ `c`. Plate position = `c·R + t·α·R·SPREAD`. Equidistant
because gnomonic's `tan(α)` blows up past 60° and the far world flies to
infinity mid-morph; equidistant keeps every dot finite so the *whole sphere*
can visibly peel, then dots past `PLATE_EXTENT` (~0.35 rad ≈ 2200km after
SPREAD) fade via the existing alpha discipline. `SPREAD` (~2.2) is the
decongestion knob: it is what turns four overlapping NZ pins into four
separated table pins.

**D3 — The plate's terrain is a reseeded layer, not the world dots.** One
pre-allocated `plateLayer` (~24k dots, built once, reused per country).
On dive: sample the country's bounding cap from a packed **terrain tile**
(land + elevation, see D4) via rejection sampling; write `home` (flat plate
position + elevation lift), `scatter` (the corresponding position ON the
sphere patch, so fill dots condense out of the surface, not out of nowhere),
`seeds` (radial wave: distance from centroid — the plate develops outward,
the entrance's sweep re-aimed), `aAlpha` (development). The world dots that
fall inside the cap stay through the morph — they ARE the continuity — and
the dense fill develops around them as `uMorph` passes ~0.6. Return reverses:
fill dots sink back into the surface first, then the patch re-wraps.

**D4 — One asset, built offline: `public/terrain.bin`.** Extend the
`build-land-mask.mjs` pattern with `scripts/build-terrain.mjs`: ETOPO-class
public-domain relief (2022 60-arc-second grid is plenty) downsampled to a
single equirect ~2700×1350 Uint8 grid — 1 byte/sample: bit 7 land flag,
bits 0–6 elevation (0–127, ~50m steps, sea masked to 0). ~3.6MB raw,
~700KB–1.2MB gzipped/brotli'd, fetched lazily on first dive (never in the
critical path; the world globe keeps using `land-mask.ts`). At that
resolution Germany is ~66×90 samples of authority for coastline+relief —
coarse relief is FINE: the plate is a darkroom drawing, not Google Terrain.
Elevation exaggeration ~6–10× or it reads dead flat at country aspect.

**D5 — Scale state is a ref, one writer.** New `scaleRef: { current:
{ phase: 'world' | 'dive' | 'plate' | 'return', cluster: number, morph:
number } }` owned by Globe.tsx's `useFrame` (single writer, like
`selectedRef` clearing). WorldGlobe and the cluster chips write only
*intents* (`enterRef.current = clusterIndex`, `exitRef.current = true`),
canvas consumes and drives `morph` with the damped-spring discipline already
used for spin/tilt. No React state in the loop (r3f-state rules).

**D6 — Clustering is static, not camera-dependent.** V2 clusters by fixed
angular threshold (~0.10 rad great-circle) over `places`, computed once from
data at module scope (places change per deploy, not per frame). Camera
never zooms at world scale, so dynamic re-clustering buys nothing. Current
data yields exactly the problem set: {queenstown, south-island, milford,
doubtful} and singletons elsewhere. Germany/sydney are single pins whose
*frame count* (15/13) is the congestion — a cluster is therefore defined as
EITHER ≥2 places within threshold OR 1 place with ≥~8 frames. Every cluster
is enterable; lone sparse pins keep today's card fan and never dive.

**D7 — Precision-as-geometry lives in the dot layer, not DOM.** On the
plate: `venue` → accent-tinted dot cluster at the point (plus the DOM pin);
`town` → a one-dot-wide accent ring (~8km radius equivalent); `island` /
`fiord` → the feature's own land dots tinted (the terrain tile's land flag
gives the outline for free — tint land dots within the place's declared
radius); `country` / `region` → a low-alpha accent wash over the whole
plate's land dots. Implemented as one more attribute (`aTint`, 0..1 mixing
dot colour toward the scarlet accent) written during plate seeding. DOM
keeps only what DOM already owns: the pin label, the card fan. No new text.

---

## 3. Choreography (the part that makes it belong here)

**Entering (target ~1.6s, one clock, no phase that starts from stillness):**
1. *Steer* — the tour's existing presentation logic swings the cluster
   centroid to the presented direction (`PRESENT_BIAS` lifted). This is not
   new code; it is `selectedRef` pointed at a centroid.
2. *Peel* — `uMorph` 0→1 (cubic ease-in-out, the file's `ease`). The whole
   visible hemisphere flattens; dots beyond `PLATE_EXTENT` develop DOWN in
   alpha as their distance grows (they slide off the table). `uOccR` shrinks
   to 0 across the same window (`uFlat`) — the far side un-hides exactly as
   the geometry stops having a far side. Route stroke and waypoint labels
   fade by 0.3 — they are world-scale annotation.
   The camera stays put; the plate forms under the same lifted presentation
   direction the tour already uses, tilted ~12° off face-on so it reads as a
   table, not a wall (tabletop vs face-on is Rouven's call, §8).
3. *Develop* — from morph ~0.6, the plate layer's fill dots condense
   surface→relief along the radial wave; elevation lift rides the same
   per-dot window. Member pins glide (CPU mirror of the same projection)
   from huddle to true positions; their `PinProjection.form` re-runs the
   label-lag ramp so names surface behind their own ground — the entrance's
   exact grammar at a new scale.
4. *Land* — precision tint develops last (`LABEL_LAG` after fill), fans
   become available. Tour clock pauses; `GRACE` logic owns the idle return
   (open question §8: does idle EVER auto-return? default: no).

### 3b. The register of the peel — the edgerunner reading

*(Rouven, iterating on this plan: "the unroll could look like a cyberpunk
edgerunning sequence with the dots. like a 'matrix world'.")*

The instinct is right and the system is already built for it: the globe has
always claimed the world is a point cloud — dots, a live geometric
hidden-surface test, an entrance that assembles the planet from particles.
The peel is the single moment the site *admits* that. So the cyberpunk read
is not a skin to apply; it is a register the transition is allowed to enter,
and it should be built from the four moves below rather than from any
genre-kit effect:

- **The scan front.** The radial develop wave (§3 step 3) gets a *visible*
  wavefront: a one-dot-wide expanding ring in accent scarlet. A fill dot
  flares as the front passes it and settles into its terrain colour over
  ~0.3s. The plate is not assembled — it is SCANNED, ring by ring, like a
  LIDAR pass. Cost: one distance-vs-time term in the alpha/tint ramp that
  already exists. This is the highest value-per-line move and should be in
  the default build, not an option.
- **The ground grid.** The plate develops a sparse local graticule — minor
  lat/lng lines at country scale, dots in the same buffer family, exactly as
  the world graticule is already "dots so it rides the same wave". A faint
  ruled ground plane under scanned terrain is what makes the table read as
  constructed space rather than as a miniature landscape. Same `seeds`
  discipline, develops one lag behind the terrain fill.
- **Data settling, not springing.** Elevation lift overshoots by ~8% and
  settles — dots populate like values arriving, not like pudding. One
  ease-out-back on the per-dot lift window; taste-gate it at S4.
- **The instrument readout.** The dive narrates itself in the status rail /
  instrument register (the live-darkroom concept's own vocabulary):
  coordinates ticking toward the centroid, then `SCAN … 38%`, then the
  place count. DOM-side, driven off `scaleRef.morph` — the one place the
  cyberpunk register and the darkroom register turn out to be the same
  register: instruments reporting what the machine is doing.

**The guardrails, stated once.** No palette shift — scarlet on charcoal
(#ff2d1a / #101013) already *is* the noir-terminal palette, and a green or
cyan cast would cost the brand for a quote. No glitch kitsch: no chromatic
aberration, no scanline shader, no character-rain — the dots themselves are
the effect, and everything on this site earns spectacle from real geometry
(the occlusion memory's rule: never bake, never fake). Dot motion trails
during the peel were considered and parked: real trails need velocity
attributes or frame accumulation (a second render target — architecture
cost), and the flywheel-curved flight paths already read as motion. If the
peel still wants more speed-feel at S3's gate, revisit trails as elongated
point sprites along the velocity vector — an attribute, not a postprocess.

**Returning (~1.1s, faster — leaving is always faster):** fans close (the
FramePop close discipline), tint and fill sink back into the surface
(reverse wave, inward), `uMorph` 1→0 while `uOccR` regrows, and the group
inherits a small residual spin toward the tour's next stop — the
`SPIN_RESIDUAL` trick, so the world arrives already moving and the tour
carries it to rest, never a dead stop.

**Interruption rule (inherited from the entrance):** any input mid-dive
skips to the nearest stable end (morph <0.5 returns, ≥0.5 completes). No
input is ever ignored and no transition is ever fought.

---

## 4. Interaction model on the plate

- **Drag** pans the plate center within the country's cap (re-aims `c` by
  small rotations — same damped spinRef/tiltRef pipeline, clamped hard).
  No zoom. No inertia fling off the table.
- **Pins** keep today's whole vocabulary: hover/active states, tap → card
  fan, card → FramePop genie. Zero new component families.
- **Exit**: esc key, scroll-down past the globe section, the existing
  grab-and-fling gesture beyond a velocity threshold, and an explicit DOM
  affordance ("← world", styled like the status rail's instrument register).
  Four exits because stranded-on-the-plate is the concept's named risk.
- **Cluster chips (world scale)**: a new pin variant in WorldGlobe — count
  chip at the centroid (`4 places · 25 frames`), members hidden while their
  cluster chip shows. Chip is the enter affordance. Singleton congested pins
  (germany) show their normal label plus a quiet count — entering is a
  second tap on the presented pin (mirrors the existing select-then-fan
  rhythm).

---

## 5. Honesty constraints (non-negotiable, from GLOBE-V2 §2.3 / §8)

- A cluster chip states counts; it never claims to be a place.
- The wash/ring/outline render *declared* precision only — no invented
  positions, ever. Germany's 15 frames live on the wash, not on fake pins.
- Frames with no place (`still-frankfurt-ubahn`, `still-java-volcano`) stay
  absent from every plate.
- No clock time gains authority it doesn't have: the plate changes WHERE is
  presented, never WHEN (outings/localTime rules untouched).
- Empty stops ("frames to come") appear on plates as label-only pins — they
  are true, and the plate has room for them where the globe didn't.

---

## 6. Execution stages (each gated; a fresh session works top to bottom)

**S1 — geometry module + clustering (pure TS, no rendering).**
`src/canvas/plate.ts`: `plateProject(d, c, spread)` (azimuthal equidistant,
+ inverse), cap sampling helpers; `src/content/clusters.ts`: threshold
clustering over `places` with the ≥2-places-or-≥8-frames rule. Gate: a node
script round-trips project/unproject to <1e-6 and prints the cluster table
(expect: the four-NZ cluster, singletons elsewhere; germany/sydney flagged
congested-singleton).

**S2 — terrain asset.** `scripts/build-terrain.mjs` (ETOPO source checked
into nowhere — downloaded at build time, path documented in the script
header), emits `public/terrain.bin` + a tiny TS reader
(`src/content/terrain.ts`, lazy fetch + decode to a typed array, no
dependency on the critical path). Gate: decoded Germany crop rendered to a
debug canvas (scratch page) shows a recognizable coastline; file ≤1.2MB
compressed; audit.mjs bundle gate unchanged.

**S3 — shader morph.** Extend `patchDotAlpha`: `aPlate`, `uMorph`, `uFlat`;
`aTint` plumbed but constant 0. CPU mirror in plate.ts used by a dev-only
morph slider (uniform driven from a temporary keybind). Gate: CDP headless
probe (the harness from the gsap-handoff memory) screenshots morph 0 / 0.5 /
1 on the real page: sphere → visibly peeling → flat patch, no occlusion
artifacts (far-side dots must not pop — they *unhide* as `uFlat` says).

**S4 — plate layer + dive state machine.** `plateLayer` buffer, reseed on
enter, `scaleRef`/intent refs, the §3 choreography with the tour paused,
cluster chips + enter/exit affordances in WorldGlobe, pins riding the CPU
mirror. Gate: enter/exit the NZ cluster and germany repeatedly, mid-dive
interruptions included, with zero React renders in the loop (React DevTools
profiler), no GSAP/Lenis stalls, and the return handing measurable residual
motion to the tour.

**S5 — precision-as-geometry + frames.** `aTint` seeding per member place;
card fans and FramePop verified at plate scale; empty stops as label-only
pins. Gate: germany plate shows wash + 15-frame fan and NO point pin;
cabo da roca shows a venue point; doubtful sound shows the fiord's own
outline dots tinted.

**S6 — fallbacks, a11y, perf, polish.** Reduced-motion: crossfade instead
of morph (same ends, no peel). No-WebGL: the existing DOM list is already
the answer — cluster chips get `aria-expanded` semantics; keyboard: chips
tabbable, esc exits. Perf: dive allocates nothing per frame (all buffers
pre-allocated; reseed reuses arrays); `terrain.bin` fetch is idle-time
prefetched after entrance completes. Gate: audit.mjs full run vs baseline;
CDP trace of a dive shows no long task >50ms on an M-class laptop throttled
4×.

Rough shape: S1+S2 a day-ish, S3 a day, S4 the big one (two-plus), S5+S6 a
day each. Six gates, any of which can stop the line.

---

## 7. Risks, called by name

- **The peel reads as damage.** A flattening planet can look broken rather
  than intentional for the middle 40% of the morph. Mitigations: the radial
  develop wave starting *during* the peel (something is always being built),
  the table tilt (a plate at 12° reads as placed, not fallen), and the
  interruption rule. If it still reads wrong at S3's gate, fallback is the
  V1 crossfade WITH the dot-continuity (world dots fly to plate positions,
  sphere body crossfades out) — same grammar, less spectacle.
- **Terrain coarseness at small countries.** ~50m elevation steps over
  Portugal's coast may band. The dot rendering hides most banding; if not,
  bump to 2 bytes/sample for elevation (asset doubles, still lazy).
- **Route stroke under morph.** Its vertices are a line buffer, not dots;
  morphing it is extra plumbing for an element that's world-scale texture
  anyway. Plan says fade it out — if Rouven wants legs on the plate
  (sydney→queenstown entering the NZ plate could be gorgeous), that is a
  scope add at S4, not a default.
- **Two dot programs.** `aPlate`/`aTint` change the patched shader; the
  `transparent`/program-compile trap documented in the entrance (Globe.tsx
  ~line 180) applies — attributes must exist from first compile, uniforms
  from frame one, or the dive's first use stalls exactly like the mesh
  visibility bug did.
- **Scope worm: "while we're in there".** The plate will make people want
  pan-zoom, city names, day/night, borders. The honesty section and
  non-goals exist to say no once, in writing.

---

## 8. Open questions for Rouven (iterate on these before executing)

1. **Enter gesture**: tap the cluster chip (planned) — or also a scroll/
   pinch-toward-the-globe gesture? (Gesture-zoom implies continuous scale,
   which D6 deliberately doesn't build.)
2. **Tabletop or wall**: plate tilted ~12° like a table under the camera
   (planned), or face-on like a projection screen (more darkroom, less
   terrain)?
3. **Does the tour ever dive on its own?** Planned: never — the tour
   presents chips, only the visitor enters. An auto-diving tour is a
   showreel but risks motion sickness and stolen control.
4. **Route legs on the plate** (see risk above): worth the plumbing for the
   NZ plate's internal legs?
5. **Deep links**: should `/…?place=doubtful-sound` open pre-dived? Costs a
   routing touch (V2 ships without).
6. **The wash colour**: precision wash in accent scarlet at low alpha, or a
   neutral lift? (Accent is on-brand but 15 frames of germany may read
   "error red" at scale. Needs eyes on it at S5, flagging now.)
7. **Terrain source**: ETOPO 2022 60″ (planned, public domain, one file) —
   any preference for GEBCO instead?
8. **How far into the edgerunner register (§3b)?** Planned as default: scan
   front + ground grid + settle + instrument readout, inside the existing
   palette. Dial positions beyond that (persistent grid at rest? readout
   verbosity? revisiting trails?) are taste calls for S4's gate — say now
   if any of the four defaults already feels like too much or too little.

---

*Execution note for the fresh session: read §0 first, then Globe.tsx's
entrance comment block (lines ~135–200) in full, then the three memories —
globe-entrance-choreography, globe-pickup-hero, drei-view-outside-canvas —
before S1. The plan deliberately reuses the entrance's vocabulary
(`seeds`, waves, lag, residual momentum); if an implementation choice
contradicts that vocabulary, the vocabulary wins.*
