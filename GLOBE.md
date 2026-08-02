# GLOBE.md

What the globe is an index of, what that makes the rest of the home page, and what happens to the six categories.

Written against `PRODUCT.md`, `PLAYFUL.md`, `src/content/outings.ts` and the current source. Every claim about the code points at a file and line and was read, not assumed. This is a plan-idea document. Nothing here has been built.

---

## 1. Concept summary

The chosen thread is **the log**.

The globe stays exactly as it is and stops being asked to do a job it cannot do. Underneath it, the hairline rule that already runs the width of the hero (`site.css:605-611`) becomes a **dated axis**: one tick per outing, oldest to newest, the eight shot outings and the ten travelled stops on the same line. Time is the only axis in this archive that is fact for every photograph, so it is the axis that can hold both halves of `outings.ts` before a single coordinate is recovered. The globe says where. The axis says when. The tick lights when the globe turns to its pin, which is the merge performed rather than asserted.

Below the fold, the four numbered category posters are replaced by **three outing spreads**: same module, same geometry, different noun. Each spread shows real frames from one window of time rather than a cover standing in for a gallery. The three are chosen editorially, not chronologically: the wedding afternoon, the gig, the october trip. Three outings, three claims, eighteen minutes to nine days each.

The ticker dies on the home page and moves to `/work`, where its content is finally true.

The six categories are not deleted. They stop being the home page's structure and become what they always were: the answer sheet a client needs. `travel` is cut, because travel is not a subject, it is the condition under which nearly every frame in this archive was made, and it is the one word that directly contradicts the globe.

A stranger could act on this: **make time the spine, place the surface, and category the answer to a client's question, and give each of the three its own surface instead of arguing on one.**

---

## 2. Depth

### 2.1 What the globe is actually for, and what it currently cannot do

There are three candidate jobs and it matters enormously which one is being claimed.

1. **Navigation.** Click a place, get the photographs from there.
2. **Credential.** This archive comes out of a life spent going places. It is not stock, it is not one city, it is not a hobby.
3. **Self-portrait.** It says nomad, restless, two crafts, faster than any paragraph on `/about` does.

The globe today does (2) and (3) very well and **cannot do (1) at all**, because of a fact that is worth stating flatly:

> Not one of the twenty-eight published photographs is attached to any of the ten pins on the globe.

`placed` (`outings.ts:214-217`) filters for `coords !== null && place !== null`, which selects exactly the ten route stops, all of which carry `frames: []` (`outings.ts:80-86`). The eight outings that hold all twenty-eight frames carry `coords: null`. So every pin on the globe opens a card that says `frames to come` (`WorldGlobe.tsx:21-24`).

The globe is a claim with no evidence attached to it. That is not a defect of the implementation, it is the honest state of the data, and `outings.ts:27-37` says so in as many words. But it means any concept that routes the site's navigation through the globe is building on the half of the archive that does not exist yet.

### 2.2 The stat line is already merging the two halves it was written to keep apart

`archiveStats()` (`outings.ts:247-252`) is careful in one direction and not the other. Its own comment explains that counting route stops as outings would print "18 outings · 28 frames" off a globe where ten pins hold nothing, "which is the kind of number that is true of the array and false of the work."

Then it returns `places: placed.length`, and `Home.tsx:135-140` renders:

> `10 places · 28 frames · 3 years`

Zero of those twenty-eight frames were taken at any of those ten places, as far as the site knows. The sentence is grammatically three separate facts and is read as one. This is the same mistake the comment warns about, made on the other field.

It is fixable in one line and it is the cheapest honesty win available. It also, usefully, is the exact thing a dated axis makes impossible to hide.

### 2.3 What a travel diary owes a reader, and what a portfolio owes

A **diary** owes continuity, sequence, dates, the going rather than the arriving, and the boring stretches. Its authority comes from completeness. A diary that only prints the good days is a portfolio wearing a diary's clothes, and readers feel that immediately.

A **portfolio** owes selection, evidence for a specific claim, and reachability. Its authority comes from *in*completeness. Robert Frank shot around twenty-eight thousand frames on the road, cut to eighty-three, and then spent four months on the sequence alone, arranging them into four sections each opening with a flag, deliberately not in the order he travelled. The road trip was the method. The book is not the road trip.

The two owe opposite things about completeness, and a single surface cannot be strong at both. So the site has to decide which is the **spine** and which is the **frame around it**.

`PRODUCT.md` decides it: Users names "potential photo clients (weddings, concerts, events)" first, and the site's one job as "this person has taste and can build." The portfolio is the spine. The diary is why the pictures exist and who made them, which is exactly what the site was missing and exactly what the globe supplies.

This is where Rouven's instinct needs stress-testing rather than executing. "The globe should make the categories obsolete" welds two different jobs to one word. The globe genuinely does make the **category index band obsolete as navigation furniture**. It does not make **categories obsolete as an answer to a client's question**, because a route cannot answer a question a route was never asked.

### 2.4 The honest relationship between where and what, in numbers

| axis | coverage on the 28 published frames | source | grain |
|---|---|---|---|
| **when** | 28 / 28 | EXIF `DateTimeOriginal`, read off the files | per frame, to the second |
| **what** | 28 / 28 | hand-assigned in `categories.ts` | per set, applied after the fact |
| **where** | 0 / 28 | none. ILCE-7 / ILCE-7M4 have no GPS receiver | none |

That table is the whole argument of this document.

Place has full coverage on the ten stops with no photographs and zero coverage on the twenty-eight photographs. Category has full coverage but is, by `outings.ts`'s own account, a costume. **Time has full coverage on the photographs and is recoverable for the stops**, because a person knows what month he was in Vietnam, and that is a completely different kind of knowledge from guessing which valley a frame was shot in.

That distinction matters and it is the one `hero.ts:51-53` already draws. `location` ships empty rather than guess a valley name. But nobody would call it a guess if Rouven wrote `mar '25` next to bali. He was there. There is a passport, a phone, a booking. The rule "do not ship what you cannot verify" does not forbid recalled dates at month precision, and dates at month precision are exactly enough to sort a line.

So: **the axis that joins the two halves of `outings.ts` is time, and it can be joined this week.**

### 2.5 The six categories are not six of the same kind of thing

The fault line is not taxonomy versus route. It runs through the taxonomy itself.

- `weddings` is a **service**. It answers "can I hire you for a thing I already need."
- `concerts` is a **service and a subject**. Somebody books a gig; he also just goes to shows.
- `events` (undeclared, one orphan frame at `images/categories/events/gallery/DSC09296.jpeg`, 2022-05-18) is a **service**, and `PRODUCT.md` names it in Users.
- `nature`, `street`, `animals` are **subjects of a personal practice**. Nobody hires him to shoot `nature`.
- `travel` is **none of the above**. It is not a subject. It is the condition under which nearly every frame here was made.

