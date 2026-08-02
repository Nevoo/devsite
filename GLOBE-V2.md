# GLOBE-V2.md

What the globe should be so that it actually shows the photographs at the places they were taken, and why the hero currently reads as empty.

Written against `PRODUCT.md`, `GLOBE.md`, `PLAYFUL.md`, `src/content/outings.ts`, `src/components/WorldGlobe.tsx`, `src/canvas/Globe.tsx`, `src/pages/Home.tsx` and `src/styles/site.css`. Every claim about the code points at a file and a line and was read, not assumed. `GLOBE.md` is treated here as a strong prior that gets stress-tested, not as authority: two of its conclusions are overturned below. This is a plan-idea document. Nothing here has been built.

---

## 1. Concept summary

The chosen thread is **the projection**.

The globe stops being a map with labels on it and becomes the tray of a slide carousel. It already walks its own pins, swings each one front-on, holds it for 2.6 seconds and advances (`Globe.tsx:331-361`). What it lacks is a screen. So the hero splits: the sphere moves off centre and gets smaller, and the space it vacates carries **one photograph at print scale, the photograph taken at whichever place is currently front-on**. Land, project, hold, advance. The globe selects; the photograph is the subject. That is `PRODUCT.md` principle 1 executed literally for the first time on this page, which today carries zero photographs above the fold.

The thing that makes it possible is one data decision, and it is not the one `GLOBE.md` reached for. `GLOBE.md` chose time because time was fully covered and place was not. But place is not missing from this archive, it is **unrecorded**. Rouven knows which venue the gig was in and which island the dawn frames came from. A natural history collection does not refuse to place a specimen because the collector wrote "near Kandy" instead of taking a GPS fix. It records the coordinate and, beside it, how far it might be wrong (`coordinateUncertaintyInMeters` in the Darwin Core standard). The site's rule of "ship only what was read off the file" has been doing the opposite: destroying real information because it arrived through a person instead of a sensor.

So: **place gets recorded at the precision it is actually known, with the precision itself as a shipped field.** A pin then has photographs behind it, a date that is still pure EXIF, and an honest statement of how well it is known.

Three findings drive the rest of the document.

- Four separate pieces of already-built UI are dark today solely because `coords` and `place` are `null` on the eight outings that hold frames (§2.2).
- The unit of place is not the outing, it is the **sitting**: a contiguous run of frames at one spot. Twenty-eight frames resolve to roughly nine or ten sittings, which is the same order of magnitude as the ten route stops, so a placed globe is balanced rather than lopsided (§2.4).
- Placing a stop converts the archive's richest unused field from unprintable to printable. `outings.ts:21-27` says clock times cannot ship because the camera was on CET everywhere, "until a stop is placed". Place supplies the offset. The dawn frames stop reading `22:36` and start reading `05:36` (§2.5).

A stranger could act on this: **record where each sitting happened and how sure you are, then give the globe a screen to project onto.**

---

## 2. Depth

### 2.1 The complaint, taken literally

> "it was meant to display the images at the locations I shot them at. Right now it really does... nothing."

Two claims, and they are the same claim. The globe does nothing *because* it displays nothing. Every other symptom is downstream.

`placed` (`outings.ts:222-225`) selects entries where `coords !== null && place !== null`, which is exactly the ten route stops, and every route stop carries `frames: []` (`outings.ts:88-94`). `framesOf()` therefore returns an empty array for every pin on the globe. `meta()` (`WorldGlobe.tsx:21-24`) has two branches and only one of them has ever executed: `count === 0` returns `frames to come`. Ten pins, ten identical sentences, none of them about a photograph.

That is the honest answer to "it does nothing". It is not an interaction-design problem and no amount of hover state fixes it.

### 2.2 Four pieces of finished UI are dark because of one null

This is the strongest single argument for the data-first move, and it is verifiable by reading:

| Built | Where | Why it never renders |
|---|---|---|
| Pin cover thumbnail | `WorldGlobe.tsx:188-208`, `const cover = frames[0]` then `{cover && <img className="globe-pin-thumb" …>}` | `frames` is always `[]` for placed outings |
| `.globe-pin-thumb` styling | `site.css:1015-1021`, 2.6rem circular crop | dead CSS |
| The dated meta line | `WorldGlobe.tsx:21-24`, `${stamp(from)} · ${count} frames` | unreachable branch |
| Place on a log row | `Home.tsx:449`, `{outing.place && <span className="log-place">…}` | `place` is null on every outing with frames |

Somebody has already built the globe this document is arguing for. It is sitting behind one field. Before proposing a single new component it is worth saying plainly: **the cheapest version of the fix is a data commit with no code in it at all.**

### 2.3 Where `GLOBE.md` was right, and where it was wrong

`GLOBE.md` §2.1 states flatly that the globe "cannot do (1) navigation at all", and §2.4 builds a whole thread on a table showing `where` at 0/28 coverage. Both were correct readings of the file as it stood. Neither is a fact about the archive.

The asymmetry is visible inside `GLOBE.md` itself. §2.4 argues:

> "nobody would call it a guess if Rouven wrote `mar '25` next to bali. He was there. There is a passport, a phone, a booking."

Every word of that survives the substitution of place for date. He was at the wedding. There is a contract, an address, a couple who remember. A recalled month and a recalled venue are the same kind of knowledge arriving through the same channel, and `GLOBE.md` accepted one and rejected the other in adjacent paragraphs.

`outings.ts` makes the same split against itself, and more sharply. The header comment at lines 21-27 reasons its way to a placement:

> "trip-2023-10 reads 22:36 to 23:27 on the 22nd, which in Bali (UTC+8) is 05:36 to 06:27 on the 23rd, and those frames are a sunrise."

That is a georeference. It uses a UTC offset to explain a photograph, which only works if the author already knows roughly where the photograph was taken. The file performs the inference in a comment and then refuses to record it in a field. The standard being defended is not "do not guess", it is "do not write down what you know", and it costs the site its entire spatial layer.

The correction is not to lower the bar. It is to **record certainty as data**, which is what the disciplines that deal with this problem professionally actually do.

### 2.4 The unit of place is the sitting, not the outing

`outings.ts:44-45` states a merge protocol:

> "They meet when a stop gets its photographs: move the frames onto the stop, fill in `from`/`to` off their EXIF, delete the orphaned shot entry."

That protocol assumes one outing equals one place. It breaks immediately on the largest outing in the file. `trip-2023-10` (`outings.ts:130-147`) runs six days and its own timestamps separate into three clear sittings:

- `03647`, 16 oct 11:28, one frame, filed `street`
- `03694` / `03700` / `03743`, 19 oct 08:37 to 09:31, one morning
- `03816` / `03828` / `03830` / `03855` / `03862`, 22 oct 22:36 to 23:29 camera-local, one dawn

A six-day trip through South East Asia is not one coordinate. Applying the file's own protocol would either pin nine frames to one dot, which is false, or leave the trip unplaced forever, which is where it is now.

