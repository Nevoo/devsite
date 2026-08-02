# CONCEPT-LOG-HOVER.md

How the frames in `the log.` should behave under a cursor. A depth-then-range-then-convergence exploration, written against `src/pages/Home.tsx` (Log ~367, LogRow ~443), `src/styles/site.css` (.log-*), `src/content/outings.ts`, `src/components/Lightbox.tsx`, PRODUCT.md, CONCEPT-LIVE-DARKROOM.md and PLAYFUL.md. Companion to those documents; nothing here has been built.

---

## 1. concept summary

The chosen thread is **the loupe**. Hovering a frame is setting a loupe down on the contact sheet: the frame un-crops from the strip's enforced 3/4 cell to its true aspect ratio and lifts slightly off the sheet, a scarlet hairline rings it like a grease pencil about to commit, and the row's mono meta column becomes a live readout of what the file actually says: `[ 03/09 ] dsc03700 · +3 min · filed: travel`. Click, and the existing Lightbox opens on that outing at that frame, which is the print. Everything is CSS transforms and GSAP on the plain `<img>`s that are already there; the GPU budget the globe owns is never touched. On touch there is no hover, so tap goes straight to the Lightbox, and under reduced motion the ring and the readout appear without the lift.

The metaphor earns its place because it is what actually happens at a light table: you do not decorate a contact sheet, you bring your eye closer and you read the edge data. Hover is attention, and the log's answer to attention is disclosure, not performance.

---

## 2. depth

### 2.1 what the log is, before any hover exists

The section's own comments define it: rows are truthful records off the EXIF, "the globe says where, this says when and what, and neither invents anything the files do not contain" (`Home.tsx:363-365`). The strip is explicitly a contact sheet, "every frame from that outing, in capture order, at one size" (`site.css:533-536`). And the frames are deliberately plain `<img>`, not WebGLImage, because 28 shader planes would spend the globe's GPU budget on thumbnails (`Home.tsx:471-474`).

The current state: `.log-frame` has no hover style at all, no cursor change, no click handler. The Lightbox is opened only by Gallery (`Gallery.tsx:78`). The log's frames are the only photographs on the site that do nothing when touched. Dead pixels on the most truthful section of the page.

One more fact that turns out to be load-bearing: the 3/4 cell is a lie the grid tells. `.log-frame` forces `aspect-ratio: 3 / 4` with `object-fit: cover`, so every landscape frame in the log is shown center-cropped, sometimes losing half its composition. The contact sheet claims to be the honest record and then crops every negative to fit its sleeve.

### 2.2 jobs

**Functional.** Let a visitor inspect a frame that is currently 4.5 to 8rem wide and cropped, and reach the full picture without leaving the page flow. Give the log's frames the same basic dignity every other photograph on the site has: they respond, and they lead somewhere.

**Emotional.** The pleasure of leaning over a light table: curiosity rewarded with detail, an instrument responding precisely under the hand. For the dev-client audience, the secondary job: a hover this exact, running at 60fps on plain DOM, is quiet evidence of craft.

### 2.3 load-bearing assumptions

1. **The log's frames deserve interaction at all.** If they are purely evidentiary wallpaper, any hover is noise. I think the section's own lead defeats this: it invites reading ("the files sort them by the day they happened"), and a reader will try to look closer.
2. **A hover can stay in the instrument register.** Precise, immediate, no bounce, no idle motion. If the mechanic cannot be built without easing that reads as "delightful", it breaks the section's identity.
3. **The truthful data is interesting enough to surface.** The whole point of the log is that `nature` and `travel` sit three minutes apart (`site.css:534-536`, `outings.ts:10-12`). A readout that shows `+3 min · filed: travel` after a frame filed under `nature` makes the section's one argument legible at hover speed. This assumption is the strongest of the three.
4. **Compositor-only effects feel of the same family as the WebGL surfaces.** The site's motion language is GSAP with power eases everywhere; the shader is not what makes it feel coherent, the timing is.

### 2.4 first principles

