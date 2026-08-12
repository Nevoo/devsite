# CONCEPT — the country zoom

*(2026-08-12, from Rouven: "if there are many images in a small spot, i have
no way of really seeing them all… what could be insane here is a sort of
'zoom' in effect that transitions into a topological view of the country.")*

## 1. The problem, now measurable

The real placement pass made pin congestion a fact, not a hypothetical:

- **germany** — 15 frames on one pin
- **sydney** — 13 frames on one pin
- **south island, nz** — four pins (queenstown, south island, milford sound,
  doubtful sound) inside ~250km, which is a couple of pixels of globe. Their
  labels physically overlap; three of the four are effectively unreachable.

Two distinct failures hiding in one symptom: (a) *pins* occlude each other at
globe scale, and (b) even a reachable pin with 15 frames gives no way to
survey its collection. The zoom idea addresses both with one motion.

## 2. The idea in one sentence

The globe is the enlarger; a crowded spot is a negative worth racking focus
onto — press toward it and the sphere unrolls into a topographic plate of
that country, pins spread to their true positions with room to breathe, and
the frames lay out like a contact sheet pinned to the terrain.

## 3. The two scales

**World scale (today's globe).** Nearby places merge into one cluster chip:
`new zealand · 4 places · 25 frames`. A cluster never lies about position —
it sits at the members' centroid and states a count instead of pretending to
be a place. Isolated pins render exactly as now.

**Country scale (the new register).** Selecting a cluster (or zooming past a
threshold on it) dives the camera; the sphere's local patch morphs into a
flat topographic plate — coastline, relief, nothing labelled that isn't
ours. The member pins spread to true positions. Each pin fans its frames as
small prints. Pull back (scroll out, esc, or the grab-and-fling the globe
already understands) and the plate re-wraps onto the sphere.

**Precision becomes visible here.** This is the part that makes the feature
belong to this site rather than to any map library: at plate scale, the
`precision` word stops being a caption and becomes geometry —

- `venue` → a point (cabo da roca can afford one)
- `town` → a small ring
- `island` / `fiord` → the feature's outline, softly filled
- `region` / `country` → a broad wash with no point at all

A germany plate showing 15 prints floating over a country-wide wash says
exactly what is known: these were made in germany, nowhere more precise. The
honesty mechanic (GLOBE-V2 §2.3) rendered, not footnoted.

## 4. Mechanics, against the existing architecture

- **One persistent canvas, drei View** — the plate is not a new canvas; it is
  the same View whose camera dives. BackgroundPass repaint rules apply
  (see drei-View memory).
- **The morph.** Two candidate implementations, in order of ambition:
  1. *Camera-only MVP:* dolly in; past a threshold crossfade the sphere
     against a flat plate (a plane displaced by a small DEM crop, same
     land-mask source as the globe). Cheap, ships first.
  2. *True unroll:* the globe vertex shader lerps each vertex from its
     sphere position toward a local tangent-plane (gnomonic) projection
     centred on the cluster — the planet visibly flattens under the camera.
     Spectacular, and contained entirely in one shader uniform (0→1).
- **Assets.** Coastline comes from the existing land-mask pipeline
  (`build-land-mask.mjs`); relief needs one small world heightmap cropped
  per country at load — no per-country files shipped.
- **Clustering.** Greedy merge by angular distance scaled by camera
  distance; recompute on zoom settle, not per frame.
- **State.** Extends the `selectedRef` contract with a `scaleRef`
  (world↔country) rather than a React route — the tour, the projection
  panel and the pickup cards all keep reading refs, and the entrance
  choreography's momentum-handoff rules apply to the dive and the return.
- **Frames on the plate.** Reuse the card fan / genie FramePop grammar from
  the pickup hero — the contact-sheet fan is the same component family, laid
  over terrain instead of over the horizon planet.

## 5. Staging

- **V0 — declutter (small, ship anytime):** cluster chips with counts +
  labels that shove each other apart; tapping a cluster steps through its
  members. Fixes "unreachable pins" without any new rendering.
- **V1 — the plate:** camera dive + crossfade to the flat topo plate,
  precision-as-geometry, contact-sheet fans. The feature as pitched.
- **V2 — the unroll:** replace the crossfade with the gnomonic shader morph;
  momentum handoff from fling-to-dive.

## 6. Risks / open questions

- The dive needs a *reason to return* — the world-scale tour must visibly
  wait, or visitors strand themselves on a country plate.
- DEM licensing/size: a 2–4k world heightmap is plenty at plate scale; pick
  a public-domain source (ETOPO/GEBCO class) once.
- Mobile: the plate is a better small-screen citizen than the globe (flat,
  scrollable), which may make V1 the *default* mobile presentation — worth
  deciding on purpose, not by accident.
- Bromo/da nang/chiang mai currently hold zero frames; clusters should count
  only frames, and a cluster of empty stops ("travelled, frames to come")
  needs its own honest chip.