`travel` is the incoherent one, and `outings.ts:117-139` proves it with timestamps rather than argument: inside `trip-2023-10`, frames alternate between `nature` and `travel` on the same morning and the same night. `03694` at 08:37:37 is nature. `03700` at 08:40:35 is travel. `03828` at 23:05:45 is nature, `03816` at 22:36:58 is travel, and they are the same night in the same place pointed at roughly the same thing.

Those five `travel` frames are not a body of work. They are the frames left over when a trip's photographs were sorted into buckets and some did not fit.

### 2.6 The wedding client

She arrives cold from an Instagram link. She needs, in order: does he shoot weddings, are they any good, how do I book him.

A globe answers none of the three. A route answers none of the three. A dated axis answers none of the three. One word and one link answers all three in about four seconds.

Whatever replaces the category band has to keep her alive. That is a hard pass/fail test and it is the single strongest argument against the purest version of Rouven's instinct. The current hero band puts the literal word `weddings` on screen one (`Home.tsx:148-156`, via `featured` in `categories.ts:130-131`). Any change that removes it is spending something real.

### 2.7 What the second screen is for, and which verb it is

Once the globe has said "here is where," the second screen has to answer "so what did you come back with."

The current answer is: scroll through numbered posters for six categories, four of them featured at a full screen each. For a twenty-eight frame archive, **that is a table of contents longer than the book.** Four full-viewport index pages point at galleries holding six, six, five and six photographs. Frank's ratio was eighty-three kept out of twenty-eight thousand and four months of sequencing; the site's ratio is twenty-eight kept and six index pages.

Interrogating the verb properly:

- **Scroll** is what it does now. A scroll with no argument is a list.
- **Atlas** is a thing you look up, not a thing you read through. Right shape for `/work`, wrong shape for a landing page.
- **Contact sheet** is the honest object for a chronological archive, and it is the photographer's own native document, but it shrinks the photographs to make room for a concept. `PLAYFUL.md` §4 already rejected it as a page for exactly this reason and that rejection still holds.
- **Route** is beautiful and currently empty. Ten stations with no pictures at them is ten empty rooms.
- **Chronology** is the true shape of the data. `outings` is already an array in exactly that order (`outings.ts:88-89`). But a strict chronology puts the wedding fifth of eight and buries the one thing a paying client came for.

The answer is a **sequence**, in Frank's sense: chronology as the material, editorial order as the presentation. Three outings, ordered for the argument rather than by date, each showing photographs rather than a poster about photographs.

### 2.8 A verified bug that this concept has to fix anyway

`WorldGlobe.tsx:36-38` states:

> "With no WebGL, no pointer, or reduced motion, this degrades to a plain list of the places the work came from."

It does not. The rAF loop that positions the pins returns early when `has3D` is false (`WorldGlobe.tsx:61`), and `has3D` is false under **reduced motion as well as under no WebGL** (`WorldGlobe.tsx:52`). Nothing else ever writes a transform, and nothing else ever adds `globe-pin-active`. Meanwhile every `.globe-pin` is `position: absolute; top: 0; left: 0` (`site.css:749-758`) and every `.globe-pin-card` is `max-width: 0; opacity: 0` until `.globe-pin-active` opens it (`site.css:776-802`).

So a visitor with reduced motion enabled, or no WebGL, gets **ten orange dots stacked on top of each other in the top-left corner of an empty square**, with all ten place names present in the DOM but clipped to zero width. There is no `.gl-frame-fallback` child in the globe frame either (`WorldGlobe.tsx:132-141`), so the `.no-webgl` rule at `global.css:234-236` has nothing to show.

SEO and screen readers survive, because the text is really there. The visual fallback does not exist. That is a direct violation of the stated principle that nothing on this site may live behind the ability to run WebGL, and it is a real bug rather than a design opinion.

It also happens to be free to fix in a way that produces the first piece of the recommended thread: the fallback **is** the log list.

### 2.9 Jobs the idea does

**Functional.** Give a cold visitor one true structural fact about this archive within one screen: it comes from a small number of trips by one person over five years. Give a paying client a one-click route to evidence that he does the paid thing. Give Rouven a place to put the 2024 to 2026 work that does not require inventing a new category for it.

**Emotional.** For the visitor, the small click of recognition when the sphere turns to bali and a mark lights up under `mar '25`, and the archive stops being a menu and becomes a life with dates on it. For Rouven, the relief of a structure that is true, so that publishing means recording what happened rather than deciding which bucket a picture belongs in.

### 2.10 Load-bearing assumptions

1. **Rouven can put a month against each of the ten route stops without guessing.** If he cannot, the axis has ten holes and the entire thread drops back to outings-only. This is assumption zero and it is testable in five minutes (§12).
2. **An outing is a more interesting unit to a stranger than a category.** Nine frames from one week reads as a body of work; the same nine split across three galleries reads as three thin galleries. Unverified.
3. **The route is recent.** `/about` says "for the past year it's been just me," and bali through tokyo reads as the current chapter. If the route is actually 2019, a dated axis publishes a two-year silence as its most legible fact and the concept is much weaker.
4. **The unreleased 2024 to 2026 work will actually land.** A dated axis is a staleness meter pointed at the owner. That is a feature only if the owner keeps feeding it.
5. **A client who reaches `/work` in one click is not lost.** The header carries `work` on every page (`Header.tsx:10`). If the drop-off from removing category names from the hero is severe, §7 spread 01 being a wedding is the only defence and it may not be enough.
6. **Twenty-eight frames is enough to fill three spreads well.** The three chosen outings hold 6, 6 and 9 frames, so yes, today. It is the only reason this works at this archive size.

### 2.11 First principles

Start from what an archive is rather than what portfolio sites look like.

An archive has exactly one axis that is not an opinion: **the order things were made in**. Everything else, including subject, quality, series and theme, is applied afterwards by a person with a view. `outings.ts` discovered this the hard way, by reading EXIF, and wrote it down at lines 3 to 12.

The second principle: **an index should be shorter than the thing it indexes.** Six full-screen posters over twenty-eight photographs inverts that. Any structure proposed here has to reduce the ratio of navigation to content, not rearrange it.

The third: **two navigation systems on one surface is not redundancy, it is a contradiction.** `site.css:1611-1617` already documents the site noticing this: the category index band and the ticker "list the same categories, so on a screen this narrow it is the same information twice." The fix chosen then was to hide the band on phones, which deleted the functional one and kept the decorative one. That was the wrong one of the two to delete, and it is the smoking gun that this section of the page was never resolved, only compressed.

### 2.12 Second-order implications