On a real contact sheet nothing animates. The photographer brings a loupe, reads the frame numbers on the rebate, and marks keepers in grease pencil. So the native interactions of this object are exactly three: **magnify, read, mark**. Every hover concept for this section should be derivable from one of those, or it is imported from somewhere else and will read as costume.

Second principle: **hover is a query against the record.** The row already has an instrument panel, the mono `.log-meta` column. A record with a panel next to it wants the panel to be live: point at a frame, the dial moves. That is CONCEPT-LIVE-DARKROOM rule 1 (one instrument register) and rule 2 (live, not archived) applied to the one section that is most literally a log.

Third: **the photograph must not change; the view of it may.** Develop-wipes, saturation lifts and grades belong to the WebGL surfaces where they mean something. A thumbnail that changes color on hover implies the record was shown false by default.

### 2.5 second-order implications

- The log becomes a third viewer entry point (globe FramePop, gallery Lightbox, log Lightbox). That is fine and already designed for: the Lightbox "shows whatever stack the opener handed the store" (`Lightbox.tsx:8-9`), and `framesOf(outing)` is the stack.
- The meta column becomes live, which raises its status. It should adopt the bracketed instrument register from CONCEPT-LIVE-DARKROOM move 1 at the same time, or the readout will ship in a fourth index style.
- Once one frame per row can be inspected, the un-crop quietly documents which frames were shot landscape. That is more truth, not less.
- Frames become buttons, which means the log becomes keyboard-traversable. Twenty-eight new tab stops on the home page: real, acceptable, and it makes the section accessible for the first time.

### 2.6 failure modes, including the quiet ones

- **The awwwards costume.** The cursor-following floating preview is the most copied portfolio pattern of the decade. It exists to reveal images that a text list hides. The log already shows every image; importing the pattern here solves a problem the section does not have and reads as decoration on a document.
- **The e-commerce zoom.** A plain uniform `scale(1.1)` inside `overflow: hidden` is the generic dark-portfolio default, anti-reference 2 in PRODUCT.md.
- **The counterfeit develop.** Grayscale-to-color on hover in CSS filter would fake the site's one big idea (the shader's log-to-rec.709 wipe) at thumbnail quality, and it inverts causality: on this site the develop plays itself, it is never gated behind a gesture. Worse, it shows the archive desaturated by default, which is a lie about the files.
- **The skeuomorph.** Sprocket holes, Kodak edge print, film rebate textures. These frames came off an ILCE-7; fake film edges are the kitsch PLAYFUL.md 8.7 warns about. The honest edge data is the DSC filename, which is real.
- **Truth leak.** Any readout that prints a clock time violates the hard rule in `outings.ts:21-27` (camera-local CET, wrong by seven hours in Bali). Relative spacing between frames survives any fixed offset, so deltas are the safe currency.
- **Flicker under a sweeping cursor.** A cursor dragged across nine frames fires nine readout updates. If those animate, the meta column strobes. Readouts snap; only the loupe eases.
- **Layout reflow.** `.log-strip` is a wrapping flex row. Any hover that changes layout width (sibling squeeze, real aspect-ratio changes) reflows the wrap mid-hover. Everything must be `transform`.

### 2.7 constitution tests

| # | test | question |
|---|---|---|
| L1 | budget | zero WebGL, zero new textures, compositor transforms only? (`Home.tsx:471-474`) |
| L2 | gating | does a visitor who never hovers lose content? must be no |
| L3 | truth | is every revealed character read off the files, with no clock times ever? (`outings.ts:18-27`) |
| L4 | register | is all revealed text mono, lowercase, bracketed per the instrument register? (darkroom rule 1) |
| L5 | hero | does the effect happen on or for the photograph, not beside it? (PRODUCT.md principle 1) |
| L6 | restraint | no idle motion, no bounce, nothing moves before the pointer commits? |
| L7 | one loud moment | is this the log's single signature, not a second one? (principle 2) |
| L8 | reduced motion | is the static state complete under `prefersReducedMotion()`? |
| L9 | touch | does a phone get the content without a hover state existing? |
| L10 | dom | is every readable word selectable DOM text? (principle 3) |

---

## 3. range

Fourteen positions. Cross-domain references, inversions and combinations labelled.