Clustered by capture gap, the whole archive resolves like this:

| Sitting | Frames | Span | Placeable by recall? |
|---|---|---|---|
| feb 2024 street walk | 2 | 13 feb, 76 min | city, probably |
| dec 2023 gig | 6 | 23 dec, 83 min | **venue, certainly** |
| oct 2023, 16th | 1 | one frame | city, probably |
| oct 2023, 19th morning | 3 | 54 min | town or island |
| oct 2023, 22nd dawn | 5 | 53 min | **island, near-certainly** |
| sep 2023 | 1 | one frame | unknown |
| aug 2023 wedding | 6 | 75 min | **venue, certainly** |
| jan 2023 animal | 1 | one frame | unknown |
| oct 2021 animal | 1 | one frame | unknown |
| oct 2021 day out | 2 | 5 hours | unknown |

Nine or ten sittings for twenty-eight frames, against ten route stops. That is the number that makes this work: **a placed globe carries roughly nineteen pins, about half of which hold photographs**, and the half that does not is the nomad route, which is a different and legitimate claim. Compare with the current globe, which is ten pins and zero photographs.

It also means the data shape is wrong, not just the data. An outing is a *when* with frames attached. A place is a *where* with frames attached. The same frame belongs to exactly one of each, and the two groupings cross rather than nest. `bali` may well appear in both `trip-2023-10` and the nomad route, which under an outing-keyed model is two unrelated rows and under a place-keyed model is one pin that says `2 visits`.

### 2.5 The hidden payoff: place unlocks the clock

`outings.ts:21-27` is the most consequential comment in the repo and nobody has cashed it:

> "Every frame carries `OffsetTimeOriginal = +01:00`, so the body's clock was left on central european time no matter where it was standing. … Until a stop is placed, print the DATE and not the time."

The archive holds twenty-eight timestamps accurate to the second and cannot print a single one of them, because a Balinese sunrise reads `22:36`. `Home.tsx:422-436` implements exactly that restraint and only ever prints dates.

A recalled place supplies a UTC offset. An offset converts every timestamp in that sitting from unusable to true. And time of day is not trivia to a photographer, it is most of what a frame is about: dawn, blue hour, the last of the light, a stage at half eleven at night.

So one recalled field converts a second field from dead to live, and the second field is the one a photographer's audience actually reads. `05:36` under a dawn frame is a better caption than anything a copywriter can write, and it is fact.

This is the payoff `GLOBE.md`'s time-first thread could never reach, because dates were already available and clock times were the part it had to keep suppressing.

### 2.6 Why the hero reads as empty, in layout facts

The screenshot symptoms map onto specific rules.

**One rule at 42%, one at 100%.** `.hero-byline` carries `border-top: 1px solid var(--line)` (`site.css:695-702`) and sits at grid area `4 / 1 / 5 / 6`, which is five of twelve columns, about 42% of the width. `.hero-rule` sits at `6 / 1 / 7 / -1` (`site.css:770-776`) and spans everything. Two hairlines, two lengths, two rows apart, with no relationship between them.

**Byline and stats feel unrelated.** They are on the same grid row (`site.css:596-598` and `600-610`), and `.hero-stats` even pays `padding-top: calc(var(--space-2) + 1px)` with a comment saying the `+1px` matches the byline's border. The composition is built around a shared horizontal that is **drawn for 42% of its length and invisible for the other 58%**. The alignment is correct and nothing expresses it. That is a one-line defect and it explains the reported symptom exactly.

**Dead space around the globe.** Two sources stack. The grid reserves flexible slack above and below the subject: `grid-template-rows: auto 0.55fr auto auto 0.25fr auto auto` (`site.css:557`). And inside its own square frame the sphere does not fill the box: the camera at `fov 32` from `z 4.6` gives 2.64 units of visible height against a sphere 2 units across (`Globe.tsx:413-418`), so about 24% of the globe frame's height is deliberately air for pin cards. At `width: min(100%, 62svh)` (`site.css:586-591`) on a 900px-tall window that is roughly 130px of empty inside the frame, on top of the grid slack.

**Empty brown space on wide viewports.** `.hero-globe` is square and centred in a full-width grid area. At 1600px wide with a 558px sphere, roughly 520px of nothing sits on each side. On the widest windows the hero is mostly background.

None of this is a bug. It is a composition built for a subject that turned out to be a hollow one. `Home.tsx:28-43` says so in its own words: the hero was reduced to one subject because ten co-equal things had no hierarchy. The reduction was right. The subject chosen for it does not currently earn a full viewport.

**The concept's answer to all four:** the vacant width beside the globe is exactly where a photograph goes, the two hairlines collapse into one full-width rule that the byline and stats both sit on, and the sphere shrinks so its built-in air stops reading as a gap.

### 2.7 What job the globe is doing, restated

`GLOBE.md` §2.1 named three candidate jobs: navigation, credential, self-portrait. Under recalled places a fourth appears, and it is the right one.

**The globe is a presenter.** Not an index you read, not a menu you operate. An instrument that decides, second by second, which photograph the visitor is looking at and tells them where it came from. It has one moving part and it is already built (`Globe.tsx:331-361`).

This matters because "the globe becomes the site's navigation" is the tempting answer and it is wrong for a specific measurable reason. Nineteen pins over twenty-eight frames fails `GLOBE.md`'s own index-ratio test T14: a navigation surface longer than the thing it navigates. The globe should *show* the archive, and the header, the hero band and the log should continue to *reach* it.

So `GLOBE.md`'s "cannot do navigation at all" is overturned in the sense that matters (a pin can now open real frames) and upheld in the sense that matters commercially (the globe must not be the only way in).

### 2.8 Jobs the idea does

**Functional.** Put a photograph on the first screen. Tell a visitor, without being asked, where the work comes from and let them see the work while being told. Give a client evidence rather than a category label. Give Rouven a place to record something he knows and currently throws away every time he imports.

**Emotional.** The small satisfaction of a machine that visibly knows something: the sphere leans over, a place name arrives, and the picture that goes with it is already on the screen. For Rouven, the relief of a site that stops apologising. `frames to come` is a note-to-self published ten times on a landing page.

### 2.9 Load-bearing assumptions

1. **Rouven can name a place for the majority of the sittings in §2.4, at a precision he is willing to state.** If he can place only the wedding and the gig, the globe carries two photographed pins and the thread weakens to §11 phase 1 alone. Testable in ten minutes (§12).
2. **A recalled place with a stated precision is acceptable to ship.** This is a standards decision about `outings.ts`, not a design one. If the answer is no, this entire document is dead and `GLOBE.md`'s time-first thread is the fallback.
3. **A visitor treats a pin with a photograph behind it as a fundamentally different object from a pin with a label on it.** Assumed, not verified. Test D in §12 checks it for the price of one hardcoded coordinate.
4. **A hero with two objects can still have one subject.** `Home.tsx:28-43` is a documented scar from getting this wrong. The claim here is that a causal pair (one selects the other) reads as one thing where ten unrelated things read as noise. Not knowable from a document.
5. **Twenty-eight frames spread across nine places is enough density to be worth a globe.** At most six frames sit at any one place. That is enough for a projection and not enough for a zoom (§4).
6. **The route stops eventually get frames, or are honestly framed as not having them.** Ten pins reading `frames to come` beside nine pins showing photographs is a sharper contrast than ten pins reading it alone.