- **Publishing changes shape.** Today a new category is six lines in `categories.ts`. Under the log, adding work means adding an outing: dates, frames in capture order, and a place if he knows it. That is more work per publish and it produces a better artefact, because every publish extends the axis and the axis is the thing that reads as alive.
- **The site gets a clock.** Once the newest tick is visible, a gap is visible. That is the cost of every dated structure and it does not have a mitigation, only a discipline.
- **The globe stops being decoration the moment a stop gets frames.** The first time a pin's card says `mar '25 · 7 frames` instead of `frames to come`, the whole hero retroactively becomes navigation. Everything in this plan should be built so that this event costs zero code and only data.
- **`/work` gets easier to argue about.** Once it is the client surface rather than the site's structure, questions like "should animals be a category" become commercial questions with obvious answers instead of taxonomic ones with none.
- **Category becomes a tag, so it can multiply.** A frame can honestly be street and travel once neither is a section. That is not worth building now, but the structure stops forbidding it.

### 2.13 Failure modes, including the quiet ones

**The globe becomes the 2021 camera.** `PRODUCT.md` anti-reference 1 is the 3D model you had to click to find the work. The globe today passes, because it tours itself (`Globe.tsx:310-324`) and because the index band below it reaches the work without touching 3D (`Home.tsx:144-147`). Removing the index band's links without replacing their function is precisely how this concept could fail into the anti-reference. Whatever sits at row 7 of the hero grid has to keep being a working index.

**Travel-brag kitsch.** A list of countries, a flag row, a "27 countries" counter, a passport-stamp graphic. This is the register the whole idea sits next to and it is one bad decision away at all times. The defence is that the axis is a chart, not a boast: it counts frames and dates, not countries, and it shows gaps.

**The map that is a mood board.** A globe with pins where nothing was shot is decorative geography. Ten pins currently say `frames to come`, which is honest, and ten honest pins are still ten pins with nothing behind them. If the frames never land, the globe is a very well-engineered claim about a life rather than about work.

**Data-viz drift.** Ticks, axes, hover states, a legend. Four more of those and the hero is a dashboard. `PRODUCT.md`'s lane is concert poster and darkroom print, and a museum wall timeline sits just inside it while a d3 chart sits well outside.

**The staleness meter.** Covered above, and it is the one that could embarrass. Today the newest EXIF date on the site is 2024-02-13. An axis that ends there and is read in 2026 says something the site does not want to say.

**Two theses again.** The brief is explicit: `shoot. grade. ship.` was cut and `the grade.` was moved below the work because two full-width identity statements one screen apart were arguing. Adding a `the log.` section heading risks re-litigating that. It is defensible as a matched pair of section labels at the same scale rather than as a second lockup, but it is exactly the kind of thing that feels fine in a document and wrong on a screen.

**Losing the client while gaining the character.** The clearest version of this idea is the one where the word "weddings" does not appear until the visitor scrolls. That is a real commercial cost paid for a real editorial gain, and it should be paid deliberately or not at all.

### 2.14 Constitution tests

Carrying forward `PLAYFUL.md` §2.12 and adding the ones this concept needs.

| # | Test | Question |
|---|---|---|
| T1 | **Gating** | If a visitor never touches the globe, do they lose content? Must stay no. |
| T2 | **Three seconds** | Can a cold client name what this person does and see a photograph within three seconds? |
| T3 | **One loud moment** | Does each surface still have exactly one loud moment? |
| T4 | **On, not beside** | Is the effect happening on the images or next to them? |
| T5 | **DOM** | Is every readable word in DOM and selectable? |
| T6 | **Three objects** | Darkroom print, concert poster, sticker sheet. Which one is this? |
| T8 | **Not-generic-dark** | Would this survive being described without naming the site? |
| T10 | **Eighteen months** | Still true and un-embarrassing with no maintenance? |
| **T11** | **Wedding test** | A visitor who wants a wedding photographer: how many screens and how many clicks to evidence he shoots weddings? Must be at most one of each. |
| **T12** | **No-guess test** | Does any field ship a value that was inferred rather than known? (`hero.ts:51-53`, `outings.ts:21-26`) |
| **T13** | **Asymmetry test** | Does the surface still work with 8 dated outings and 10 empty stops? Does it get better, not different, when a stop gets frames? |
| **T14** | **Index ratio** | Is the navigation shorter than the content it navigates? |
| **T15** | **Static test** | With WebGL off, motion off, and JS pointer events unused, is the same information still on the screen? Today the globe fails this (§2.8). |

---

## 3. Range

Fifteen positions. Cross-domain analogies, inversions and combinations are labelled.

### R1. Leave the structure, fix the words

The globe stays a one-time hero, the four category posters stay, and the whole intervention is copy: better taglines, a truer stat line, a subtitle on the featured band that admits the categories are a sorting convenience. Cheapest thing in the document and reversible in an afternoon. Its ceiling is that the page still makes two incompatible claims about what the archive is, just more politely.

### R2. The route as scroll spine (cross-domain: Hiroshige's Tōkaidō)

Hiroshige's Hōeidō edition, 1833 to 1834, is fifty-five prints for fifty-three post stations, one image per station plus the start at Nihonbashi and the end at Sanjō Bridge. The whole series is a road, published as a numbered sequence, and the numbering is the navigation. Applied here: the accent arc leaves the globe, becomes a vertical accent line down the left gutter of the page, and each of the ten stops is a numbered station on it with its frames beside it. It is the most beautiful thing in this list and it currently has ten stations and no pictures.

### R3. The globe as persistent chapter rail (cross-domain: the thumb index)

A dictionary or a bible has thumb-cut tabs in the fore edge: the index is physically present on every page and tells you where in the whole you are without opening anything. Applied here: the globe shrinks to a small persistent object in the header or the left gutter and stays for the whole scroll, turning to whatever place the current section came from. It makes the globe structural rather than ceremonial and it costs a permanently mounted WebGL object competing with every photograph on the page, plus a continuous GPU budget on a site whose one loud moment is supposed to be elsewhere.

### R4. Time as the axis: the log line (cross-domain: the eBird checklist)

Birders do not file sightings by species, they file them by **checklist**, and a checklist is one outing: a location, a start time, a duration, a distance, a protocol of stationary or travelling, and then whatever was seen. The unit of the data is the trip, and the species list is derived from it. That is structurally identical to `Outing` in `outings.ts`, which already carries `from`, `to`, `place`, `coords` and `frames`. Applied here: the hero's hairline rule becomes a dated axis with one tick per outing, both halves of the file on one line, and the tick lights when the globe presents its pin.

### R5. The contact sheet home page (cross-domain: Magnum contact sheets)

All twenty-eight frames on one screen in capture order, thumbnail scale, with grease-pencil marks: rings on the kept ones, strikes on the gaps, a terse note in the margin. It is the photographer's own working document and it is the most honest possible presentation of a small archive read back in order. It shrinks every photograph to make room for the concept, which inverts `PRODUCT.md` principle 1, and `PLAYFUL.md` §4 already rejected it once for that reason.

### R6. Categories demoted to filters

One index page holding every frame, with chips across the top: `weddings` `concerts` `street` `nature` `animals`. Click one, the grid filters. Categories survive with zero editorial weight and the archive is browsed rather than sequenced. It is the correct answer if the archive were five hundred frames and it is a webapp move on a site whose brand references are a concert poster and a sticker sheet.

### R7. Outing spreads

The featured module keeps its geometry, which is the most hard-won layout in the repo (`site.css:914-926` documents four separate accidents it was built to fix), and changes its noun. Each row becomes one outing: a date stamp where the photo count is now, a real place or nothing, one line in Rouven's voice, and a second smaller frame in the currently empty top of the caption column so that a spread visibly contains more than one picture. The number `01` stops being an arbitrary rank among categories and becomes a position in a log.

### R8. Kill the second screen (inversion: do less)

Hero globe, byline, `all work.`, footer. One screen, one object, one link. Everything below the fold moves to `/work` and `/log`. It is the only proposal here that makes the home page faster, and it hands the entire first impression to a 3D object, which is one bad WebGL context away from being a blank page with a name on it.

### R9. The globe loses and the categories win (inversion: the honest opposite)

Argue the globe is the gimmick. `PRODUCT.md` anti-reference 1 is a 3D object at the top of a portfolio, the archive has zero geotagged frames, and the one thing clients actually search for is a subject word. Under this reading the right move is to delete the globe, put four enormous category posters above the fold, and let `weddings` and `concerts` be the loudest words on the site. This deserves to be argued seriously and it is the only position here that scores full marks on T11.

### R10. Two doors (cross-domain: publishing imprints)

A trade publisher and its literary imprint carry different names on the spine because they are answering different readers, and nobody pretends one list serves both. Applied here: below the globe the page forks into exactly two links at display scale. `commissions` goes to weddings, concerts and events. `the log` goes to everything else. Two doors, no taxonomy on the home page at all, and the fork itself is the statement about how this person works.

### R11. Topology, zoom into a place (Rouven's "a little too wild for now")

The globe is not the whole idea, it is the top level of one. Pull toward a pin and the sphere resolves into terrain, then into a place, then into the frames shot there. Assessed honestly: the drei `<View>` architecture would take it, the land mask (`land-mask.ts`, 8.8KB gzipped) would not, since it resolves continents and not valleys, and there is no per-place imagery to zoom into. More fundamentally it puts the work behind a gesture on a 3D object, which is the anti-reference verbatim. The path back is real though: it becomes worth building the day one stop holds twenty frames instead of zero.

### R12. The empty slot (cross-domain: the sticker album)

Panini albums print every slot, numbered, with the outline of the sticker that is missing. The gap is part of the product and it is what makes the album an object you return to rather than a book you read. Applied here: the ten travelled stops are shown as numbered empty frames with a place and a date and no picture, exactly as honest as `frames to come` and much more legible. The risk is that a portfolio advertising what it does not have is a strange thing to put in front of a paying client.

### R13. The sequence (cross-domain: Robert Frank)

*The Americans* is eighty-three photographs cut from roughly twenty-eight thousand, sequenced over four months into four movements each announced by a flag, in an order that has nothing to do with the order they were shot. Applied at full strength: the home page carries no index at all. Nine to twelve photographs, sequenced by hand, with one recurring motif marking the section breaks, and every navigational question deferred to `/work` and `/log`. It is the strongest possible argument that a portfolio's home page should be an edit rather than a menu, and it requires an editing skill and a time budget the site has never spent.

### R14. Combination: the log line plus outing spreads (R4 + R7)

The axis does the structure and the spreads do the content. The axis is the only thing on the home page that shows both halves of `outings.ts` at once, and the spreads are the only thing that shows what an outing actually is. Neither works alone: an axis over category posters is a chart bolted to a contradiction, and outing spreads with no axis are just four rows with dates on them.

### R15. Combination: two doors plus outing spreads (R10 + R7)

The wedding-safe version. The hero forks into `commissions` and `the log` at display scale, the spreads sit under `the log` side, and a client is one screen and one click from evidence. It scores best on T11 of anything here and it spends the home page's one loud moment on a pair of navigation links rather than on a photograph.

---

## 4. Convergence

**Selected: R14, sequenced as R4 → R7, with R12's honesty folded into the axis and R9's objection answered structurally rather than argued away.**

Why each thing being set aside loses.

**Over R1 (fix the words only).** R1 is the right instinct at the wrong layer, and `PLAYFUL.md` already spent its copy budget. The problem here is not that the page is badly written, it is that the page makes two claims about what the archive is and the visitor has to reconcile them. No sentence fixes that.

**Over R2 (Hiroshige, route as spine).** This is the closest call in the document and the most attractive object. It loses on one number: the route has ten stations and zero photographs. Fifty-five prints for fifty-three stations works because Hiroshige drew every station. A spine with nothing on it is a very elegant argument that the work is elsewhere. It reopens the day two or three stops hold frames, and the log axis is deliberately built so that it can become this without being rebuilt.

**Over R3 (persistent globe rail).** Fails T3 and T4 at once. A permanently visible turning sphere competes with every photograph for the whole scroll, and it puts a WebGL object beside the images rather than an effect on them, which `PRODUCT.md` principle 1 forbids in almost those words. Also a continuous draw cost on every page, on a site that lazy-loads three.js specifically to keep it off the critical path (`App.tsx:20-21`).

**Over R5 (contact sheet home page).** Rejected for the same reason `PLAYFUL.md` §4 rejected it: it shrinks twenty-eight photographs to make room for a concept about photographs. The mark vocabulary is worth having and belongs on `/log`, not on the landing page.

**Over R6 (filters).** Filters are for archives you cannot read in one sitting. Twenty-eight frames can be read in one sitting. Adding a filter UI to a small archive tells the visitor there is more here than there is, and the first click reveals a grid of three.

**Over R8 (kill the second screen).** Tempting, and it would genuinely fix the "no concept below the hero" complaint by deleting the below. It fails T2 and T11 hard: a visitor who arrives when the WebGL context is slow sees a name and a link. It also throws away the featured module, which is the best piece of layout reasoning in the repo.

**Over R9 (delete the globe, categories win).** This is the position that has to be beaten rather than dismissed, because it is right about the client. It loses for two reasons. First, the globe is not gated: it tours itself (`Globe.tsx:310-324`), it has never hidden anything, and every word on it is DOM (`WorldGlobe.tsx:26-38`), so the anti-reference does not actually apply. Second, and more decisively, the category-first site is a site anyone could build and `PRODUCT.md`'s one job is "this person has taste and can build." R9's objection is answered by moving the categories to `/work` and putting a wedding in spread 01, not by keeping them as the home page's structure.

**Over R10 / R15 (two doors).** The best T11 score in the document, and it loses on `PRODUCT.md` principle 1 and principle 2 together. It spends the home page's loud moment on two navigation words at display scale, which is a menu pretending to be a statement, and it puts a hard commercial fork one screen into a personal site. It is the right fallback if the wedding test measurably fails after building.

**Over R11 (topology).** Rouven's own instinct that this is too wild for now is correct, and for a more specific reason than wildness: there is nothing to zoom into. No per-place imagery, no terrain data, a land mask that resolves continents. Building the zoom before the frames exist would be spending the site's whole engineering budget on an empty room.

**Over R12 (empty slots as a section).** Folded in rather than rejected. The empty slot is the right *honesty* mechanic and the wrong *section*. On the axis, an undated stop with no frames is a hollow tick, which reads as a chart with a gap. As a grid of empty frames on the home page it reads as a portfolio advertising its own absences.

**Over R13 (pure sequence).** The most artistically serious position here and the one this document is least confident about rejecting. It loses on the same ground as R8, T11 and T14: a hand-sequenced run of nine photographs with no index is a book, and a client who needs to know whether you shoot weddings cannot use a book. It also requires four months of Frank's kind of attention, and the site does not have twenty-eight thousand frames to cut from.

### Why the phasing is part of the recommendation

The first phase is data, not code: put a month against each of the ten route stops. If Rouven can do that in five minutes, everything else here is live and the axis has eighteen honest ticks. If he cannot, the axis has ten holes, and the correct move is to build R7 alone and leave the hero exactly as it is. That is a genuine fork and it costs nothing to resolve before writing a line.

---

## 5. The experience

A wedding client, cold, on a laptop, from an Instagram link. Then the same page for a developer who came from a GitHub profile.

**0.0s.** The loader lifts. The globe is already turning, dots over land, an accent arc lifting off the Pacific. `rouven lührs, photographer & creative developer` rises under it. Under that, in mono: `8 outings · 28 frames · 2021–2026`.

**1.2s.** A hairline draws itself left to right across the full width of the hero, the way `hero-rule` already does today (`Home.tsx:95`). It stops being a rule when it arrives, because it has ticks on it, and three of them carry a year: `2021`, `2023`, `2025`. Eighteen ticks, unevenly spaced, bunched hard in late 2023 and again through the nomad year. It reads as a ruler somebody has been marking.

**1.9s.** The globe finishes its swing to bali and the card opens: `bali, id` / `mar '25 · frames to come`. At the same instant, one tick near the right end of the axis fills with accent. She does not consciously connect them. She notices that the two things are one thing.