### r1. the lift (magnify, minimal)
The hovered frame scales up in place, transform only, z-raised over its neighbours, quick power3 ease, nothing else changes. It is the smallest honest move and it passes every test, but alone it is the e-commerce zoom with better timing. Its value is as the chassis other ideas bolt onto, not as the answer.

### r2. the un-crop (magnify + truth)
The hovered frame relaxes from the strip's 3/4 cell to its native aspect ratio, which `Photo` already carries as `width`/`height` (`categories.ts`). Done with a non-uniform scale on the cell and an inverse scale on the image, it is pure transform, no reflow, and the moment reads as lifting the negative off the sheet: a 3:2 landscape springs to double width at the same height and you suddenly see the composition the sleeve was hiding. This is the one mechanic in the whole space that makes the hover mean something only this section can mean: the crop was the grid's lie, and attention removes it.

### r3. sibling squeeze / filmstrip accordion (cross-domain: the flex accordion, Codrops)
The classic horizontal accordion: hovered item grows via `flex-grow`, siblings compress, the strip breathes like a bellows. On a single-line strip it is gorgeous; on `.log-strip`, which wraps (`flex-wrap: wrap`, `site.css:539`), every hover re-wraps the row and frames jump between lines. Rejected on mechanics before taste even gets a vote.

### r4. the floating preview (cross-domain: the awwwards list-hover, e.g. Roche Musique's "list image hover")
Hover a row and a large image chases the cursor. The pattern's entire purpose is to reveal a picture that a text index hides, and the log hides nothing: every frame is already on the table. Importing it would demote the actual strip to a hit area for a redundant popup and it is the single most recognisable cliché in the space. Rejected as costume.

### r5. the readout (read)
Hovering a frame changes no pixels on the image; instead the row's meta column live-updates in the instrument register: `[ 03/09 ] dsc03700 · +3 min · filed: travel`, place appended when the frame is placed in `places.ts`. Every token is real: index from position, filename from `src`, delta from the per-frame `at` timestamps (safe under the timezone rule because relative spacing survives fixed offsets, `outings.ts:23-24`), category from the `src` path. This is the section's thesis made interactive: sweep the october strip and watch `filed:` alternate between nature and travel while the deltas read `+3 min`.

### r6. the grease pencil (mark; cross-domain: Magnum contact sheets)
On hover a scarlet hairline ring draws around the frame in ~150ms, the chinagraph mark a photographer puts on a keeper, borrowed precisely from the *Magnum Contact Sheets* vocabulary that PLAYFUL.md R2 already imported for the featured rows. Hover is a provisional ring; click commits it and opens the viewer. Cheap, on-brand, and it gives the accent a job that means "chosen" rather than "highlighted".

### r7. develop-on-hover (rejected on principle)
Frames sit desaturated or flat and grade to full color under the cursor, echoing the hero's develop-wipe in CSS filters. It fails the truth test (the record shown false by default), fails the gating test (27 of 28 frames permanently ungraded for a non-hovering visitor), and counterfeits the shader's one big idea in a cheaper material. The strongest-looking wrong answer in the space.

### r8. hover-scrub (inversion: one frame, time inside it; cross-domain: video thumbnail scrubbing)
Collapse each strip to a single representative frame and scrub through the outing's frames as the cursor moves along its width, the way Vimeo thumbnails scrub a timeline. Genuinely interesting inversion, and completely wrong here: it hides the contact sheet the section exists to show, gating content behind an interaction, which is the 2021 camera again. Rejected.

### r9. the dimmed table (light-table focus)
Hovering a frame dims its siblings a stop and lets the hovered cell's backlight rise, an enlarger-focus move that suits a darkroom. But it makes photographs less visible in the one section whose job is showing everything at once, and 27 frames dipping in unison is a lot of motion for a record. Rejected; a whisper of it (the film-base tint under the hovered cell brightening) can ride along free.

### r10. the edge print (read, honest version)
A tiny mono caption appears at the frame's lower edge on hover: `dsc03700`, the file's actual name, the digital equivalent of frame numbers on a rebate. Truthful and cheap, but as a standalone it is a label with no destination and no magnification. Folded into r5's readout, where the filename token does the same work in a better place.