### 2.10 First principles

**A photograph is an observation.** It happened at a time, at a place, to a person with a camera. Time and place are not metadata decorating the picture, they are half of what the picture is a record of. A portfolio that strips both is showing you the residue.

**Certainty is a value, not a gate.** The binary "verified or omitted" is the amateur version of data honesty. The professional version records the value and its uncertainty together, which is why `coordinateUncertaintyInMeters` exists in the Darwin Core standard and why georeferencing a museum label reading "near Kandy" is a documented method with a point and a radius rather than a refusal. Omission is not neutral. It publishes "unknown" when the truth is "known to within twenty kilometres", and those are different sentences.

**An instrument should visibly do something.** A dial that never moves is decoration. The globe currently turns without effect. Coupling it to a photograph is the smallest possible change that makes the motion mean something, and it uses a signal (`activeRef`) that is already written every frame (`Globe.tsx:361`).

**Two representations of one dataset must share a state, or they are two datasets.** The globe and the log currently share nothing but a page. One shared index turns them into one object.

### 2.11 Second-order implications

- **`travel` as a category dies definitively.** Once place is a field on the work, a bucket named after the condition under which the work was made is not defensible in any reading. `GLOBE.md` §2.5 argued this from incoherence; place data settles it.
- **The forbidden stat line becomes legal.** `outings.ts:262-274` forbids printing `places` beside `frames` because no frame came from any pin. Once frames sit at places, `9 places · 28 frames · 2021–2026` is a true sentence. This thread does not only fix the globe, it earns back the line the site wanted to write in the first place.
- **Clock times become printable** (§2.5), which upgrades every caption on `/work`, the log strip and the lightbox, not just the hero.
- **Publishing gains one question and it is the easy one.** Every import already asks what category. It now asks where, and where is the thing a photographer never forgets.
- **The globe stops being a maintenance liability.** Today a new outing does not touch it. Under this thread every new outing adds a pin with pictures behind it, so the globe gets better by being used rather than staler.
- **The log section may become redundant.** If the hero shows frames at places and the log shows frames by date, the home page carries two contact strips. That is a real risk to the section built last week and it should be watched rather than pre-empted (§9.6).

### 2.12 Failure modes, including the quiet ones

**The corporate globe.** A rotating sphere with photographs of happy locations attached is the visual language of a SaaS "our global customers" band, and it is one texture away at all times. The defences are structural: a dot-matrix drawing rather than a photographic earth (`Globe.tsx:106-121` argues this explicitly), one accent colour, EXIF timestamps as captions, and a photograph shown at print scale rather than as a floating card.

**The hero carousel.** Auto-rotating hero content is one of the best-documented bad patterns on the web. Runyon's Notre Dame measurements found around 1% of visitors clicked a feature at all and 84% of those clicks landed on the first slide. That finding is about carousels that hide *offers* behind rotation and ask for a click. This one hides nothing (the whole archive is twenty-eight frames, reachable in two clicks from the header) and asks for nothing. But the mechanism that makes visitors tune out rotating content does not care about intent, and it is the single strongest argument against this thread. Named here rather than buried.

**Precision theatre.** A `±25 km` badge on a photography site is a costume. The uncertainty must arrive as a word a person would say (`the venue`, `the island`) rather than as a scientific notation, or the honesty mechanic becomes the kitsch.

**Confident small lies.** A caption reading `shot at bali, id` under a frame recalled to the island is a different sentence from `bali, id · to the island`. The first is the failure mode of this entire idea and it is a copy decision, not a data one.

**Travel-brag.** Carried forward from `GLOBE.md` §2.13 unchanged. No country counter, no flag row, no passport stamps.

**The to-do list published as a landing page.** Ten pins currently say `frames to come`. That is honest and it is also a public backlog. With nine photographed pins beside them it reads as a route in progress. Alone, it reads as a site apologising.

**Two subjects.** `Home.tsx:28-43` documents that the hero was rebuilt precisely because it had no hierarchy. Adding a large photograph beside the globe is a direct bet against that lesson. The bet is that a pair with a visible causal relation is one subject. If it is wrong, the hero is back where it started with better data.

**The globe becomes a slideshow controller.** If the photograph gets big enough and loud enough, the sphere becomes a spinner with no reason to be a sphere. The check: remove the globe from the mock and see whether the photograph loses anything. If it does not, the globe has lost its job.

### 2.13 Constitution tests

Carrying forward `GLOBE.md` §2.14 and adding what this concept needs.

| # | Test | Question |
|---|---|---|
| T1 | **Gating** | If a visitor never touches the globe, do they lose content? Must stay no. |
| T2 | **Three seconds** | Cold client: can they name what this person does and see a photograph within three seconds? |
| T3 | **One loud moment** | Does the hero still have exactly one loud moment, or does it now have two? |
| T4 | **On, not beside** | Is the 3D acting on the images or sitting next to them? |
| T5 | **DOM** | Is every readable word in DOM and indexable? |
| T6 | **Three objects** | Darkroom print, concert poster, sticker sheet. Which is this? |
| T10 | **Eighteen months** | Still true and un-embarrassing with no maintenance? |
| T11 | **Wedding test** | Evidence he shoots weddings within one screen and one click. |
| **T12'** | **No-guess test, restated** | Does any field ship a value stated more precisely than it is known? (Not: does any field ship a value that came from memory.) |
| T13 | **Asymmetry** | Does the surface work with nine photographed places and ten empty stops, and get better rather than different when a stop gains frames? |
| T14 | **Index ratio** | Is the navigation shorter than the content it navigates? Nineteen pins over twenty-eight frames is the number to watch. |
| T15 | **Static test** | With WebGL off, motion off and no pointer, is the same information on screen? |
| **T16** | **Projection test** | Does the photograph on screen belong to the place currently front-on? If they can ever disagree, the whole claim collapses. |
| **T17** | **Precision test** | Can a visitor tell how well any given place is known, without reading a legend? |

T12' is the one real amendment to the constitution proposed by this document, and it should be argued rather than slipped in. See §9.1.

---

## 3. Range

Fifteen positions. Analogies, inversions and combinations are labelled. All of them assume §11 phase 0 has happened, except R10 and R12 which do not need it.

### R1. Place the frames and change nothing else (inversion: do less)

Add `coords` and `place` to the sittings, ship, stop. No new components, no layout work. The pin thumbnail at `WorldGlobe.tsx:200-207` starts rendering, `meta()` starts printing `oct '23 · 5 frames`, and `log-place` appears on the log rows. This is the entire fix as a data commit. Its ceiling is a 2.6rem circular crop (`site.css:1015-1021`), which is a bead, not a photograph, and `PRODUCT.md` principle 1 wants photographs.