**2.4s.** Under the axis, small: `the log ✦ what i shoot ✦ about`, and on the right, `scroll`.

**She scrolls.** No ticker. The page goes straight from the hero into the work.

**Spread 01.** A print on the left, five by six, the same size the four category covers are today. Above its top edge the outline `01`. On the right, seated on the print's bottom edge:

> `26 aug 2023 · one afternoon · 6 frames`
> **the wedding**
> `i shot the whole thing between half one and ten to three. it was the fastest day i've ever worked.`
> `see all six →`

And in the empty upper part of that same column, where there is currently nothing at all (`site.css:956-965`, bottom-aligned, so the top of columns 8 to 12 is genuinely free), a second frame from the same afternoon at about a third the size, with its own timestamp under it: `14:22:55`.

She has her answer. It took one screen and no clicks. Two photographs from the same wedding, seventy-five minutes apart, and a sentence that tells her what he is like to have in the room.

**Spread 02.** Mirrored. The acid-green stage frame, the loudest picture on the site, and:

> `23 dec 2023 · 83 minutes · 6 frames`
> **the gig**

**Spread 03.** The october trip. Nine frames, six days, and the caption says the thing the whole site is built on:

> `16–22 oct 2023 · six days · 9 frames`
> **the october trip**
> `two of these are three minutes apart. the site used to file them in different galleries.`