### r11. promote-to-WebGL (the arguable exception)
One shared WebGLImage plane mounts over the hovered frame and runs the saturation lift the big planes have, keeping total plane count at one. It technically honors the budget's letter, but it costs a texture upload per hover (visible pop-in on cold cache), a positioning dance over a Lenis-scrolled list, and it buys nothing r2 does not deliver in pure transforms. The budget comment's spirit is "thumbnails are not where the GPU goes"; rejected.

### r12. inversion: the row is the unit
No per-frame hover at all. Hovering anywhere on the row turns its bottom hairline scarlet, fills the index mark, and lifts the whole strip 2px as one object; clicking any frame opens the Lightbox. The purist reading, and the runner-up: it says the outing, not the frame, is the archive's atom. Its ceiling is that it answers attention with a border color while the visitor is plainly pointing at one specific photograph.

### r13. inversion: no hover, click only
Frames become buttons with a cursor change and a focus ring, tap or click opens the Lightbox, and nothing else ever happens. Maximum restraint, zero risk, and it wastes the only section where the meta column is sitting right next to the images begging to be an instrument. Kept as the floor every other option must beat.

### r14. combination: the loupe (r2 + r5 + r6, on r1's chassis, with r13's click)
Un-crop under the cursor, ring in scarlet, readout in the meta column, click to the print. Magnify, read, mark: the three native interactions of a contact sheet, one gesture each, one mechanic total.

---

## 4. convergence

**Selected: r14, the loupe.** Built in the order r13 → r6+r5 → r2 (see section 10).

**Over r12 (row-unit hover), the real runner-up.** r12 is the safest true-to-register option and it loses on specificity: the visitor's cursor is on one frame, and answering with a row-level border reads as the site not noticing. The log's argument is made of per-frame facts (this frame, three minutes after that one, filed elsewhere), and only a per-frame hover can speak them. r12's best move, the scarlet row hairline, survives as a passive side effect worth keeping.

**Over r13 (click only).** It is the floor, and phase 1 literally ships it. But stopping there leaves the meta column dead next to a live pointer, and leaves the 3/4 crop lying with no moment of truth short of a modal.

**Over r5 alone (readout only).** Tempting for purity, but text-only response to pointing at a picture fails PRODUCT.md principle 1 sideways: the effect happens beside the photograph while the photograph does nothing. The un-crop keeps the image the hero of its own hover.

**Over r1/r3/r4 (lift, squeeze, floating preview).** r1 is generic without r2's truth payload. r3 breaks on the wrapping strip. r4 solves a hidden-image problem the log does not have and is the most recognisable cliché available; the section that claims to be the honest record is the last place to wear it.

**Over r7/r8/r11.** Each fails a hard test outright: truth and gating (r7), gating (r8), the budget's spirit plus texture pop-in (r11). Reasoning in section 3.

**Why the loupe wins positively, not just by elimination.** It is the only thread where the metaphor, the data and the constraint all point at the same gesture. The darkroom concept says instruments and liveness; the outing data has exactly one safe, interesting per-frame fact family (order, spacing, filing, filename); the budget says transforms only; and a loupe is precisely a transform: nothing about the negative changes, your view of it does. The hover also *performs the section's thesis*: sweep the october strip and the readout alternates `filed: nature`, `filed: travel` over three-minute deltas, which is the entire argument of `Home.tsx:352-365` delivered by the visitor's own hand.

---

## 5. the experience

Desktop, fine pointer. She has scrolled past the globe and the grade and is in the log.

She reads row 03: `[ 03 ]  16 oct – 22 oct '23  9 frames  bali · uluwatu · …`. Nine small portrait-cropped frames in a strip. Her cursor drifts onto the second one.

The frame lifts. Not a bounce: a 250ms power3 settle, and as it lifts it *widens*, the portrait sleeve relaxing into a 3:2 landscape, and suddenly there is a whole coastline where there was a slice of one. A scarlet hairline rings it. In the same instant, with no animation at all, the `9 frames` line in the meta column now reads:

`[ 02/09 ] dsc03694 · +3 d · filed: nature`

She slides right one frame. The first one snaps back to its sleeve, the next lifts and un-crops, the readout ticks: `[ 03/09 ] dsc03700 · +3 min · filed: travel`. Three minutes apart, filed in different galleries. The lead sentence she half-read a moment ago ("the galleries sort these by subject; the files sort them by the day they happened") just happened under her finger.

She clicks. The Lightbox opens on that frame, labelled `16 oct – 22 oct '23`, arrow keys walk the outing in capture order, `[ 03 / 09 ]` in the corner in the same register the readout used. Escape. The row is exactly as she left it, hairline still scarlet under her cursor.

On her phone later, there is no hover to find and nothing is missing: she taps a frame, the Lightbox opens, swipes walk the outing. The un-crop and the readout were desktop garnish on a door that works everywhere.

---

## 6. candidate mechanics

Each traced to data or code that exists today.

**6.1 click-to-lightbox.** `openLightbox(label, photos, index)` exists (`stores/ui.ts:30,52`), `framesOf(outing)` returns the stack in capture order (`outings.ts:163`), `span(from, to)` already formats the label (`Home.tsx:433`). Wrap each `<img>` in a `<button>`. Dependency: none.

**6.2 the readout.** Frame index and count: array position. Filename: parse `dsc\d+` off `frame.src`. Delta: per-frame `at` timestamps exist on `outing.frames` (`outings.ts:50`), and the file's own header licenses relative spacing while banning absolute times. Format rule: `+37 s` / `+3 min` / `+2 h` / `+3 d`, first frame prints no delta. Filed-under: segment two of the `src` path (`/images/categories/{cat}/…`). Place: `placeOf.get(frame.src)?.label`, already imported in LogRow. Dependency: none. Note that `framesOf` returns `Photo` (no `at`), so the readout reads deltas from `outing.frames` by index, same order.

