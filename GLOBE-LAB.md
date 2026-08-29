# GLOBE-LAB — creative design sprint brief

## Objective

Build `globe-lab`, a disposable sandbox project next to the devsite, to find the winning design for the one experience the portfolio hinges on: **discovering Rouven's travel journey through his photos.** (The 3D globe is the incumbent metaphor, not a requirement — see the anchoring warning below.) Research first, then build 3–4 deliberately contrasting prototypes behind a variant switcher with live-tunable parameters, so Rouven can play with each, tweak values himself, and pick a winner. Only the winner gets ported back into the real project.

## Why (the actual problem)

The devsite's globe→country transition is technically fine, but the experience isn't there: photos don't feel discoverable, and the journey — *where he went, in what order, what it felt like* — doesn't come through. Iterating inside the real codebase has stalled; every change fights existing architecture. The lab exists to explore the design question cheaply, free of that weight.

**Anchoring warning: the globe is the current answer, not the question.** The question is how a visitor should experience a nine-month world journey through real photographs. The current direction (globe + country zoom) may itself be the wrong frame — understand what exists, then think independently of it. Every prototype must take a concrete stance on:

1. **What is the primary space?** A globe/map (geography first), a photo field (images first, geography implied), a timeline (chronology first), or an archive metaphor (darkroom, contact sheets, film rolls)?
2. **What pulls you through?** The Oct 2025 – Jul 2026 world trip is one unbroken nine-month arc (FRA→AUH→DPS through BKK→BAH→CDG: Indonesia, Vietnam, Thailand, Australia, New Zealand, Philippines, Japan, Singapore). That's a literal path in time — is the navigation spatial (spin & find), temporal (scrub the journey), narrative (guided legs), or archival (browse & surface)?
3. **How do overview and photo hand off?** Whatever the primary space is, what's the gesture and choreography between "seeing the whole journey" and "being inside one photograph"?

## Context (embed — the executor starts blank)

- Real project: `/Users/rouven/Developer/personal/projects/websites/devsite`, branch `rework/threejs-portfolio`. **Do not modify it during lab work** — read-only reference.
- Stack to mirror in the lab (so the winner ports without translation): Vite 7, React 19, `@react-three/fiber` 9, `@react-three/drei` 10, `three` 0.182, GSAP 3.13, zustand 5. TypeScript.
- Reusable real data (copy into the lab, don't symlink):
  - `public/borders.bin`, `public/countries.bin` + their loaders `src/canvas/borders.ts`, `src/canvas/countries.ts`
  - `src/content/flights.ts` — 30 typed flight legs with airport coordinates (the journey spine)
  - `src/content/places.ts` — place sheet (coords are Rouven-only to fill; use what's there)
  - 12–20 real stills from `public/images`, downscaled to ≤1024px for the lab
- Brand: accent `#ff2d1a` on charcoal `#101013`. Keep the lab in this palette so aesthetic judgment isn't skewed by throwaway colors.
- Rouven runs `npm install` and dev servers himself — print the commands, never run them.

## Phase 1 — Research (bounded, deliverable: `globe-lab/RESEARCH.md`)

Two sweeps, 10–20 entries total:

- **Game design:** world-map and travel-map interactions — grand-strategy zoom/map-mode transitions (Civilization, EU4-style), travel-line maps (Indiana Jones red line, Uncharted chapter maps), map dives (Zelda, Google Earth cinematic flights), flight-sim globes.
- **Web/three.js:** awwwards/FWA-grade globes and photo-journey sites — Stripe globe, GitHub globe, travel portfolios, WebGL photo-navigation experiments. Note the *technique* (interaction pattern, transition choreography, shader trick), not just "looks nice".

Each entry: name, link, the specific technique, one line on the experience metaphor it implies (spatial / temporal / narrative / archival). Close the doc with **3–5 candidate directions** — one paragraph each, naming the borrowed techniques and taking a stance on the three questions above. Directions must span different primary spaces — not five variations of the globe.

## Phase 1b — Depth & range pass on the leading directions

Before Rouven judges, stress-test the strongest 2–3 directions with a conceptual depth-and-range exploration (the `conceptual-depth-range` agent): it reads the current state (PRODUCT.md, the concept docs, what shipped), then thinks independently — probing each direction for what it's really about, where it breaks, and what stronger adjacent ideas it implies. Its output sharpens or replaces the raw directions. This is where "we might be working in the wrong direction" gets tested explicitly.

**Gate 1: stop and show Rouven the deepened directions. He picks which become prototypes.**

## Phase 2 — Lab harness (before any prototype)

New Vite project at `/Users/rouven/Developer/personal/projects/websites/globe-lab` (sibling of devsite). Requirements:

- **Variant registry:** each prototype is one self-contained scene module (own folder, own params file). Switch via URL `?v=<n>`, number keys, and the control panel. No shared state between variants beyond the data loaders.
- **Control panel:** `leva`, one folder per variant. *Every* magic number goes through it — camera distance/FOV/easing, marker sizes, shader uniforms, animation durations. If it's tweakable in code, it's a dial.
- **Preset capture:** export current panel values as JSON to clipboard, import back. A winning config must be capturable, not remembered.
- **FPS meter** (drei `<Stats>`), always on.
- Allowed new deps: `leva` only. Everything else comes from the mirrored stack.

## Phase 3 — Prototypes

Implement 3–4 variants from the Gate-1 picks. Rules:

- **Contrast over refinement:** vary the fundamental metaphor (e.g. globe-spatial vs timeline-scrub vs photo-field-first vs archival/darkroom), not four flavors of one idea. At least one variant should not be globe-centric.
- Each reaches *feelable* state: real journey data and real photos wired in (borders/arcs only where the metaphor uses them), interactive, sensible default dial values. Ugly-but-honest — motion and layout fidelity matter, visual polish doesn't.
- Scope cap ≈ one focused day each. If a variant needs more, cut features until it fits; report the cut in Deviations.
- Throwaway code quality is fine, but keep each scene module self-contained so the winner can be lifted out.

**Gate 2: stop. Rouven plays, tweaks dials, exports presets, picks the winner (or orders a remix round).**

## Done test

Rouven can start one dev server, cycle all variants by key/URL, change every relevant value live without touching code, export a preset JSON, and — after playing — point at one variant + preset and say "this one". Only then write `PORT-PLAN.md`: what moves into devsite, what devsite architecture it replaces, in what order.

## Deviations

Every report ends with a `Deviations:` section — what diverged from this brief, why — or `Deviations: none`.