### R2. The projection (cross-domain: the Kodak Carousel)

The Carousel's mechanism is worth borrowing exactly: a rotary tray indexes to a slot, the slide drops into the gate under gravity, it is projected for a set dwell, a lifter returns it, the tray advances. The globe is already that tray, down to the dwell constant (`HOLD = 2.6`, `Globe.tsx:60-62`) and the indexing (`state_.index = (state_.index + 1) % pinPoints.length`, `Globe.tsx:349`). What it lacks is the screen. Give the hero a second column carrying one photograph from the place currently front-on, changing when the swing settles, and the sphere becomes a projector rather than an ornament.

### R3. The verso stamp (cross-domain: the darkroom print)

Fine-art printing practice puts the information on the back: a stamped field for name, title, place, date of the negative and date of the print, filled in by hand in pencil. Applied here, place stops being a globe feature and becomes a property of every frame on the site. Each photograph in a gallery, in a log strip and in the lightbox carries `bali, id · 19 oct '23 · 08:37`. The globe then summarises a fact that is legible everywhere else, which is a much stronger position than being the only place it exists. It is also the closest any proposal in either document has come to `PRODUCT.md`'s first named brand object.

### R4. The specimen label (cross-domain: museum georeferencing)

Natural history collections georeference textual localities with a point and a radius, and record the radius as data (`coordinateUncertaintyInMeters`, plus `georeferenceRemarks` for how the call was made). Applied here, every place carries a precision word: `the venue`, `the town`, `the island`. The globe becomes an honest map of what Rouven remembers rather than a map pretending to be GPS, and the variation is more interesting than uniformity: a pin that says `to the island` is a story about a trip, and a pin that says `to the venue` is a story about a job.

### R5. Photographs on the sphere

The literal reading. Each frame becomes a small billboarded plane standing off the surface at its coordinate, orbiting with the globe, so the images are physically at their locations. It is the most direct answer to the brief and the worst one: at rendered scale an image on the sphere is under 40px, half of them face away, they occlude the pins and each other, and the photographs end up inside WebGL where `PRODUCT.md` principle 3 and the site's whole DOM-first architecture keep everything readable out.

### R6. The sphere as matte (inversion: reverse the direction of service)

Instead of the globe presenting a photograph, the photograph is drawn inside the globe: the dot field's brightness samples the current frame, so the sphere becomes a stipple portrait of the picture taken at the place it is turned to. It is the one proposal that puts the effect genuinely *on* the image rather than beside it. It also destroys the map at the moment it matters, because a stippled photograph and a coastline cannot occupy the same dots.

### R7. Coupled views (the owner's floated idea, made possible)

The globe and the log are two projections of one dataset, so give them one shared index: hovering a log row turns the globe to that outing's place, and the tour highlights the matching row. The obstacle is geometric, not technical. The log sits a full screen below the hero (`site.css:364-367`), so nothing coupled across that boundary is ever visible at both ends. The variant that works is to move a compressed log into the hero as the globe's second column, at which point the hero becomes the coupled pair and the separate log section is up for deletion.

### R8. The flight replay (combination: R2 + Hiroshige's numbered route)

Rather than hopping pin to pin in array order, the globe traces the route in time order along the arcs it already draws (`Globe.tsx:150-184`), and frames appear at the points along the line where they were taken. Time and place stop being two axes and become one animation. It is the most beautiful object in this list and it needs dates on the ten route stops, which is the whole of `GLOBE.md` phase 0 as a prerequisite on top of this document's.

### R9. Place as the only index

`/work` becomes `/places`. Categories are deleted rather than moved. The globe is the site's table of contents and the archive is addressed exclusively by where it happened. This is the purest form of the owner's instinct and it fails two tests hard: nineteen entry points for twenty-eight photographs fails T14, and a wedding client cannot search for a place she has never heard of, which fails T11.

### R10. Delete the unphotographed pins (inversion: the honest opposite)

Cut the ten route stops. The globe shows only places that produced photographs, so every pin has pictures and `frames to come` never appears. Fewer, truer, smaller. It also deletes the route arcs, which are the most attractive thing on the page and the only part of the hero that currently says "nomad" without words, and it throws away a real claim about a real life because the imports are late.

### R11. Zoom to a place, rechecked

`GLOBE.md` R11 rejected this because there was nothing to zoom into. Half of that objection is now void: pull toward bali and there really are five frames there. The other half stands and is the deciding one. The land mask resolves continents, not valleys (`Globe.tsx:106-121`), so the zoom would reveal dots getting larger, and at most six frames sit at any single place, so the reward for the gesture is a fan of five thumbnails. A gesture that costs a week and reveals what a card could have shown is the 2021 camera with better data.

### R12. Fix the composition only

Ignore the globe entirely and treat this as a layout brief. Run the hairline across the full width so the byline and stats sit on one line, cut the flexible slack rows, raise the globe's height cap so the sphere eats the space, and let the pins keep saying `frames to come`. Cheapest item in the document, fixes every symptom in the screenshot, and leaves the actual complaint untouched: the globe still shows nothing.

### R13. The travelogue (cross-domain: Burton Holmes, who coined the word in 1904)

Holmes's format was two hours of stories timed to projected lantern slides: the picture arrives, the speaker says one thing about it, the next picture arrives. Applied here, each place carries one sentence in Rouven's voice that appears with its photograph. It is the most personal version of R2 and it is `PLAYFUL.md`'s thread executed on a new surface. It is also nineteen sentences that have to stay true forever, which is a maintenance contract on a page nobody wants to maintain.

### R14. Combination: the projection with the specimen label (R2 + R4)

The photograph is projected at print scale, and the caption under it carries the place, how well the place is known, the date and the clock time now that place has unlocked it. `bali, id · to the island · 23 oct '23 · 05:36`. One line that is simultaneously a photographer's caption and a data record, which is the same double reading the hero slate already runs on (`Home.tsx:322-342`).

### R15. Combination: the projection plus the stamp everywhere (R2 + R3)

R2 makes the home page work and R3 makes place a property of the archive rather than a feature of one component. Together they answer the question a visitor asks second: having seen that a photograph came from somewhere, every other photograph on the site can say where it came from too. Neither is complete alone. R2 without R3 is a hero trick that the rest of the site does not honour; R3 without R2 is a caption improvement nobody notices.

---

## 4. Convergence

**Selected: R15, built as R1 → R14 → R3, with R4's precision field in the data model from the first commit and R12's composition fix folded into phase 1 because it is nearly free.**

Why each thing set aside loses.

**Over R1 alone (place the frames, stop).** R1 is not rejected, it is phase 1, and it might be enough. What it cannot do is put a photograph on the first screen. A 2.6rem circular crop inside a pill (`site.css:987-1021`) is an icon of a photograph. `PRODUCT.md` principle 1 is not satisfied by an icon of a photograph. But R1 ships in a day and answers the load-bearing question empirically, which is why everything else waits behind it.

