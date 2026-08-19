# CONCEPT — the light table (country zoom v2)

*(2026-08-18. Replaces CONCEPT-COUNTRY-ZOOM.md as the concept of record for the
landed plate. The v1 concept was implemented faithfully (S1–S6, `aeef3fa→5803bbc`)
and the result was judged very bad by the owner. The implementation is not on
trial; the concept is. Written against the shipped screenshots in
`scripts/audit-out/`, PLAN-COUNTRY-ZOOM.md §7/§8, GLOBE-V2.md §2.3, PRODUCT.md
and CONCEPT-LIVE-DARKROOM.md.)*

---

## 1. concept summary

**The idea in one sentence:** the dive lands on Rouven's light table, not on a
GIS view: the region draws itself as one closed dotted figure (border and coast
in a single bright stroke, relief lit by a low raking lamp), the photographs sit
on it as stacks of actual prints with the heaviest stack already spread open as
a contact sheet, and scarlet stops being a badge color and becomes the grease
pencil that ties each stack to what is honestly known about where it was made.

Four moves compose the thread, and all four ride architecture that already
shipped: **fit-to-content framing** (the camera lands on the pins and the
feature, not on the abstract cap), **the plotted outline** (a border+coastline
stroke seeded into the plate layer, drawn by the existing scan front, so every
cap has a figure whether or not it owns a coastline), **raking light** (the
elevation already in `terrain.bin` rendered as illumination instead of dot
size, so the Alps read as light, not as noise), and **the contact sheet**
(a flat grid of prints replacing the horseshoe fan, with the count grammar
moved from notification badges into the site's instrument register).

The honesty mechanic survives whole: relative positions never lie, precision
still renders as geometry. What changes is what the geometry is *for*. In v1
the map was the subject and the photos were fiducials on it. In v2 the prints
are the subject and the map is the table they're spread on.

---

## 2. depth

### 2.1 the failure, read off the screenshots

One comparison carries the whole diagnosis.

**`s5-nz-landed.png` works.** The south island's coastline turns ~24k terrain
dots into a body: a bright, dense figure against near-black sea, with the four
print chips sitting on recognizable land. You know where you are in the first
second, before reading a word.

**`s5-germany-landed.png` fails.** The germany · vienna · dolomites cap has no
coastline inside it, so the same dot field has no edge anywhere. Uniform noise,
corner to corner: a starfield. Three tiny thumbnail chips (photos are ~2.1% of
the frame by bounding box) float in it wearing scarlet circular count badges
that read as iOS notification alerts. The pins occupy the right half; the left
third is empty. The relief signal exists (±20% dot size, a geographically
faithful Alpine arc) and cannot be perceived, because it points the same
direction as the much larger 36° table-tilt perspective gradient, so the eye
credits everything to the camera angle. The 15-frame fan
(`s5-germany-fan.png`) opens into a wedge-distorted horseshoe wreath, a
grammar borrowed from the pickup hero that was designed for 3–5 cards.

The generalization, and the test every v2 decision answers to: **dots only
make a figure at an edge or under a gradient.** NZ gets its edge free from the
sea. A landlocked cap gets neither unless the concept supplies them. v1's
"coastline, relief, nothing labelled that isn't ours" quietly assumed every
country is New Zealand.

Second generalization: v1 built a map with photo fiducials on it. This is a
photography portfolio. The landed view must be photo-first and
terrain-contextual, and v1 had the hierarchy inverted.

### 2.2 the jobs

**Functional.** Survey a congested collection: 15 frames at one pin, four
places inside 250km, every member reachable, every frame one tap from
FramePop. Say honestly, at a scale where it's legible, how precisely each
sitting is known.

**Emotional.** The pleasure of an archive as a physical thing: prints spread
on a table, a region drawn under them, marks in grease pencil. The dive should
feel like Rouven pulling a drawer open for you, not like opening a GIS
application. The visitor should want to enter the second cluster because the
first one landed somewhere generous.

### 2.3 load-bearing assumptions

1. **A closed outline makes a figure at dot resolution.** A one-dot-wide
   border+coast stroke around germany, brighter than any terrain dot, gives
   the landlocked cap the edge NZ gets from the sea. If the stroke reads as
   noise at 2700×1350-derived sampling, the thread weakens to framing + photos
   alone. Testable in an image editor for zero code (§12).
2. **Prints at survey scale don't destroy the map read.** Stacks at ~10–12% of
   viewport height occlude terrain. The bet is that a table with prints on it
   still reads as a table. If it reads as clutter, print scale comes down
   before the concept changes.
3. **Illumination beats size as a relief channel.** Hillshade brightness can
   exceed the perspective gradient where dot-size scaling could not. If 15km
   cells produce mush, relief drops to quiet even ground and the outline
   carries the figure alone, which the concept survives.
4. **Borders don't break the honesty rule.** The claim: the mechanic governs
   *our* claims (positions, precision), not the world's public facts
   (coastlines already ship; borders are the same kind of fact). This is a
   ruling Rouven must make, not a fact (§8.1).

### 2.4 first principles

**Figure-ground is not optional.** Perception assigns figure to the region
with the closed contour, the higher density, the lighting gradient. A uniform
dot field forfeits all three, so the viewer sees texture, and texture at
charcoal-on-charcoal is a starfield. Every landed cap must supply at least one
of: an edge (outline), a gradient (raking light), or a dominant object
(prints). v2 supplies all three, in that draw order.

**A survey register shows the work at survey-legible size.** The plate is the
site's survey register (FramePop is the reading register). A survey where each
item is 40px is an index, not a survey. Magnum's editors surveyed on contact
sheets: every frame visible at once, uniform size, selects marked in grease
pencil directly on the sheet. That is the correct grammar for 15 frames, and
it is flat, not a horseshoe.

**Honesty is about claims, not about withholding the world.** "Positions never
lie" means *our* pins sit where the work was made and precision renders as
geometry. It never required the ground to be featureless. Reading it as
"sparseness is a virtue" was self-inflicted: an empty table isn't more honest,
it's just emptier.

**Light is how cartography shows relief at exactly this problem size.** Swiss
shaded relief (Imhof) renders mountains as illumination from the upper left,
a convention chosen because it makes relief legible without inverting, and
adjusts it locally to keep landforms clear. Dot brightness is our native
channel for it; dot size was always the wrong channel because perspective
already owns size.

### 2.5 second-order implications

- The plate becomes the best-looking surface on the site, which creates
  immediate pressure for deep links (`?place=…`) and for the mobile-default
  question v1 parked. Both stay parked, but they will come back louder.
- The borders asset, once built, is available at world scale too. Whether the
  world globe ever shows borders is a separate taste call; nothing here
  requires it.
- The instrument-count grammar (`[ 15 ]`) should propagate to the world-scale
  cluster chips and pickup stacks in the same pass, or the site carries two
  count grammars (the badges are visible at world scale in
  `s3-morph-0.5.png` too).
- The contact sheet component is a general survey object. The world-scale
  pickup fan (3–5 cards, designed size) stays as is; but any future surface
  with >6 frames at one anchor now has a grammar.

### 2.6 failure modes, including the quiet ones

- **GIS creep.** Borders invite labels, labels invite city names, and the
  plate becomes Google Maps in a costume. The line is drawn once: geometry
  yes (coast, border, relief), text never (nothing labelled that isn't ours).
- **The badge relapse.** Any filled circle with a number in it reads as a
  notification, in any color. The count grammar must be typographic
  (mono, bracketed, inline), never a shape containing a number.
- **Error-red wash.** Scarlet at 0.12 alpha over a whole country reads as an
  alert state, exactly as PLAN §8 Q6 feared. Scarlet must contract to marks
  (points, rings, ties, scan front); broad washes go neutral (§6.4).
- **Plotter theater.** The outline drawing itself is one beat of the landing
  choreography, not a looping effect. If it renders as a persistent animated
  gimmick it becomes the 2021 camera model. Draw once, settle, done.
- **The sheet as modal.** If the open contact sheet covers the plate, the
  visitor is in a lightbox with extra steps and the dive earned nothing. The
  sheet is an object ON the table (placed in clear space, tied by a leader
  line), never an overlay OVER the table.
- **Leader-line spaghetti.** More than one open sheet, or ties crossing each
  other, reads as a conspiracy board. One sheet open at a time; ties are
  short; the solver prefers adjacency.
- **Tone drift, cyberpunk direction.** The scan-front register shipped with
  guardrails (no palette shift, no glitch kitsch). The light-table framing
  pulls the register back toward darkroom; keep the §3b guardrails verbatim.
- **Kitsch, darkroom direction.** No wood texture, no paper texture, no
  skeuomorphic tape. The table is the existing charcoal; the prints are the
  existing WebGL-plane/DOM cards; "light table" is a hierarchy, not a texture
  pack.

### 2.7 constitution tests (name, then measure)

| # | test | pass condition |
|---|---|---|
| P1 | **figure in one second** | a still of any landed cap, shown for 1s, produces a nameable figure ("that's germany", "that's an island"), coastline or not |
| P2 | **photo-first** | photos ≥15% of frame by bounding box at landing on the worst cap (germany, with its heaviest sheet open). v1 shipped 2.1% |
| P3 | **no badges** | zero filled shapes containing numbers, at plate AND world scale |
| P4 | **honesty intact** | every stack traceable to its precision geometry: point/ring stacks tied by a mark, wash stacks captioned with the precision word, no invented positions |
| P5 | **terrain attribution** | a flat-country plate and an alpine plate are distinguishable in stills at a glance; if not, relief ships silent, never louder |
| P6 | **same site** | the landing speaks the entrance dialect: one clock, one wave, labels lag their ground, momentum hands off |
| P7 | **survey completeness** | all 15 germany frames visible simultaneously, undistorted, each one tap from FramePop |
| P8 | **static test** | reduced-motion / no-WebGL paths deliver the same survey (the DOM list + sheet grid without the morph) |

---

## 3. range

Fifteen positions. Cross-domain analogies, inversions and combinations
labelled.

**R1. raking light** *(cross-domain: Swiss shaded relief).* Render the
elevation already in `terrain.bin` as illumination: a per-dot lambert term
against a low light from the upper left (the NNW convention that keeps relief
from inverting), baked at reseed time into a brightness attribute. The Alps
become a raked gradient across the plate instead of ±20% size jitter, and the
signal is on a channel perspective doesn't own. On flat land it yields quiet,
even ground, which is honest.

**R2. contour cartography in dots** *(cross-domain: topo maps).* Elevation as
one-dot-wide isolines every ~400m, terrain dots dimmed between them. Beautiful
in theory and almost certainly noise in practice: at ~15km cells germany is
66×90 samples, and contours traced through that grid stairstep badly at plate
scale. Also solves nothing for flat caps, which is the actual failure.

**R3. the plotted outline** *(cross-domain: pen plotter / field survey).*
Border and coastline as a single one-dot-wide bright stroke seeded into the
plate layer, drawn progressively by the scan front that already ships: the
region's edge is plotted first, then terrain develops inside it. Gives every
cap a closed figure, coastline or not, and turns the landing's first second
into a legible drawing act instead of a noise fade-in. Needs one new tiny
asset (borders aren't in `terrain.bin`).

**R4. the light table** *(cross-domain: the Magnum contact sheet).* Land
photo-first: each place is a stack of real prints at survey scale on the
table, the map recedes to ground, and marks in grease-pencil scarlet (the
practice of marking selects directly on the sheet with a china marker) tie
prints to places. The plate stops being a map with photos on it and becomes a
table with prints on it that happens to be a true map underneath.

**R5. the instrument plate** *(the live-darkroom register).* The plate as a
measuring instrument: graticule edge ticks, a scale bar (`└ 100 km ┘` in
mono), the centroid coordinate in the status line, counts as `[ 15 ]` with
the number in accent. Already half-shipped (the `scan … 32%` readout). Strong
as seasoning, thin as a main dish: instruments frame a subject, they aren't
one.

**R6. the route on the table** *(the trip as a line).* The journey's legs
drawn between member pins in time order, so the NZ plate shows the
queenstown → milford → doubtful movement as a stroke. Genuinely attractive
and genuinely additive; it answers "what order did this happen" which nothing
on the plate currently answers. It's also plumbing for an annotation, on top
of a landing that hasn't earned its keep yet. (PLAN §7 already scoped it as
an S4 add, not a default.)

**R7. the grid sheet** *(replacing the horseshoe).* The fan becomes a flat
contact-sheet grid: uniform undistorted frames, max ~5 per row, film-edge
index numbers, develop-in with the existing wipe, each frame straight to
FramePop. The pickup hero's arc grammar stays at world scale where 3–5 cards
made it good.

**R8. inversion: don't flatten** *(low-orbit hover).* Keep the sphere, dive
to a low tilt over the densely reseeded curved patch, never morph. Rejected
on two facts: at region scale the curvature is visually negligible, so it's
the plate with worse framing; and it throws away the shipped morph, which is
the one moment the site admits the world is a point cloud. The dive's
spectacle is not the problem; the arrival is.

**R9. inversion: no terrain at all** *(the void table).* Prints, outline
stroke, precision marks, black ground, no relief dots whatsoever. Radically
photo-first and the cheapest possible landing. Kept alive as the
reduced-motion/low-power spirit and as the floor the concept degrades to, but
as the default it deletes the payoff of `terrain.bin`, and a bare outline on
void reads closer to a logistics dashboard than a table.

**R10. photo-as-terrain** *(the matte, rejected before at globe scale).* The
dominant collection's cover image dithered into the plate dots, the region
becoming a stipple print of its own best frame. Same verdict as GLOBE-V2 R6:
it puts the effect ON the image, and it destroys the map at the exact moment
the feature's one promise is "this is where". A stippled wedding and a
coastline can't share dots.

**R11. the specimen tray** *(cross-domain: herbarium sheet / museum
georeferencing).* Each place rendered as a mounted specimen: print, label,
precision word, tiny locator. The full grammar (one sheet per specimen) is a
detail register, not a survey one, and FramePop already owns detail. What's
worth keeping is the label discipline: specimen labels put the locality and
its uncertainty ON the object, which is exactly the stack caption (§5).

**R12. hybrid framing: tight crop + inset locator.** Frame the pins tight and
add a mini-globe or region inset in a corner so context survives the crop.
The inset is a second map on a surface whose problem was too much map; the
`← world` affordance plus the outline stroke already carry "where am I".
Parked for mobile, where a tight crop loses more context.

**R13. count grammar: film-edge numbers** *(cross-domain: negative sheets).*
Counts and indices as typography in the instrument register: `[ 15 ]` inline
in captions with the number in accent, frame indices `01 … 15` on the open
sheet like edge numbers on a negative strip. Kills the notification-badge
read structurally (no shape around a number, ever) instead of by restyling
the circle.

**R14. combination: R3 + R1 + R4 + R7 + R13** — the chosen thread. The
plotted outline gives the figure, raking light gives the ground depth, the
light table gives the hierarchy, the grid sheet gives the survey, the
instrument register gives the numbers. §4 argues it.

**R15. auto-open the heaviest sheet** *(landing variant of R4).* When one
member's collection meets the congestion threshold (≥8 frames), land with
that sheet already spread. The congestion that earned the dive is the first
thing surveyed, and P2 (photo-first) becomes achievable on the worst cap
without inflating stack sizes. On caps with no dominant place, land with
stacks closed.

---

## 4. convergence

**Selected: R14, with R15 as the landing rule.** Framing first, outline
second, sheet third, light fourth; all four re-skin or re-seed shipped
machinery rather than replacing it (§10).

Why it beats what it sets aside:

- **Over R2 (contours):** contours fail exactly where v1 failed (flat caps)
  and add noise where v1 half-worked (alpine caps). R1 + R3 cover both cases
  with less geometry.
- **Over R5 alone (instrument plate):** adopted as register, rejected as
  subject. Ticks and scale bars make the table credible; they don't give a
  portfolio visitor a reason to have dived. R5's pieces ship inside R14
  (counts, scale bar, scan readout) without ever being the headline.
- **Over R6 (route legs):** deferred, not rejected. It decorates a landing
  that must first work without decoration. Revisit at the taste gate after
  staging D, as PLAN already suggested.
- **Over R8 (don't flatten):** the morph is shipped, distinctive, and named
  by the owner as the concept's core promise. The evidence indicts the
  arrival, not the journey. Rebuilding the journey to fix the arrival is
  spending where the problem isn't.
- **Over R9 (void table):** it wins on photo-first and loses on "what earned
  the dive". A planet that flattens into a featureless void makes the morph a
  transition to nothing; terrain as quiet lit ground is what makes the
  landing feel like somewhere. R9 survives as the degrade floor.
- **Over R10 (photo-as-terrain):** the one variant that structurally cannot
  coexist with "positions never lie". Named to stay dead.
- **Over R11/R12 (specimen sheets, insets):** both are detail-register or
  second-map moves on a surface that needs exactly one map and one survey.
  Their good parts (label discipline, context) are absorbed into captions and
  the outline.

The composition also resolves v1's deepest tension rather than re-litigating
it: honesty and beauty stop competing because they stop sharing a channel.
Honesty lives in geometry and marks (positions, rings, washes, ties); beauty
lives in hierarchy and light (prints, outline, raking lamp). v1 asked the
honesty geometry to also be the visual interest, and it couldn't be.

---

## 5. the experience (germany, moment by moment)

Worst cap first, because it's the one that failed.

**0.0s.** The visitor taps the `germany · vienna · dolomites` chip. The tour
swings the centroid front-on; the peel begins. Same shipped choreography:
`uMorph` rises, the far side unhides as the sphere stops having one, the
world's dots slide flat. The status line ticks `scan … 32%`.

**~0.8s.** The scan front passes outward and leaves the first new thing
behind it: **the outline**. A single bright dotted stroke plots the german
border and the north sea coast, down through the alpine rim of the cap. For a
beat the plate is just charcoal ground and one drawn figure, and the figure is
nameable: that's germany.

**~1.2s.** Terrain develops inside and around the stroke, dimmer than the
stroke, lit from the upper left. The northern plain fills as quiet, even
ground. The alpine arc across the bottom third takes the light: a raked
gradient, unmistakably relief, visibly different from the flat north. Inside
the german border, the land dots carry a faint neutral lift: the country
wash, now light instead of alarm.

**~1.5s.** The stacks land, label-lagged behind their ground. Three stacks of
real prints, top print about 11% of viewport height, two or three prints
peeking beneath at a few degrees of scatter. Under each, one mono caption
line:

> `germany, de · to the country · [ 15 ]`
> `vienna, at · to the town · [ 2 ]`
> `dolomites, it · to the region · [ 9 ]`

The number sits in accent. Nothing is circled. Vienna's stack stands beside a
one-dot scarlet ring with a short scarlet tie to it; the germany stack sits on
its wash, tied to nothing, because there is no point to tie to and the caption
says so.

**~2.0s.** The germany collection meets the congestion threshold, so its
sheet spreads on landing: fifteen prints glide from the stack into a flat
5×3 grid in the clear left third of the table (the third v1 left empty),
each frame undistorted, edge-numbered `01 … 15`, a one-dot scarlet leader
line running from the grid's corner back to the stack. The composition is
settled: outline figure, lit ground, three stacks, one open sheet. Photos are
now the largest thing on screen.

**The survey.** She scans fifteen frames at once, hovers one (the existing
saturation lift), taps it: FramePop genies it to full size. Esc drops back to
the sheet, not to the world. She taps the dolomites stack; the germany sheet
folds back to its stack as the dolomites sheet spreads. One sheet at a time,
like a grease pencil that moves rather than multiplies.

**The exit.** Esc (with no sheet open), scroll-out, fling, or `← world`. Fill
sinks, the outline unplots inward, the plate re-wraps, the tour inherits the
residual spin. Unchanged from shipped.

**New zealand, for contrast.** Same grammar, nothing special-cased: the
coastline is simply the outline stroke that happens to be a sea edge, the
southern alps take the lamp, queenstown's 12-frame sheet opens on landing,
and the four stacks sit at their true, separated positions with ring marks
and captions. The case that worked keeps working for the same reason,
now stated as a rule instead of enjoyed as luck.

**Reduced motion / no WebGL.** No peel: crossfade to the landed still
(shipped), or the DOM list. The sheet grid is DOM and works identically in
both. P8.

---

## 6. the landed view, art-directable

What is figure, what is ground, exactly.

- **Ground:** plate terrain dots at reduced brightness (roughly 40–60% of
  world-scale land dots), lit by a fixed raking light from the upper left of
  the plate frame; brightness range must visibly exceed the tilt's
  perspective gradient or relief ships silent (P5). Sea dots near-black or
  absent. Table tilt ships at 36° (`TABLE_TILT`, Globe.tsx); that tilt is the
  very gradient relief must out-shout, so it's a stage-A tunable — try
  ~15–20° against the raked light before accepting either number.
- **Figure, layer 1 (geography):** the outline stroke: border + coastline,
  one dot wide, in bone, brighter than any terrain dot, drawn by the scan
  front. Never scarlet (scarlet is for our marks, and a scarlet national
  border reads political).
- **Figure, layer 2 (the subject):** print stacks. Top print 10–12% of
  viewport height, 3:2, white hairline edge, 2–3 under-prints at ±2–4°
  scatter. One caption line per stack, mono, lowercase:
  `label · precision word · [ count ]`, count in accent. Stacks anchor at
  their precision geometry (venue point, town ring) with a short one-dot
  scarlet tie; wash-precision stacks sit at their label slot inside the wash,
  untied.
- **Figure, layer 3 (the open sheet):** one contact-sheet grid, placed in
  clear table space by a solver that prefers adjacency to its stack and never
  covers another stack's caption; scarlet leader line from sheet corner to
  the stack's anchor. Frames uniform, ~8–9% viewport height, undistorted,
  edge-numbered in mono.
- **Precision geometry:** venue → scarlet point; town → one-dot scarlet
  ring; island/fiord → the feature's own land dots tinted; country/region →
  a *neutral* brightness lift of the feature's land dots (the shipped scarlet
  wash at 0.12 is re-colored, not removed; the claim it renders is unchanged).
- **Count grammar:** typography only. `[ 15 ]` inline in captions, `01 … 15`
  edge numbers on sheets, same instrument register as the rail and slate. No
  shape ever contains a number. Applies at world scale (chips, pickup stacks)
  in the same pass.
- **Instrument dressing (quiet):** graticule edge ticks on the plate rim, one
  scale bar in mono near the bottom edge, the shipped scan readout during the
  dive. Nothing else.
- **Terrain on a coastline-free, flat cap:** the outline is the figure, the
  ground is even and calm, and that is the honest rendering of farmland. The
  plate owes the viewer orientation and hierarchy, not manufactured drama.
  Flat germany looking flat beside a raked alpine arc IS the topography
  landing.

### the survey grammar at 2, 9, 15

- **2 frames (vienna):** stack of two; tap spreads them side by side, one
  row, same sheet object at trivial size. No special case.
- **9 frames (dolomites):** 5 + 4, two rows.
- **15 frames (germany):** 5 × 3. At 8–9% viewport height per frame, a 15-up
  sheet occupies roughly a third of the frame: dominant but not modal.
- Sheets over ~20 frames (future) cap the grid at 4 rows and scroll within
  the sheet; no wreaths, no wedges, ever.

### framing rules (v1 specified none; these are the rules)

1. The landing frame is the padded bounding box of: member anchor positions ∪
   their precision-geometry extents ∪ the primary feature outline when a
   member's precision names a feature (island, fiord). Padding ~12%.
2. Implemented through the shipped adaptive-spread mechanism: choose plate
   center and spread so the box fills ~70–75% of the viewport's long axis,
   biased downward to reserve the title band. Center on the box, not the
   cluster centroid (this alone deletes v1's empty left third).
3. Zoom floor: the box never renders smaller than ~250km across (a
   town-tight cluster must not land at street scale, where the terrain has
   no authority). Zoom ceiling: all member anchors on-table, always.
4. The reserved clear zone for the open sheet counts as composition, not as
   emptiness: the solver and the framing share the same layout pass.

---

## 7. candidate mechanics, traced

| mechanic | rides on (exists) | needs (dependency) |
|---|---|---|
| shader morph, peel, scan front | `aPlate`/`uMorph`/`uFlat` in `patchDotAlpha`; radial develop wave — unchanged | nothing |
| projection + framing | `src/canvas/plate.ts` (pure math), shipped adaptive spread (radius 0.72 / separation floor) | retarget: fit pin-bounds box, offset center, title-band bias. parameter/logic change, no new machinery |
| clustering | `src/content/clusters.ts` (union-find, 0.10 rad, ≥8-frame singleton rule) | possibly lower singleton threshold to 6 (sydney at 7 is not enterable) — Rouven's call |
| raking light | `public/terrain.bin` already ships full 7-bit elevation; reseed already walks the grid | per-dot lambert against the grid normal, baked to a brightness attribute at reseed. CPU at seed time, zero per-frame cost, **no new asset** |
| the outline stroke | plate seeding + `seeds` wave discipline (scan draws it) | **new asset**: `borders.bin` from Natural Earth admin-0 boundary lines + coastline (public domain, no attribution required), sampled to dotted polylines by a new `build-borders.mjs` sibling of the terrain script. Small (tens of KB) |
| precision geometry | `aTint`/`uAccent` shipped (point, ring, feature tint, wash) | split tint into two channels or a sign convention: scarlet marks vs neutral lift. small shader/seed change |
| stacks + captions | DOM pins via the `PinProjection` contract; thumbnails exist per frame; labels + meta lines exist | a stack pin variant (larger print, under-print scatter, caption line). DOM work |
| contact sheet | DOM; FramePop already measures real DOM cards; develop-wipe exists | new sheet component + placement solver; replaces the horseshoe **on the plate only** (world pickup fan untouched) |
| count grammar | the instrument register exists in 8 places (rail, slate, log meta, globe labels, frame-pop caption) | restyle chips/stacks/captions; delete the badge circle everywhere |
| state machine, exits, a11y, perf discipline | `scaleRef` world/dive/plate/return, four exits, resumable reseed cursor, idle prefetch, gate scripts | gates re-pointed at the new landing (see §10) |

Not evaluable from stills, carried as open constraints: morph feel in motion,
hover/FramePop at plate scale, mobile, perf under the added attributes (one
extra float per dot for shade; the reseed budget discipline already exists).

---

## 8. constraint / constitution audit

| constraint (source) | how the thread honors it | tension |
|---|---|---|
| photos are the hero; 3D serves them (PRODUCT.md 1) | the landing is prints-first (P2 ≥15% vs v1's 2.1%); terrain is the table under them | prints occlude terrain dots; accepted deliberately, flagged §9.2 |
| one loud moment per surface (PRODUCT.md 2) | the loud moment is the landing sequence (outline → light → sheet); at rest the plate is calm | outline draw + sheet spread + stacks is three beats; they must share the one clock (P6) or it's three quiet moments |
| readable text stays in DOM (PRODUCT.md 3) | captions, counts, sheet numbers, scale bar: all DOM in the instrument register | none |
| positions never lie (GLOBE-V2 §2.3) | anchors unchanged; stacks tie to geometry; wash stacks claim no point and say so in the caption | a print stack near (not at) a ring is a new "near, tied" grammar; §9.3 |
| precision becomes geometry (GLOBE-V2 §2.3) | point/ring/feature/wash all survive; wash re-colored neutral | the wash stops being scarlet; must still read as a claim, not just lighting; §9.4 |
| nothing labelled that isn't ours (v1 §3) | upheld for text absolutely; borders enter as geometry, argued as world-fact like coastline | this is the one genuine constitution ruling in the doc; §9.1 |
| one canvas, drei View, scaleRef machine (hard constraint) | untouched | none |
| dot-matrix as material | terrain, outline, marks, graticule: all dots; only prints and text are not, exactly as at world scale | none |
| scarlet on charcoal, accent used small | scarlet contracts to marks and ties; the biggest scarlet areas (washes, badges) go neutral/typographic | less scarlet on screen than v1; brand reads through precision, not coverage |
| fan → FramePop contract | sheet frames open FramePop; world-scale pickup fan untouched | esc now has three depths (pop → sheet → world); ordering must be exact |
| darkroom register (CONCEPT-LIVE-DARKROOM) | light table, contact sheet, grease-pencil marks, instrument counts: the plate becomes the register's best expression | instrument dressing must stay quiet or the plate becomes a dashboard |
| entrance choreography dialect (memories) | scan front draws the outline; stacks label-lag; return keeps residual momentum | none new |

---

## 9. constraint-risk flags

Stated plainly.

1. **Borders vs "nothing labelled that isn't ours".** v1's sentence names
   labels, and borders are geometry, not text; coastlines (equally world-facts
   we didn't make) already ship. But it's a real loosening of the strictest
   reading, and borders are mildly political objects (Natural Earth draws de
   facto boundaries). No current cap touches a disputed line; a future one
   could. This must be Rouven's explicit ruling, not a silent default.
   **Recommendation: allow borders as geometry, keep the text prohibition
   absolute, note the de facto policy in the build script header.**
2. **Photo-first occludes the honest map.** Prints at 10–12% vh physically
   cover terrain and can cover marks. The concept accepts occlusion of
   *terrain* and forbids occlusion of *another place's mark or caption* (the
   solver's hard constraint). If the solver can't satisfy that on some future
   dense cap, print scale drops before honesty does.
3. **"Near, tied" is a new position grammar.** v1 put the thumbnail chip at
   the pin; v2 puts a stack beside a ring with a tie. The tie must be
   unambiguous (one dot wide, scarlet, short) or relative position quietly
   starts lying. If a landed still ever makes a viewer misread which ring a
   stack belongs to, that's a P4 failure.
4. **The neutral wash must stay a claim.** Re-colored from scarlet, the
   country wash risks reading as hillshade rather than as "known only to the
   country". Mitigation: the wash is flat (unlit, even) while relief is
   gradient, and the caption always carries the precision word. If stills
   show the two confusing each other, the wash gets a texture cue (sparser
   dot lift) rather than its alarm color back.
5. **Auto-open steals a choice.** Landing with germany's sheet already spread
   is opinionated; a visitor who wanted the dolomites first pays one tap.
   Accepted: the alternative (v1's landing) showed nothing and asked the
   visitor to do all the work. The rule is mechanical (largest collection ≥8
   frames), so it never surprises twice.
6. **Two count grammars during rollout.** Until the world-scale chips are
   restyled in the same pass, badges live at world scale while brackets live
   on the plate. Ship both in one stage (§10 A) to avoid the site
   disagreeing with itself.

---

## 10. staging: what survives, what's a re-skin, what's a rebuild

**Survives untouched:** the shader morph (`aPlate`/`uMorph`/`uFlat`), the
peel/scan choreography, `plate.ts`, `clusters.ts`, `terrain.bin`, the
`scaleRef` state machine and its four exits, the resumable reseed cursor, the
idle prefetch, FramePop, the world-scale pickup fan, the gate-script harness.

**Dies:** the horseshoe fan at plate scale, the badge circles (both scales),
the centered-cap framing, the scarlet country/region wash color.

- **stage A — the re-skin (days, no new assets).** Fit-to-bounds framing via
  the shipped adaptive-spread mechanism (center offset, title-band bias,
  zoom floor/ceiling); badges → instrument counts at both scales; wash color
  split (neutral lift vs scarlet marks); stack pin variant with larger
  prints, scatter and caption lines. *Gate: germany + NZ landed stills vs
  the s5 baselines; P1 (NZ), P3, P5-silent, P4 pass; germany judged by eye,
  the only judge that matters.*
- **stage B — the outline (small build).** `build-borders.mjs` from Natural
  Earth admin-0 lines + coastline → `borders.bin`; seed the stroke into the
  plate layer; the scan front draws it first. *Gate: P1 passes on germany;
  asset ≤ ~60KB; reseed stays inside the 6ms budget.*
- **stage C — the lamp (shader/seed re-skin).** Per-dot hillshade brightness
  baked at reseed from `terrain.bin` normals, NNW light. *Gate: P5, judged
  on stills of germany (flat north vs alpine arc) and NZ (southern alps).
  If it fails, ship the even ground and stop; the outline carries P1.*
- **stage D — the sheet (component rebuild).** Grid contact sheet + placement
  solver + leader lines + auto-open rule; FramePop wiring; esc depth order.
  *Gate: P2, P7; 2/9/15 layouts probed; solver never covers a caption;
  reduced-motion parity (P8).*
- **taste gate after D:** route legs (R6), lowering the singleton threshold
  for sydney, mobile default, deep links. Decided with eyes on the real
  thing, per PLAN §8's standing opens.

A is deliberately first and deliberately boring: it's the cheapest test of
whether the concept (not the pixels) was the problem. If germany reads
acceptable after A alone, B–D are upgrades rather than rescues.

---

## 11. open questions for Rouven, with recommendations

1. **Borders on the plate: yes or no?** The one constitution ruling here
   (§9.1). *Recommend yes: geometry is not a label, and a landlocked cap has
   no figure without it.*
2. **Print scale at landing.** Top prints at 10–12% vh, accepting terrain
   occlusion? *Recommend yes; this is the photo-first correction, and the
   number is tunable at stage A's gate.*
3. **Auto-open the heaviest sheet (≥8 frames) on landing?** *Recommend yes;
   it's what makes the worst cap photo-first at first paint (P2). Mechanical
   rule, no editorial state.*
4. **Wash goes neutral, scarlet contracts to marks.** Changes the shipped
   precision-tint look. *Recommend yes; the 0.12 scarlet wash was flagged as
   "error red" in the plan's own opens, and grease-pencil-scarlet-as-marks is
   the stronger brand statement.*
5. **Cluster title grammar.** `germany · vienna · dolomites` mixes three
   scales in the display line. *Recommend: keep the member list but demote it
   to the instrument meta line; the display title names the cap by its
   heaviest member (`germany`) or a hand-named region. Small, editorial,
   stage A.*
6. **Sydney at 7 frames can't dive.** *Recommend: lower the congested-
   singleton threshold to 6 after stage A proves the landing is worth
   entering.*
7. **Route legs on the plate (R6).** *Recommend: taste gate after stage D,
   NZ plate first, exactly as PLAN scoped it.*
8. **Mobile default and deep links.** *Recommend: keep parked until the
   desktop landing is judged good; both get louder if v2 works (§2.5).*

---

## 12. cheap validation

The load-bearing assumption is §2.3.1 + §2.3.2 together: **the outline gives
a landlocked cap a figure, and prints at survey scale sit on the map without
destroying it.**

**Test A, one hour, zero code.** Take `s5-germany-landed.png` into an image
editor. Draw the german border + coast as a one-dot dotted stroke in bone.
Delete the three badges. Paste three real prints at ~120px height with mono
captions, and a 5×3 grid of the fifteen germany frames at ~90px in the left
third with a thin scarlet leader line. Dim the terrain 40%. Look at it next
to the shipped screenshot. This is the entire concept as a still, and the
germany case is the only judge it needs. If the still doesn't clearly beat
the shipped frame, stop before stage A.

**Test B, thirty minutes, zero code.** Same edit on the NZ still, to confirm
the case that works isn't damaged: the coastline becomes the stroke, the
stacks grow, queenstown's sheet spreads. If NZ gets worse, the print scale is
wrong, not the concept.

**Test C, stage A only, real build.** Reframe + badges + wash split with no
outline and no lamp, screenshot germany. This isolates how much of the
failure was framing and grammar alone, and prices stages B–D accordingly.

---

## sources for the cross-domain references

- [Magnum Contact Sheets research notes](https://erickimphotography.com/blog/magnum-contact-sheets-research-notes-screenshots/) and [grease pencil, Wikipedia](https://en.wikipedia.org/wiki/Grease_pencil) — selects marked directly on the sheet in china marker, editors' red marks, the physical trace of the hand on the survey object. Borrowed: the flat all-frames-at-once survey and scarlet-as-grease-pencil.
- [Eduard Imhof](https://en.wikipedia.org/wiki/Eduard_Imhof), [Cartographic Relief Presentation](https://books.google.com/books/about/Cartographic_Relief_Presentation.html?id=cVy1Ms43fFYC) and [terrain cartography, Wikipedia](https://en.wikipedia.org/wiki/Hillshade) — relief as oblique illumination from the upper left, the convention that keeps terrain from inverting. Borrowed: light, not size, as the relief channel.
- [Natural Earth admin-0 boundary lines](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-boundary-lines/) and [Natural Earth licensing](https://gisgeography.com/natural-earth-data-free-gis-public/) — public-domain border vectors at 1:50m/1:110m, de facto boundaries by default. Borrowed: the borders asset source, with the de facto policy noted as a flag rather than hidden.