**`all work.`** Unchanged, straight to `/work`, where the six become five plus a fork, and where the ticker now lives.

**`the grade.`** Unchanged. Craft, the plate, the drag.

**About teaser, footer.** Unchanged.

**Now the developer.** Same page. He gets to the axis at 1.2 seconds, grabs the globe, spins it, tilts it to look at the south pole, lets go, watches the tour take it back after six seconds (`Globe.tsx:80`), and notices that whichever pin lands front-on lights a tick on the axis below. He scrolls to `the grade.`, finds the drag handle, pulls the wipe back and forth four times. He does not read a single caption. He has the whole argument.

**And a third visitor**, on a phone, with reduced motion on. No globe. In its place, an ordered list: ten stops with places and months, eight outings with dates and frame counts, in one column, in order. The axis under it is the same eighteen ticks and does not animate. Same information, no WebGL, no gestures, no motion.

---

## 6. Candidate mechanics

Each traced to data the site actually has. Dependencies flagged.

### 6.1 The log axis

**Data:** `outings` (`outings.ts:89-196`) for the eight dated outings, and `route` (`outings.ts:69-86`) for the ten stops. Tick position is `from` normalised across the full span. Tick style is `frames.length > 0 ? solid : hollow`, which is `outings.ts` data verbatim.
**Where it goes:** `.hero-rule`, grid area `6 / 1 / 7 / -1` (`site.css:605-611`). It already spans the full width and already has a `scaleX: 0 → 1` entrance from the left (`Home.tsx:95`), which is how an axis should draw itself. The element becomes a `<ol>` with absolutely positioned `<li>` ticks.
**Coupling to the globe:** `activeRef.current` is already written every frame by `Globe.tsx:355` and already read by a rAF loop in `WorldGlobe.tsx:60-82`. Lighting the matching tick is one more line inside a loop that already runs. Zero new render cost, zero React renders.
**Dependency:** dates on the ten route stops. Hard blocker. See §11.1.

### 6.2 The route stops get months

**Data:** does not exist. Rouven's memory, at month precision.
**Format:** `from: '2025-03'`. Verified against the existing formatter: `stamp()` at `WorldGlobe.tsx:13` reads `iso.slice(5,7)` and `iso.slice(2,4)`, so `'2025-03'` renders as `mar '25` with no code change at all.
**Honesty:** this needs a `datePrecision: 'exif' | 'recalled'` field on `Outing` so the file keeps its own standard (`outings.ts:18-20` distinguishes fact from hand-entry and should keep doing so).
**Dependency:** Rouven. Everything else waits on this.

### 6.3 Outing spreads