**Over R5 (photographs on the sphere).** The literal answer to the brief loses to the honest one. Under 40px, half of them facing away, occluding the pins, inside WebGL where no text can live. It is the version that sounds like the request and betrays it.

**Over R6 (sphere as matte).** The best idea in the document for a different site. It is the only proposal that puts the effect on the image, which is `PRODUCT.md` principle 1 in its strictest reading, and it cancels the map. A globe you cannot read as a globe cannot tell you where anything was taken, so it fails the one job the brief actually named.

**Over R7 (coupled views).** Not rejected so much as absorbed. The coupling is real and it happens inside the hero, between the globe and the projected print, where both ends are visible at once. Coupling the globe to a log section a full screen below is an effect nobody will ever see, and building it would mean pinning the hero through a scroll, which is a much larger intervention than this brief warrants.

**Over R8 (flight replay).** The most attractive object here and it needs both phase 0s: places for the sittings and dates for the ten route stops. It also replaces a mechanic that works today (the tour) with one that has to be built from scratch. It reopens the moment both halves of `outings.ts` are complete, and nothing in this plan blocks it.

**Over R9 (place as the only index).** Fails T14 and T11. Nineteen doors into twenty-eight photographs is a menu longer than the meal, and no client searches for work by a place name she does not know. The globe earns the right to *show* the archive without earning the right to be the only way in.

**Over R10 (delete the unphotographed pins).** Tempting for exactly one reason: it makes every pin true. It loses the arcs, which are the only part of the hero that says "this person has been moving" without a word of copy, and it deletes a real claim because of an import backlog. The honest fix is to make the empty pins visibly a different kind of thing from the photographed ones, which R4's precision layer does for free.

**Over R11 (zoom).** The objection is upgraded, not withdrawn. It used to be "nothing to zoom into". It is now "at most six frames at the densest place, and a mask that resolves continents". That is a better reason and it still says no. Revisit when one place holds twenty frames.

**Over R12 (composition only).** Right about the symptoms, wrong about the disease. It is folded into phase 1 because the two-hairline defect (§2.6) costs one line to fix and should be fixed regardless of which thread wins.

**Over R13 (the travelogue).** Held back rather than rejected. One sentence per place is the strongest personal move available and it is also nineteen strings that must stay true. `PLAYFUL.md` already booked the voice budget and the right sequence is to get the mechanism working before writing to it. Two or three sentences on the places that deserve them, later, is the version that survives.

### Why the phasing carries the argument

Phase 0 is a notes app, not a commit. Phase 1 is a data commit with no components in it, and it makes four pieces of finished UI light up at once. Only after looking at that for a week does the hero get rebuilt. If the placed globe already feels alive at phase 1, the projection is a smaller and better-informed decision. If it does not, nothing has been spent.

---

## 5. The experience

A wedding client, cold, on a laptop, from an Instagram link. Then a developer from a GitHub profile. Then a visitor with reduced motion on a phone.

**0.0s.** The loader lifts. On the left, the globe is already turning, dots over land, an accent arc lifting off the Pacific. It is smaller than it was and it is not centred any more.

**0.4s.** On the right, a photograph. Not a card, not a thumbnail: a print, the height of the sphere, a bride mid-turn in warm afternoon light.

**0.9s.** The sphere settles. A pin card opens over northern Germany: `st. marien, lübeck`. Under the print, in mono:

> `26 aug 2023 · 14:22 · to the venue · 6 frames →`

She has her answer before she has read the byline. Not the word "weddings", the wedding.

**3.5s.** The globe leans and swings east. The print holds for a beat, then cuts to a stage in acid green, and the caption underneath it changes with it:

> `23 dec 2023 · 22:47 · to the venue · 6 frames →`

The pin card over central Europe reads the venue's name. She has now seen two jobs and read no navigation.

**7.1s.** The sphere leans south and keeps going, further than it has gone yet, and lands on Indonesia. The print is a volcano rim at dawn.

> `23 oct 2023 · 05:36 · to the island · 5 frames →`

The timestamp is the thing that lands. Not because she reads it as EXIF, but because 05:36 is a fact about how the photograph got made, and the site has just told her something a caption could not.

**Under both columns**, one hairline running the full width, and on it: `rouven lührs — photographer & creative developer` on the left, `9 places · 28 frames · 2021–2026` on the right. One line, one rule, drawn all the way across.

**Below that**, the band, unchanged: `the log ✦ the archive`, and `scroll`.

**She clicks the arrow** at the end of the caption. The page moves to the log row for that outing and every frame from that afternoon is on screen at once.

**The developer, same page.** He grabs the sphere and drags. The tour stops; whichever pin he parks front-on claims the card, and the print changes to match, because the manual branch already resolves the nearest pin (`Globe.tsx:395-408`). He drags slowly across the Pacific and watches photographs change under his hand. He tilts to the south pole where there is nothing, and the print stays on the last place rather than going blank. He lets go, and six seconds later (`GRACE`, `Globe.tsx:71-80`) the tour takes it back. He has read the whole architecture from the outside.

**The third visitor**, phone, reduced motion. No canvas. The existing static branch renders (`WorldGlobe.tsx:125-143`), now with photographs: an ordered list of places, each row carrying the place, the precision, the date and a strip of the frames taken there. The first row's photograph is shown at print scale above the list, static. Same information, no WebGL, no gesture, no motion.

---

## 6. Candidate mechanics

Each traced to data and code that exists. Dependencies flagged explicitly.

### 6.1 The place layer

**Data:** does not exist. Rouven's recall, per sitting from §2.4.

**Shape:** a second exported array in `outings.ts`, keyed by place rather than by time, alongside the existing `outings` rather than replacing it.

```ts
interface Place {
  slug: string
  /** 'lübeck, de' — the label that rides the pin */
  label: string
  coords: [number, number]
  /** how well this is actually known. Shipped, not smoothed away. */
  precision: 'venue' | 'town' | 'island' | 'region'
  /** IANA zone, so camera-local EXIF can be printed as local time */
  tz: string
  /** frame srcs shot here, resolved through the existing bySrc map */
  frames: string[]
}
```

**Why a second array and not a field on `Outing`:** §2.4. One outing can touch three places and one place can be touched by two outings. `outings.ts:44-45`'s merge protocol assumes neither and breaks on `trip-2023-10`. Keeping `outings` untouched also means the log section (`Home.tsx:363-418`) and `archiveStats()` (`outings.ts:262-274`) need no changes at all.

**Resolution:** identical to the existing pattern. `bySrc` at `outings.ts:213-215` already maps `src → Photo`; a `Place` resolves its frames the same way `framesOf()` does at `outings.ts:218-219`.

**The pin list:** `placed` (`outings.ts:222-225`) becomes the union of places-with-frames and route-stops-without, or more simply the route stops become `Place` entries with `frames: []`. Either way `WorldGlobe.tsx:54` and `:187` keep the same shape.