**6.3 the un-crop.** Native ratio: `Photo.width` / `Photo.height`. Mechanic: stop relying on `object-fit: cover` for the crop (a transform cannot escape object-fit's internal crop); instead absolutely position the img inside the cell at its native ratio, sized and centered to cover the 3/4 box, clipped by the cell's existing `overflow: hidden`. On hover, GSAP animates the cell to `scale(sx, sy)` where `sx/sy = nativeRatio / cellRatio` (clamped so neither axis drops below 1) and the img to the inverse, so the visual box becomes the native ratio and the image inside stays undistorted while more of it enters the clip. Transforms only, one frame animating at a time, `z-index` raised on the cell, `will-change` applied on enter and removed on leave. Dependency: none, but it is the fiddly 30 lines; see section 12 for validating it first.

**6.4 the ring.** A scarlet hairline on hover/focus. Because the cell scales non-uniformly, a border on the cell would thicken unevenly; put the ring on an element that shares the img's inverse transform, or accept the sub-pixel unevenness at these factors (it is 1px at ~1.9× worst case). Draw-on via `stroke-dashoffset` if SVG, or just appear; instruments may snap.

**6.5 cursor label.** `Cursor.tsx` resolves `data-cursor` targets per PLAYFUL.md 6.6; give the buttons `data-cursor="view"` like the gallery items. Dependency: confirm the attribute contract in `Cursor.tsx` at build time.

**6.6 focus.** `:focus-visible` on the button triggers ring + readout via the same handlers (focus/blur mirror pointerenter/leave); Enter opens the Lightbox. Dependency: none.

**6.7 reduced motion.** `prefersReducedMotion()` (`motion/gsap.ts`) gates the un-crop and any draw-on; ring and readout are state, not motion, and stay. The Lightbox already handles its own entrance.

---

## 7. constraint / constitution audit

| principle (source) | how the loupe honors it | tension |
|---|---|---|
| no WebGL thumbnails, globe owns the GPU (`Home.tsx:471-474`) | pure compositor transforms on existing `<img>`s; zero textures, zero planes | none |
| nothing invented beyond the files (`Home.tsx:363-365`, `outings.ts:18-27`) | every readout token is index, filename, delta or path; deltas are offset-safe by the file's own argument | never print a clock time; the delta formatter must have no absolute-time branch at all |
| photos are the hero; effects on them, not beside (PRODUCT.md 1) | the photograph itself un-crops and lifts; the readout is secondary | the readout is beside the image; defensible because it is the row's existing panel, not a new surface |
| one loud moment per surface (PRODUCT.md 2) | the log currently has none; the loupe becomes its single signature | the un-crop of a 3:2 frame doubles its width; cap the effect at one frame at a time, no idle state |
| readable text in DOM (PRODUCT.md 3) | readout is plain text in `.log-meta`; ring is `aria-hidden` decoration | none |
| anti-ref: gimmick over content, nothing gated (PRODUCT.md) | zero content behind the hover; the strip and the lightbox exist without it | none |
| instrument register, one spec (darkroom rule 1) | readout ships bracketed mono lowercase; reuses `Index` (`n of total`) where it fits | the count line should adopt `[ 9 frames ]` style at the same time or the row mixes registers |
| live, not archived (darkroom rule 2) | the meta column becomes a dial that answers the pointer | none |
| prints carry the color (darkroom rule 3) | no filters ever touch the thumbnails; accent appears only as the ring and hairline | none |
| restraint is the log's identity (task brief) | no motion until the pointer commits; readouts snap, only the loupe eases | the lift overlapping adjacent frames is deliberate; if it reads as loud in the build, reduce the area factor, not the truth of the ratio |
| lowercase everything (brand voice) | all readout tokens lowercase | none |
| prefersReducedMotion guard standard (codebase) | un-crop gated; static state complete | none |

---

## 8. constraint-risk flags

- **the clock-time trap.** the delta formatter is one careless branch away from printing `22:36` for a balinese sunrise. the rule in `outings.ts:21-27` is absolute. the formatter must be written so absolute times are unrepresentable, not just avoided.
- **register fragmentation.** shipping the readout before the index-register unification (darkroom move 1) adds a fifth index style to the site. either adopt the bracketed spec in the readout from day one or do move 1 first.
- **the lift overlaps neighbours.** a scaled frame paints over adjacent frames and can cross the row hairline. intended (a negative lifted off the sheet sits above it), but it must never overlap the meta column's readout while the readout is describing it; transform-origin and max scale need one deliberate pass.
- **hover churn.** a fast sweep across nine frames must not queue nine tweens; use overwrite-safe quickTo-style tweens per row and snap readouts with zero animation.
- **the budget comment goes stale.** `Home.tsx:471-474` says the frames are plain img for budget reasons; after building, extend the comment to record that the hover is compositor-only, so the constraint survives the next refactor.
- **touch gets less.** phones get tap-to-lightbox but no readout and no un-crop. accepted asymmetry (hover is a fine-pointer concept), but it should be a recorded decision, not an accident.
- **28 new tab stops.** keyboard users now traverse every frame on the home page. correct for a11y, but worth checking the tab path past the log still feels sane.

---

## 9. what to explicitly NOT build

- **the cursor-following floating preview.** the log hides no images; the pattern is pure costume here.
- **grayscale/flat-to-graded hover.** lies about the record, counterfeits the shader's one idea.
- **sibling squeeze on the strip.** the strip wraps; flex-grow hover reflows the wrap.
- **a shared WebGL hover plane.** texture pop-in and positioning cost for nothing r2 doesn't already do.
- **hover-scrub replacing the strip.** gates the contact sheet behind a gesture; the 2021 camera in new clothes.
- **sprockets, rebates, film textures.** digital files; skeuomorphic kitsch. the filename is the honest edge print.
- **sibling dimming.** the record stays fully visible at all times.
- **auto-scrolling / marquee strips.** idle motion in the one section defined by stillness.
- **per-frame parallax or jelly.** those belong to the WebGL planes; imitating them in CSS dilutes both.
- **a second click target (e.g. "open outing" links).** the frames are the doors; one door type per row.

---

## 10. phase fit / sequencing sketch

Fits after the globe pickup hero and the grade section are stable (they are), and ideally after or together with the darkroom concept's move 1 (register unification), because the readout wants the bracketed spec. It is the log's turn anyway: it is the only home-page section with no interactive signature.

1. **phase 1, the door.** button-wrap the frames, `data-cursor="view"`, click/tap/Enter opens the Lightbox via `framesOf`. touch parity and a11y land here. no motion at all. this alone beats the status quo.
2. **phase 2, the instrument.** ring on hover/focus + live readout with the delta formatter and its no-absolute-time guarantee. registers unified.
3. **phase 3, the loupe.** the un-crop: manual cover positioning, non-uniform scale + inverse scale, reduced-motion gated. ship behind one row first, screenshot at 1440 and 390, then roll to all rows.
4. **phase 4, polish.** overlap pass, will-change hygiene, comment update in `Home.tsx`.

---

## 11. open questions

1. **does the readout replace the `9 frames` line or add a line?** replacing is tighter but the column height must not shift; same line-height, swap in place.
2. **should click eventually FramePop instead of Lightbox?** the hero's genie viewer is the richer family member, but it is welded to the globe's canvas tour. Lightbox now; revisit only if the genie ever generalises.
3. **how far does the un-crop lift?** area factor ~1.5 is a guess; the right number comes from looking at a build at 1440 and at the 900px breakpoint where cells shrink.
4. **do single-frame outings (four of eight rows) get a degraded readout** (`[ 01/01 ] dsc03588 · filed: nature`) or none? leaning degraded: consistency beats cleverness.
5. **does the scarlet row hairline (r12's survivor) ride along**, or is ring + readout already the budgeted amount of accent per row?

---

## 12. cheap validation

The load-bearing assumption is 2.3.3: **the per-frame truth is interesting enough to justify a per-frame hover.**

**test 1, twenty minutes, no code.** in devtools on the live build, hand-edit row 03's meta to the readout string for two different frames (`+3 min · filed: travel` vs `+3 d · filed: nature`) and screenshot both. show them to two people with one question: "what is this line telling you?" if neither reads the filing contradiction as the point, the readout is trivia and r12 (row hover) should be reconsidered.

**test 2, ~40 lines, one row.** prototype the un-crop in isolation: manual cover positioning, non-uniform scale + inverse scale, one landscape frame. the question is binary: does it read as *seeing the whole negative*, or as *a thumbnail glitching wider*? if the latter and no easing fixes it, drop r2, keep r1's uniform lift under the same ring and readout, and the concept loses its best moment but keeps its spine.

---

## reference patterns consulted (range research)

- the classic list-hover floating image, e.g. [roche musique "list image hover" on awwwards](https://www.awwwards.com/inspiration/list-image-hover) and the broader [hovers, cursors and cute interactions collection](https://www.awwwards.com/awwwards/collections/hovers-cursors-and-cute-interactions/) — studied and rejected as r4.
- cursor-mask reveals: [sweetpunk cursor image reveal](https://www.awwwards.com/inspiration/sweetpunk-cursor-effect), [hover trails and mask reveal](https://www.awwwards.com/inspiration/hover-trails-and-mask-reveal-on-cursor-move-marga-navarro) — same family, same rejection.
- flex accordion / sibling squeeze mechanics: [codrops accordion experiments](https://tympanus.net/codrops/tag/accordion/) and [css horizontal accordions roundup](https://freefrontend.com/css-horizontal-accordions/) — r3, breaks on a wrapping strip.
- layered-scale hover craft reference: [codrops repetition image hover effects](https://tympanus.net/codrops/2022/02/22/repetition-image-hover-effects/) — timing reference for the lift, not the mechanic.
- the loupe as real practice: [cinestill 8x film loupe](https://cinestillfilm.com/products/8x-magnifying-loupe), [b&h on film-editing loupes and light tables](https://www.bhphotovideo.com/explora/photography/features/film-editing-loupes) — grounding for the metaphor: magnify, read, mark.
- grease-pencil mark vocabulary: [magnum contact sheets](https://www.magnumphotos.com/theory-and-practice/magnum-contact-sheets/) — already imported by PLAYFUL.md r2; the ring borrows it per-frame.
