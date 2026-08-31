# WORLD-LAB — the "little world" experiment

The idea (2026-08-31, off-plan but welcome): instead of pins on an exact
globe, a **stylized curated world** of the places Rouven has been — Animal
Crossing Wild World as the reference image: a small horizon planet with
oversized built things standing on its curve. A place that earned it gets a
built form; the archive keeps everything else. Feeds globe-lab Gate 2 as a
metaphor candidate.

Decoded from pengzhe.ng (checked 2026-08-31): his "3D clay dioramas" are
**flat generated images** on a static Astro site — no 3D anywhere. The magic
is one locked style prompt + the update loop. Which means round one here
needs no gen-3D either: stylized images standing on our sphere as
billboards IS the Wild World construction (the DS did exactly this —
sprites on a rolled world).

## The experiment this lab decides

Can three place-images in ONE style stand next to each other on the sphere
and make Rouven grin? Style first, everything else later. If no style
sings, the concept dies cheap. If one does, it goes to Gate 2 with real
screenshots.

## Workflow

1. Pick a still from the archive (`public/images/categories/*/gallery/`).
2. Paste ONE template below into your image tool (ChatGPT / Gemini /
   Midjourney — whatever), attach the photo, swap only the `[PLACE]` slot.
   Change nothing else — consistency IS the experiment. Generate all three
   places in the same tool, same template, same session.
3. Export ~1024px PNG. Background: ideally exactly `#101013` (melts into
   the scene for free) or transparent. Any other flat colour works via the
   key-threshold slider.
4. Drop into `public/world-lab/`, add a `manifest.json` entry
   (`file`, `lon` −60..60, `lat` 20..45, `height` ~1.2), hit
   **reload assets** on `/lab/world`. Drag to spin. Screenshot, compare.

## Style templates (locked — swap only [PLACE])

**T1 · clay diorama (the Peng control)**
> A miniature handmade clay diorama of [PLACE], soft rounded forms, matte
> polymer clay texture with visible fingerprint softness, warm studio
> lighting from the upper left, gentle ambient occlusion, muted natural
> colours, centered single object on a solid #101013 background, slight
> three-quarter view, no text, no people.

**T2 · dark maquette (the site's own light)**
> A miniature architectural model of [PLACE] built from matte paper-white
> museum board, precise cut edges, tiny warm light glowing from within,
> one scarlet-red (#ff2d1a) accent detail, photographed in a dark room on
> a solid #101013 background, soft top light, shallow depth of field,
> centered, slight three-quarter view, no text, no people.

**T3 · paper-cut diorama**
> A layered paper-cut diorama of [PLACE], 5–6 stacked paper layers with
> visible depth between them, muted colour palette with one scarlet-red
> accent, soft shadows between layers, craft-paper texture, centered on a
> solid #101013 background, straight-on view, no text, no people.

**T4 · tilt-shift toy world**
> A tiny toy-scale miniature of [PLACE] as if photographed with a
> tilt-shift macro lens, saturated but soft colours, tiny trees and props,
> smooth toy-like surfaces, strong miniature-faking blur at top and
> bottom, centered on a solid #101013 background, high three-quarter view,
> no text, no people.

**T5 · handheld-console sprite**
> A chunky low-fi videogame sprite of [PLACE] in the style of a 2006
> Nintendo DS town object, limited colour palette, slightly pixelated
> clean silhouette, flat cel shading with simple two-tone shadows,
> centered on a solid #101013 background, front three-quarter view, no
> text, no people.

## The lab (`/lab/world`, dev-only)

Horizon sphere (radius 3.4, same near-charcoal as the globe's occluder),
billboards tangent-planted on the cap — up follows the sphere normal, so
things wrap over the horizon as the world spins (drag, or auto spin).
Chroma-key shader for non-#101013 backgrounds. The darkroom dust rides on
top (toggle) — the D1 component, unchanged. Stand-ins right now are three
raw archive stills so the scene runs before any generation happened.

## What this does NOT decide

Check-in pipeline, gen-3D hero pieces, day/night, how many places, whether
this replaces the exact globe or lives beside it — all downstream of one
question: does a style exist that we want to live in. Everything stays out
of the production bundle (dev-only route, assets in public/world-lab/).