**Dependency:** Rouven. Everything below waits on this.

### 6.2 The precision word

**Data:** the `precision` field above.

**Rendering:** a word, never a number. `to the venue`, `to the town`, `to the island`. It sits in the pin card's meta line (`WorldGlobe.tsx:211`) and in the print's caption, in the same mono register as `hero-slate` (`site.css:711-723`) and `globe-pin-meta` (`site.css:1037-1042`), so it reads as the site's existing data layer rather than as a new kind of object.

**Explicitly not:** a scaled radius ring on the sphere. `outings.ts:70-75` records that at rendered size one degree of latitude is under a pixel, so a true-scale 5km uncertainty is invisible and a true-scale 500km one is four pixels. A stylised ring would be a symbol pretending to be a measurement, which is the same dishonesty in the opposite direction. See §10.

### 6.3 The projection panel

**Data:** the active place's first frame, or a chosen cover among its frames.

**The signal already exists.** `activeRef.current` is written every frame by `Globe.tsx:361` and `:402`, and is already read by the rAF loop in `WorldGlobe.tsx:64-79`. The projection panel is one more read inside a loop that is already running: when the index changes, swap the `src` on one `<img>` and rewrite one caption. Zero React renders, zero new render cost, same architecture as the pins.

**Why a plain `<img>` and not a `WebGLImage` in phase 2:** three reasons, all concrete. `Globe.tsx:261-271` documents that a second `<View>` with a `makeDefault` camera on the same page previously broke the globe's own pin projection, because `useFrame` hands back the root store and the last camera to mount wins. `Home.tsx:294-299` records the deliberate decision to move the hero plate below the fold and stop it being eager. And a develop wipe competing with a turning globe for GPU on first paint is exactly the "two motions fighting" the entrance comment at `Home.tsx:52-56` was written to avoid. A cross-fade in CSS costs nothing and can be upgraded later.

**Layout:** the hero grid gains a column split rather than a new row. `.hero-globe` moves from `3 / 1 / 4 / -1` (`site.css:586-591`) to roughly `3 / 1 / 4 / 6`, and the print takes `3 / 7 / 4 / -1`, with the globe's `min(100%, 62svh)` cap adjusted so a half-width sphere still reads at size. On phones the existing single-column stack (`site.css:1757-1787`) puts the print above the list, which is the right order anyway.

**Dependency:** a cover choice per place. Defaultable to `frames[0]`, so not a blocker.

### 6.4 The caption, which is a verso stamp

**Data:** place label, precision, EXIF date, EXIF clock time converted through `tz`, frame count.

**Existing code it mirrors:** `heroSlate` (`hero.ts:54-62`) and `.hero-slate` (`site.css:711-723`). A film slate and a print's verso stamp are the same object, and the site already renders one. The caption under the projected print is that object with different fields.

**The clock time is the new part** and it is the payoff from §2.5. `Home.tsx:422-436`'s `span()` deliberately prints dates only, and its comment says why. A `tz` on the place is the missing input; the conversion is `Intl.DateTimeFormat` with the zone, applied to the EXIF stamp reinterpreted as `+01:00`.

**Dependency:** `tz` per place, which follows from the coordinates and needs no extra recall.

### 6.5 The click destination

**Cheapest honest version:** the caption's arrow scrolls to that outing's row in the log section. `Home.tsx:402-406` already maps `shot` to `<LogRow>` keyed by `outing.slug`; the row needs an `id` and the arrow needs an anchor. No new route, no new component, and the destination shows every frame from that sitting.

**Better later:** a `/places/:slug` or `/log/:slug` route. `App.tsx:53-59` has no such route today.

**Dependency for a lightbox destination:** the lightbox is category-keyed. `Lightbox.tsx:13` calls `getCategory(lightbox.category)` and `:38` indexes `category.photos`. Opening an arbitrary set of frames means generalising it to take a photo list. Real work, small, and a genuine dependency rather than an assumption.

### 6.6 The composition fix

**One line, independent of everything else.** `.hero-byline`'s `border-top` (`site.css:695-702`) draws the hero's unifying horizontal across five of twelve columns while `.hero-stats` (`site.css:600-610`) sits on the same invisible line. Either move the rule to a full-width element spanning row 4, or drop the byline's border and let `.hero-rule` (`site.css:770-776`) be the only hairline in the hero. Two hairlines at two lengths is the symptom in the screenshot and this is its cause.

**Second:** the flexible slack rows `0.55fr` and `0.25fr` (`site.css:557`) exist to put air on both sides of a centred square subject. With a two-column hero the subject is the full width of the composition and the slack should shrink accordingly. That is one string.

### 6.7 The static fallback

**Already exists**, and `GLOBE.md` §2.8's reported bug is fixed: `WorldGlobe.tsx:125-143` renders `.globe-frame-static` with a real `<ol>` of places when `has3D` is false (`WorldGlobe.tsx:53`). This concept extends it rather than building it: each row gains the frames shot there, and the panel's photograph renders as a static print above the list. `.globe-log-row` (`site.css:912-919`) already has the flex layout for it.

**T15 note:** the projection panel must not be the only place the photographs exist. Under `!has3D` the list carries them, which keeps the claim true.

### 6.8 The stamp on every other surface (phase 3)

**Data:** none new. A derived `Map<src, Place>`, built exactly the way `bySrc` is built in the other direction at `outings.ts:213-215`.

**Where it goes:** the gallery grid, the log strip (`Home.tsx:456-462`), and the lightbox. Each photograph carries `bali, id · 23 oct '23 · 05:36`. It is the cheapest mechanic in the document and the one that converts a home-page trick into a property of the archive.

### 6.9 Degradation, per surface

| condition | globe | projection panel | caption | pins |
|---|---|---|---|---|
| **no WebGL** | static `<ol>` (`WorldGlobe.tsx:125-143`) | static first print above the list | plain DOM, unaffected | list rows |
| **reduced motion** | same, since `has3D` includes `prefersReducedMotion()` (`WorldGlobe.tsx:53`) | no cross-fade, first print only | unaffected | list rows |
| **no pointer** | the tour runs unattended (`Globe.tsx:331-361`) | advances with the tour | unaffected | cards open on the tour |
| **no JS** | nothing in the frame; the list should be the default and the canvas the enhancement | needs a rendered default `<img>` | server-rendered | list rows |
| **phone** | single column, sphere capped at 46svh (`site.css:1757-1762`) | print above the sphere | unaffected | as today |

---

## 7. Constraint / constitution audit