**Data:** `outings`, `framesOf()` (`outings.ts:210-211`), and the existing `.featured` module.
**Reuse, not rebuild:** `.featured-media` at columns 1/7, `.featured-text` at 8/13, `align-items: end` on the parent, `aspect-ratio: 5/6` and `max-height: 78svh` on the image (`site.css:939-988`). Every one of those stays. The change is what fills `.featured-count` (a date range instead of `6 photos`), `.featured-title` (the outing's `title` instead of the category's), and `.featured-tagline` (the outing's `note`).
**The second frame:** goes in the free upper region of `.featured-text`, which `PLAYFUL.md` §6.3 already identified as a real addressable area. Fixed slot, fixed ratio, one per spread, never two, or the module stops being a module.
**Dependencies:** `title`, `note` and `cover` on `Outing`, all three currently absent or null. Rouven has to write three titles and three sentences. Same publishing dependency `PLAYFUL.md` §8.6 flagged, same standard applies: a spread with no true sentence gets no sentence.

### 6.4 The outing stamp in the galleries

**Data:** none new. Invert `outings[].frames[].src` into a `Map<string, Outing>`, exactly the way `bySrc` is already built in the other direction at `outings.ts:205-207`.
**What it does:** every photo in `/work/:category` gets a small mono stamp, `19 oct 2023 →`, linking to `/log/:slug`. So `03694` in `nature` and `03700` in `travel` carry the same stamp, three minutes apart, and one click puts them back together.
**This is the smallest mechanic here and the one that most directly resolves the complaint in `outings.ts:9-12`.** Cost is one derived map and one anchor.

### 6.5 The hero index band, retargeted

**Data:** none. It currently maps `featured` (`Home.tsx:150-155`). It becomes three fixed links: `the log`, `what i shoot` (to `/work`), `about`. `scroll` and `.hero-scroll-line` stay untouched.
**Why `what i shoot` rather than `all work`:** the link label itself answers the client's question, which buys back part of what removing the category names costs.

### 6.6 The ticker moves to `/work`

**Data:** the category list, which is what it already carries. On `/work` that content is correct rather than duplicative, and the marquee stays in the brand's vocabulary (`PRODUCT.md` Aesthetic lane names "marquee tickers" explicitly).
**Cost:** the home page loses its only full-bleed band between the hero and the work. The axis inside the hero is the replacement for that energy and it is quieter. Flagged in §8.

### 6.7 The static fallback list

**Data:** `outings`, same as everything else.
**What it fixes:** the verified bug in §2.8. When `has3D` is false, `WorldGlobe` renders an `<ol>` of stops and outings instead of ten absolutely-positioned pins with no transforms.
**Why it comes first:** it is the `/log` page in miniature, so building it produces both the bug fix and the skeleton of the new route in one pass. Cheapest item in the plan and the only one that is a bug fix rather than a feature.

### 6.8 `/log` and `/log/:slug`

**Data:** `outings` and `framesOf()`.
**`/log`** is the chronology: every outing newest first, dated, placed where known, with frame counts, and stops that say `frames to come`. It is the globe's list view and the axis's expanded form.
**`/log/:slug`** is one outing, all its frames in capture order with timestamps, across whatever categories they were filed under.
**Naming:** `log` because it is a ship's log, a data log, and `log-c`, which is the transform the whole site is built on (`hero.ts:53-56`, `imagePlane.ts`). Nothing anywhere points at the pun. The risk is that people read it as "blog." Alternative is `/route`, which is duller and unambiguous.

### 6.9 What the categories become, precisely

- **Off the home page entirely.** `featured` (`categories.ts:129-131`) stops being rendered by `Home.tsx`. The four numbered posters go. The category names leave the hero band.
- **They become `/work`,** which stays the six cards it is now (`Work.tsx:49-79`), reorganised into two groups by a new `role` field: `commission` for weddings, concerts and events, `practice` for nature, street and animals. Two headings, one page, no toggle.
- **`travel` is cut.** Its five frames are not a body of work, they are the residue of sorting `trip-2023-10` and `trip-2021-10` into buckets (`outings.ts:128-138`, `191-194`). They redistribute by what the frame actually shows. `/work/travel` gets a redirect, since it is a live URL.
- **The orphan gets a home.** `images/categories/events/gallery/DSC09296.jpeg` (2022-05-18) either declares an `events` category or folds into a retitled `weddings & events`. Recommended: fold, because one photograph is not a category and `PRODUCT.md` Users groups the two anyway. Rouven's call.
- **They stay the tag on every frame,** which is what `categories.ts` already is, and they stay how galleries are addressed.

### 6.10 The stat line

**Change:** `10 places · 28 frames · 3 years` becomes `8 outings · 28 frames · 2021–2026`, where the range end comes from the newest dated thing in the file including route stops. `places` stops being printed next to `frames` as if they were the same set. One line in `archiveStats()` (`outings.ts:247-252`) and one in `Home.tsx:135-140`.

### 6.11 Degradation, stated per surface

| condition | globe | axis | spreads | index band |
|---|---|---|---|---|
| **no WebGL** | static `<ol>` of stops and outings (6.7). Currently broken, §2.8 | unaffected, pure DOM | `.gl-frame-fallback` `<img>` already handles this (`global.css:233-236`) | unaffected |
| **reduced motion** | same as no WebGL, since `has3D` already includes `prefersReducedMotion()` (`WorldGlobe.tsx:52`) | ticks present, no draw-on animation | no scroll entrance, already gated (`Home.tsx:373`) | no `scroll-tick` animation, already gated (`site.css:706-710`) |
| **no pointer / keyboard only** | the tour runs unattended (`Globe.tsx:310-324`), nothing is behind the drag | ticks are focusable links | ordinary links | ordinary links |
| **no JS** | nothing renders in the frame, so the list should be the server-rendered default and the canvas an enhancement | ticks are static DOM | fallback `<img>` | fine |
| **phone** | as today | ticks compress; year labels drop below ~700px, ticks stay | one column, as today (`site.css:1465-1491`) | as today |

---

## 7. The new homepage sequence, section by section

| # | section | what it is | change |
|---|---|---|---|
| 1 | **hero** | globe, byline, stat line | globe unchanged. Stat line honest (6.10) |
| 2 | **the axis** | the hairline at grid row 6, with eighteen ticks | new. Replaces a plain rule (6.1) |
| 3 | **the band** | `the log ✦ what i shoot ✦ about` + `scroll` | retargeted, same element (6.5) |
| 4 | ~~ticker~~ | | deleted, moves to `/work` (6.6) |
| 5 | **spread 01** | the wedding, aug 2023, 6 frames | was `01 nature` |
| 6 | **spread 02** | the gig, dec 2023, 6 frames | was `02 concerts` |
| 7 | **spread 03** | the october trip, 9 frames, six days | was `03 travel` |
| 8 | ~~spread 04~~ | | deleted. Three is enough for a 28-frame archive (T14) |
| 9 | **`all work.`** | link to `/work` | unchanged |
| 10 | **`the grade.`** | Craft, plate, drag | unchanged |
| 11 | **about teaser** | | unchanged |

The dead band Rouven is pointing at is grid row 5, the `1fr` slack between the byline and the rule (`site.css:392`, and the comment at `383-387` says it is deliberate: "slack belongs on both sides of the subject"). Nothing new goes in it. It stops reading as dead because the thing below it is worth arriving at. If it still reads dead after the axis ships, the fix is a single number: raise the globe's `min(100%, 62svh)` cap (`site.css:421-426`) and let the sphere eat the slack. That is one line and it is reversible.

---

## 8. Constraint / constitution audit

| Principle (source) | How the thread honours it | Tension |
|---|---|---|
| **Photos are the hero; 3D serves them** (`PRODUCT.md` Strategic 1) | The spreads show photographs instead of covers-of-galleries, and there are six real frames on the home page where there were four covers. The axis is a 1px rule | The globe is still a 3D object holding the first screen, and it holds zero photographs |
| **One loud moment per surface** (Strategic 2) | Hero: the globe. Work: the prints. Craft: the drag | The axis is a fourth thing in the hero. It is mono at 0.7rem, the same register as `hero-stats`, so it should read as caption layer. Not knowable from a document |
| **All readable text in DOM** (Strategic 3) | Every tick, date, place and caption is DOM. Nothing new enters WebGL | None |
| **Cold clients judge in seconds; taste + can build** (Users) | Spread 01 is a wedding. The axis is the "can build" evidence for anyone who reads it | The word `weddings` leaves screen one. See §9.1 |
| **Confident, playful, handmade** (Brand voice) | A ruler somebody has been marking is a handmade object in the true sense | An axis is the least playful object proposed in either document |
| **Lowercase everything** (Brand voice) | Dates set lowercase, `mar '25`, `26 aug 2023` | None |
| **darkroom print / concert poster / sticker sheet** (Brand voice) | Weakest fit in the audit. The nearest of the three is the concert poster's tour-date list, which is a dated index in exactly this register | Real. A timeline is not obviously any of the three objects. See §9.4 |
| **Marquee tickers, index numbers, committed accent** (Aesthetic lane) | Index numbers survive on the spreads. Accent is the tick fill and the arc | The ticker leaves the home page, which removes one named item from the lane |
| **NOT minimal-gallery-white, NOT editorial-serif** | Unaffected | None |
| **Anti-ref: gimmick over content** (Anti-references) | Nothing moves behind the globe. The band still reaches the work without touching 3D. R11 explicitly rejected | The band's links become generic (`what i shoot`) rather than specific (`weddings`), which weakens the escape hatch |
| **Anti-ref: generic AI dark portfolio** | An eighteen-tick dated axis over an eight-outing archive is not a thing a generator produces | None |
| **One `<Canvas>`, everything through `<View>`** (architecture) | Nothing new is 3D. The axis is DOM reading a ref that already exists | None |
| **Nothing behind WebGL, pointer or motion** (architecture) | 6.7 fixes a currently broken case rather than adding one | The fix is a precondition of this plan, not a bonus |
| **No second identity lockup** (brief) | No `the log.` heading in phase one. The spreads carry their own titles | If the section reads unlabelled and a heading gets added later, this is where it goes wrong. See §9.3 |
| **Data asymmetry must degrade gracefully** (`outings.ts:27-37`) | The axis is the first surface that shows both halves at once without merging them: solid ticks have frames, hollow ticks do not | Hollow ticks are gaps, and eighteen ticks of which ten are hollow is a chart that is mostly empty |
| **No guessed values** (`hero.ts:51-53`, `outings.ts:21-26`) | Recalled months are distinguished from EXIF dates by a `datePrecision` field | Recalled months are still not read off a file. This is a genuine loosening of the standard and it should be an explicit decision |

---

## 9. Constraint-risk flags

Stated plainly, without softening the constraint to fit.

### 9.1 The word `weddings` leaves the first screen

Today a wedding client sees `nature ✦ concerts ✦ travel ✦ weddings` in the hero (`Home.tsx:148-156`). Under this plan she sees `the log ✦ what i shoot ✦ about`. That is a real commercial cost. The defences are spread 01 being a wedding, the header's permanent `work` link, and a link label that answers her question. None of them puts the word on screen one, and T11 as written ("at most one screen and one click") is passed on a technicality: one screen of scroll, zero clicks.

If this matters more than it looks, R15 is the fallback and it is a small change from here.

### 9.2 The axis publishes a gap

The newest EXIF date on the site is `2024-02-13` (`outings.ts:96-98`). If the route stops turn out to be older than assumed, or if the unreleased 2024 to 2026 work does not land, the most legible fact on the home page becomes a long empty stretch at the right end of a line. There is no design mitigation for this. It is a maintenance contract, and it is the same failure `PLAYFUL.md` §4 used to reject a `/now` page.

### 9.3 A `the log.` heading would be a second thesis

The brief is explicit that `shoot. grade. ship.` was cut and `the grade.` moved because two full-width statements one screen apart were arguing. A `the log.` section heading at the same scale as `the grade.` is defensible as a matched pair and is exactly the kind of thing that reads fine in a document. Phase one ships without it. If the spread section reads as unlabelled and a heading gets added, that is the moment to check whether the page is arguing with itself again.

### 9.4 A timeline is not obviously one of the three objects

`PRODUCT.md`'s brand voice names darkroom print, concert poster and sticker sheet. A dated axis is a fourth kind of object: a chart. The nearest honest bridge is a tour-date list on the back of a concert shirt, which is a dated index in exactly this typographic register, and that bridge should be drawn deliberately in the design of the ticks rather than assumed. If it ends up looking like analytics, it is off-brand regardless of how correct the data is.

### 9.5 Recalled dates loosen the file's own standard

`outings.ts` is written as a file that ships only what was read off the files, and it is proud of that. Adding `from: '2025-03'` from memory is a different kind of value even at month precision. The `datePrecision` field keeps the distinction visible in the source, but the rendered surface will not distinguish them, and a visitor cannot tell which ticks are EXIF and which are recollection.

### 9.6 Cutting `travel` moves five published photographs

Five live URLs' worth of frames get reassigned and `/work/travel` needs a redirect. Two of the five (`03816`, `03862`) are from the same night as three `nature` frames and reassigning them is easy. `8251` from 2021 is less obvious. This is Rouven's editorial call and it is a small amount of real work.

### 9.7 The globe still holds ten pins with nothing behind them

This plan does not fix that. It makes it honest and legible rather than hidden, which is better, and it is not the same as fixed. Until at least one stop holds frames, the globe remains the credential rather than the index, and anyone who reads the pins carefully will notice.

---

## 10. What to explicitly NOT build

- **Zoom-into-a-place topology (R11).** No terrain, no per-place imagery, a land mask that resolves continents. Revisit when one stop holds twenty frames.
- **A country counter, a flag row, a passport-stamp graphic, or "27 countries."** The travel-brag register, one decision away at all times.
- **A scrubbable timeline with a draggable handle.** The axis is a chart, not a control. Hover names a tick, click jumps. Nothing more.
- **A second globe anywhere else on the site.** One 3D subject, one surface.
- **Filters, chips or a "by trip / by subject" toggle on `/work` (R6).** A toggle asks the visitor to do the editorial work, and both views would share a URL a client might land on.
- **Empty photo slots for the ten unphotographed stops (R12 as a section).** The hollow tick carries the same honesty without advertising absence at print scale.
- **A `the log.` display lockup in phase one.** See §9.3.
- **A fourth spread.** Three is the number that keeps the index shorter than the content.
- **Rebuilding the featured module.** Its geometry is the best layout reasoning in the repo and everything here is a content swap inside it.
- **Deleting the categories.** They move, they lose one member, they stop being the site's structure. They do not stop existing.

---

## 11. Build order, cheapest and highest confidence first

**Phase 0. Ten months.** Data only, no code. Put `from` on each of the ten route stops at month precision, plus `datePrecision`. Thirty minutes and it decides whether the rest of this document is live. If it cannot be done honestly, skip straight to phase 3 and leave the hero as it is.

**Phase 1. The static list.** Fix the verified bug in §2.8: when `has3D` is false, render the stops and outings as an `<ol>`. This is a bug fix, it is the no-WebGL and reduced-motion fallback, and it is `/log` v0. Highest confidence item in the plan.

**Phase 2. The stat line.** One line in `archiveStats()`, one in `Home.tsx`. Stop printing `10 places` next to `28 frames`.

**Phase 3. The spreads.** Swap four category `FeaturedSection`s for three outing spreads. Content change inside an existing module. Add `title`, `note` and `cover` to `Outing` and write three of each. Ship this and live with it for a week before touching the hero. If the page reads better with three outings than with four categories, the central assumption is confirmed and everything after this is worth doing.

**Phase 4. The band and the ticker.** Retarget `hero-index-links` to three links. Move the ticker to `/work`. Small, reversible, and it can ship the same day as phase 3.

**Phase 5. The axis.** Ticks on `hero-rule`, then the `activeRef` coupling. This is the concept's loud moment and it is deliberately last among the visible work, because everything before it is useful even if the axis never gets built.

**Phase 6. `/work` reorganised.** `role` on `Category`, two groups, cut `travel`, redirect, resolve the orphan.

**Phase 7. `/log` and `/log/:slug`,** and the outing stamp in the galleries (6.4). The stamp is the payoff of the whole idea and it depends on `/log/:slug` existing, which is why it lands last despite being the smallest.

**Deferred indefinitely.** The route as scroll spine (R2), topology (R11), the contact sheet (R5), anything that treats the globe as navigation before a stop has frames.

---

## 12. Open questions

Only Rouven can answer these, and the first one gates everything.

1. **Can you put a month against each of the ten route stops without guessing?** Bali, bromo, hanoi, chiang mai, bangkok, da nang, brisbane, sydney, queenstown, tokyo. If yes, the axis is live. If no, phases 0, 4 and 5 are dead and the plan reduces to the spreads.
2. **Is the route recent?** Specifically, does any of it fall in 2025 or 2026? This decides whether the axis reads as current or as a two-year silence (§9.2).
3. **Is a recalled month an acceptable value in a file that ships only EXIF?** This is a standards decision about `outings.ts`, not a design one (§9.5).
4. **Where do `travel`'s five frames go?** Default proposal: `03700`, `03743`, `03816`, `03862` into `nature`, `8251` by what it shows. Your call and it needs your eye.
5. **The orphan.** Declare `events`, or retitle `weddings` to `weddings & events` and fold it in? One photograph either way.
6. **Does `animals` survive with two photographs?** It is a real category in the `practice` group or it is two frames that belong in `nature`. Commercially it only matters if pet portraits are a service you want.
7. **`/log` or `/route`?** `log` carries the ship's log, the data log and `log-c` at once and risks reading as "blog."
8. **How much does the wedding client actually matter?** If she is the commercial priority, R15's two doors beat this plan on that one axis and the whole recommendation should be re-weighted. If the site is mostly a calling card and the work comes from elsewhere, this plan is right and the question is closed.
9. **Do the three featured outings need names, or do dates carry them?** `the wedding`, `the gig`, `the october trip` are names a person would use. They are also three more strings that have to stay true.

---

## 13. Cheap validation

The load-bearing assumption is §2.10.2: **an outing is a more interesting unit to a stranger than a category.**

**Test A, twenty minutes, zero code.** Take the nine frames of `trip-2023-10` (`outings.ts:128-138`). Make two sheets in any image editor.

- **Sheet 1, as today.** Three groups labelled `nature` (4 frames), `travel` (4), `street` (1), each with its current tagline.
- **Sheet 2, as an outing.** All nine in capture order, one heading: `16–22 oct 2023 · six days · 9 frames`, and each frame carrying its time.

Show both to three people who do not know Rouven, one at a time, and ask one question: **"What is this person's work like?"**

- If sheet 2 produces a description of a photographer and sheet 1 produces a description of three folders, the assumption holds and phase 3 is the right first visible move.
- If sheet 1 wins, the categories are doing more work than `outings.ts` gives them credit for, and the plan reduces to R1 plus the bug fix.
- If neither changes the answer, the unit is not the problem, the pictures are, and the honest next document is about which twenty-eight frames these should be.

**Test B, five minutes, zero code, do this first.** Open a notes app and write a month next to each of the ten route stops. If it takes five minutes, the axis is live. If any of them makes you stop and think "I'd be guessing," that stop stays undated and you find out immediately how many holes the axis has.

**Test C, about thirty lines, for the axis.** Render eighteen ticks on the existing `hero-rule` with no labels, no hover, no coupling. Look at it for a day. The question is whether it reads as a ruler somebody has been marking or as a progress bar that broke. If it is the latter, no amount of tick design saves it and phase 5 should be dropped without regret, which costs nothing because phases 1 through 4 stand on their own.

---

## Sources for the cross-domain references

- [The Fifty-three Stations of the Tōkaidō, Wikipedia](https://en.wikipedia.org/wiki/The_Fifty-three_Stations_of_the_T%C5%8Dkaid%C5%8D) and [Hiroshige's Hōeidō Tōkaidō, Artelino](https://www.artelino.com/articles/hiroshige-hoeido-tokaido.asp) — 55 prints for 53 post stations plus Nihonbashi and Sanjō Bridge, 1833 to 1834: a route published as a numbered sequence.
- [Guide to eBird protocols, Cornell Lab](https://support.ebird.org/en/support/solutions/articles/48000950859-guide-to-ebird-protocols) and [Best Practices for Using eBird Data](https://ebird.github.io/ebird-best-practices/ebird.html) — the checklist as the unit of the data: location, start time, duration, distance, protocol, then the sightings derived from it.
- [Robert Frank's *The Americans*, The Metropolitan Museum of Art](https://www.metmuseum.org/press-releases/robert-franks-groundbreaking-photographs-featured-in-major-exhibition-marking-50th-anniversary-of-his-book-ithe-americansi-2009-exhibitions) and [Sotheby's](https://www.sothebys.com/en/articles/the-everlasting-influence-of-robert-franks-the-americans) — roughly 28,000 frames cut to 83, four months on the sequence alone, four movements each announced by a flag, deliberately not in the order travelled.
- [Magnum Contact Sheets](https://www.magnumphotos.com/theory-and-practice/magnum-contact-sheets/) — the grease-pencil mark vocabulary, carried over from `PLAYFUL.md` §R2.