| Principle (source) | How the thread honours it | Tension |
|---|---|---|
| **Photos are the hero; the 3D serves them** (`PRODUCT.md` Strategic 1) | For the first time the hero carries a photograph at print scale, and the 3D object's entire function is to choose which one | The globe still occupies half the first screen and holds no photograph itself. The service is adjacency, not an effect on the image |
| **One loud moment per surface** (Strategic 2) | The loud moment is the projection event: the lean, the landing, the print changing, all on one beat | Two objects on one screen. `Home.tsx:28-43` documents that this hero was rebuilt precisely to avoid that. Real risk, §9.2 |
| **All readable text in DOM** (Strategic 3) | Every place, precision, date, time and count is DOM, positioned from a projection ref. Nothing new enters WebGL | None |
| **Cold clients judge in seconds** (Users) | A wedding photograph is on screen at 0.4s with a venue and a date under it. Better than the word `weddings` in a nav band | Which photograph is first depends on the tour's seed (`Globe.tsx:334-337`, opens on the newest). If the newest place is a street walk, the client meets a street frame |
| **Confident, playful, handmade** (Brand voice) | `to the island` is a handmade statement. It is a person telling you how well he remembers | `to the region` on too many pins reads as vagueness rather than honesty |
| **Lowercase everything** | `st. marien, lübeck`, `23 oct '23`, `05:36` | None |
| **darkroom print / concert poster / sticker sheet** | The strongest fit either document has managed. A print with a stamped verso carrying place, date and negative details is the first of the three objects, executed rather than referenced | The globe itself remains none of the three |
| **Anti-ref: the 2021 3D model you must click** | The tour presents every place unasked (`Globe.tsx:331-361`), the header carries `work` on every page, and the log reaches every frame without touching the sphere | The projected print's arrow is a 3D-adjacent affordance. It must never be the only route to those frames |
| **Anti-ref: generic AI dark portfolio** | Nineteen hand-recalled places with stated precision is not a thing a generator produces | A globe with rotating photographs beside it is very close to a stock SaaS band. §2.12 |
| **One `<Canvas>`, everything through `<View>`** | Phase 2 adds no new View. The print is DOM | Upgrading the print to `WebGLImage` later reopens the `makeDefault` camera hazard at `Globe.tsx:261-271` |
| **Nothing behind WebGL, pointer or motion** | The static branch exists (`WorldGlobe.tsx:125-143`) and gains the photographs | The static branch must be extended in the same commit as the panel, not after it |
| **No guessed values** (`hero.ts:51-53`, `outings.ts:29-33`) | Recalled coordinates ship with a precision word, so no value is stated more precisely than it is known | This is an amendment to the rule, not compliance with it. §9.1 |
| **Data asymmetry degrades gracefully** (`outings.ts:35-45`) | Photographed places and travelled-only stops are visibly different objects: one has a print, one says `frames to come` | The file's own merge protocol at `:44-45` is superseded, and that comment has to be rewritten rather than quietly contradicted |
| **`archiveStats` must not print places beside frames** (`outings.ts:255-261`) | Once frames sit at places the prohibition expires and the line becomes true | It expires only for the placed frames. If four sittings stay unplaced, `9 places · 28 frames` is again two facts read as one |

---

## 8. Constraint-risk flags

Stated plainly, without softening the constraint.

### 8.1 A recalled coordinate is not an EXIF coordinate

`outings.ts:29-33` says the cameras have no GPS, "nothing can be recovered from the files", and an outing with null coords "simply does not get a pin". This document proposes shipping hand-recalled coordinates on the frames that hold the entire archive. The precision field keeps the claim honest, and it is still a genuine loosening of a rule the file states as policy. It should be an explicit, argued decision by Rouven, and the header comment should be rewritten to state the new rule rather than left contradicting the data underneath it.

### 8.2 The hero gets a second object

`Home.tsx:28-43` is a written record of this exact mistake being made and fixed. The claim that a causal pair reads as one subject is untested and is the largest design risk here. The mitigation is a hierarchy expressed in size and behaviour: the print is larger, saturated and changes; the globe is smaller, monochrome and constant. If the mock does not read that way, the honest response is R1 alone.

### 8.3 An auto-advancing photograph is a carousel

Runyon's measurements at Notre Dame put carousel interaction at roughly 1% of visitors, with 84% of those clicks on the first slide. That study is about rotating offers competing for a click, which is not this. But the underlying behaviour, that visitors stop attending to content that moves on its own, applies regardless of intent. If the projected print gets ignored, the hero has a large photograph nobody looks at, which is worse than an empty space.

### 8.4 The precision word can become the kitsch

`to the island` is a photographer's sentence. `±22 km` is a spreadsheet's. The line between the two is one design decision wide, and crossing it turns the most defensible part of this idea into the most embarrassing.

### 8.5 The wedding client depends on the tour's seed

The tour opens on index 0 (`Globe.tsx:334-337`), which is the newest entry. If the newest placed thing is the february street walk, the first photograph a client sees is a street frame, and T11 is passed by the second slide rather than the first. Either the seed becomes editorial (open on a chosen place) or the ordering has to be watched. An editorial seed is a small, honest amount of art direction and it should be admitted as such.

### 8.6 Half the pins still hold nothing

The ten route stops keep saying `frames to come`. This plan makes that contrast louder rather than quieter, since it now sits beside pins with photographs. That is the correct trade and it is not free: a visitor who reads carefully sees a site that has been somewhere it has not yet published.

### 8.7 The home page may end up with two contact strips

The log section (`Home.tsx:363-418`) shows every outing's frames as a strip. If the hero also shows frames at places, the page carries two grids of the same twenty-eight images one screen apart. That may be fine (different groupings, different scale) or it may be redundant. It cannot be decided from a document and it is a direct risk to a section that was just built.

### 8.8 Clock times can be wrong in a new way

Converting a camera-local timestamp through a recalled place's timezone produces a confident-looking `05:36`. If the place is wrong by a timezone, the time is wrong by hours and it is printed with more authority than the date it came from. The conversion should only run where `precision` is `venue`, `town` or `island`, never `region`.

---

## 9. What to explicitly NOT build

- **Photographs mounted on the sphere (R5).** Under 40px, half of them facing away, and it moves imagery into WebGL where no caption can follow it.
- **Zoom to a place (R11).** Six frames at the densest place is not a reward for a gesture, and the land mask resolves continents.
- **A scaled uncertainty radius on the globe.** At rendered size a 5km circle is invisible and a 500km circle is four pixels (`outings.ts:70-75`). A symbol pretending to be a measurement is worse than no measurement.
- **A `±` figure anywhere in the UI.** The precision ships as a word.
- **Manual carousel controls.** No dots, no arrows, no play/pause on the globe. The moment the hero grows a control strip it is a slideshow widget.
- **A country counter, flag row or passport-stamp graphic.** Carried forward from `GLOBE.md` §10, unchanged.
- **A `WebGLImage` in the hero in phase 2.** The `makeDefault` camera hazard (`Globe.tsx:261-271`) and the deliberate decision at `Home.tsx:294-299` both say wait.
- **A second globe, or the globe on any other page.** One 3D subject, one surface.
- **Deleting the route arcs.** They are the only thing in the hero that says "moving" without words.
- **One sentence per place, yet (R13).** Nineteen strings that must stay true, written before the mechanism is proven.
- **Restructuring `Outing`.** The place layer sits beside it. `outings`, `framesOf`, `archiveStats` and the whole log section stay untouched.

---

## 10. Phase fit and build order, cheapest first

**Phase 0. The place sheet.** No code. Rouven opens a notes app and writes, for each sitting in §2.4, a place and one of `venue` / `town` / `island` / `region`, or nothing at all. Ten minutes, and it decides everything. If fewer than four sittings can be placed, stop here and keep `GLOBE.md`'s thread.

**Phase 1. The data commit, plus one CSS line.** Add the place layer (6.1), point `placed` at it, fix the byline hairline (6.6). No new components. Four dead pieces of UI come alive at once (§2.2): pin thumbnails, real meta lines, place on the log rows, and the correct `archiveStats` line. Look at this for a week before doing anything else. **This is the highest-confidence item in the document and it may be the whole fix.**

**Phase 2. The projection panel.** Regrid the hero to two columns, add one `<img>` and one caption driven by `activeRef` inside the existing rAF loop (6.3), extend the static branch in the same commit (6.7). This is the concept's loud moment and the only substantial build.

**Phase 3. The stamp everywhere.** One derived map, one small component, applied to the gallery, the log strip and the lightbox (6.8). Cheap, and it converts the idea from a hero feature into a property of the archive.

**Phase 4. Clock times.** Add `tz` per place, convert on render, print times only where precision allows (8.8).

**Phase 5. Destinations.** Give the log rows ids and wire the caption's arrow (6.5). Later, a real `/places/:slug` route and the lightbox generalisation.

**Deferred.** The flight replay (R8) until the route stops have dates. Zoom (R11) until one place holds twenty frames. One sentence per place (R13) until phase 2 has been lived with. A WebGL hero print until there is a reason.

---

## 11. Open questions

Only Rouven can answer these. The first two gate everything.

1. **How many of the ten sittings in §2.4 can you place, and at what precision?** Name the place and the confidence word. Anything you would have to guess gets nothing.
2. **Is a recalled coordinate with a stated precision acceptable in `outings.ts`?** This is a standards decision, and if the answer is no the document is dead on arrival (§8.1).
3. **Does bali appear twice?** If the oct 2023 dawn frames were shot at the same place as the nomad route's bali stop, one pin gains photographs and the archive gains its first repeat visit. If they were bromo rather than bali, that is a different pin and both are real.
4. **Which place should the tour open on?** The newest, or an editorially chosen one (§8.5)? If a wedding client is the commercial priority, the answer is the wedding, and that is art direction rather than data.
5. **Where does the projection panel's arrow go in phase 2?** The log row anchor is free; a `/places/:slug` route is a day.
6. **Do the ten unphotographed route stops keep their pins?** Keeping them is honest and publishes a backlog. Cutting them (R10) loses the arcs. Recommended: keep, and let the precision layer make them visibly a different kind of object.
7. **Does the log section survive phase 2?** Two contact strips one screen apart may be redundant (§8.7). Not answerable until phase 2 is on screen.
8. **Is the gig's venue nameable in public?** A named venue is a much stronger pin than a city, and it is also a client's room.
9. **What happens to `travel` as a category** once every frame carries a place? `GLOBE.md` §6.9 proposed cutting it; place data makes that decision easy and it still needs your eye on five frames.

---

## 12. Cheap validation

The load-bearing assumption is §2.9.1 and §2.9.3 together: **the places are recallable, and a placed pin is a different object to a visitor than a labelled one.**

**Test A, ten minutes, zero code. Do this first.** Write out the ten sittings from §2.4 and put a place and a precision word against each. Count the ones you can do without hedging. Four or more, and phase 1 is live. Two or fewer, and the honest answer is that this archive is a diary of *when*, which is what `GLOBE.md` concluded.

**Test B, twenty minutes, one hardcoded line.** Put real coordinates on `wedding-2023-08` locally so it enters `placed`, and look at the globe. One pin with a wedding photograph on it, one card reading `aug '23 · 6 frames`, nine pins reading `frames to come`. The question is whether the hero changes character. If one placed pin makes the globe feel like an index, the whole thread is confirmed for the price of one line. If it does not, phase 2 has to carry the entire load and should be scrutinised much harder.

**Test C, thirty minutes in an image editor, zero code.** Screenshot the globe at half its current size, paste a real wedding frame beside it at print scale, set the caption in mono underneath. Look at it for a day. Two questions. Does it read as one object or two? And if you delete the globe from the mock, does the photograph lose anything? If the answer to the second is no, the globe has no job even under this plan and R1 is the ceiling.

**Test D, five minutes, zero code.** Take the five frames from the night of 22 oct 2023 and write their times as local time under the assumption they were shot at UTC+8: `05:36`, `06:05`, `06:05`, `06:27`, `06:29`. Look at them next to the photographs. If those numbers make the pictures better, §2.5 is the real prize in this document and phase 4 should move earlier.

---

## Sources for the cross-domain references

- [Darwin Core list of terms, TDWG](https://dwc.tdwg.org/terms/) and the [GBIF Georeferencing Quick Reference Guide](https://docs.gbif.org/georeferencing-quick-reference-guide/1.0/en/) — `coordinateUncertaintyInMeters` as "the smallest circle containing the whole of the Location", and the point-radius method for georeferencing a textual locality. The mechanic borrowed is recording the uncertainty as a field rather than withholding the value.
- [Georeferencing the Natural History Museum's Chinese type collection](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7217978/) and [AMNH Paleontology, data and data management](http://collections.paleo.amnh.org/21/data-and-data-management) — locality data as the majority of a specimen's scientific value, recovered from labels and ledgers written from memory decades after collection.
- [Gravity-feed rotary tray slide projector, US patent 4,232,953](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4232953) — the Kodak Carousel mechanism: an indexing rotary tray, a slide dropped into the gate, a fixed dwell, a lifter, advance. Borrowed as the exact loop the globe's tour already implements.
- [The Verso Stamp, The Online Photographer](https://theonlinephotographer.typepad.com/the_online_photographer/2014/05/the-recto-stamp.html) — the stamped field on the back of a print carrying name, title, place, date of negative and date of print, filled in by hand.
- [Burton Holmes, Wikipedia](https://en.wikipedia.org/wiki/Burton_Holmes) and the [Burton Holmes Digital Archive, UCLA](https://humtech.ucla.edu/project/burton-holmes-digital-archive) — the travelogue, coined 1904: stories timed to projected lantern slides, 16,000 of them hand-painted.
- [Carousel Interaction Stats, Erik Runyon](https://erikrunyon.com/2013/01/carousel-interaction-stats/) — roughly 1% of visitors clicked a carousel feature at all, and 84% of those clicks were on the first slide.
- [The Fifty-three Stations of the Tōkaidō, Wikipedia](https://en.wikipedia.org/wiki/The_Fifty-three_Stations_of_the_T%C5%8Dkaid%C5%8D) — carried over from `GLOBE.md` R2 for R8's numbered route.
