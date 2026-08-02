# PLAYFUL.md

An exploration of what "playful" should mean for rouvens.work, and which conception the site should commit to.

Written against `PRODUCT.md`, the source in `src/`, and a full set of headless screenshots of the live build. Every claim below points at a file and line or a screenshot filename. This is a plan-idea document, not an implementation plan. Nothing here has been built.

---

## 1. Concept summary

The chosen thread is **the photographer's hand**: the site starts showing its own judgments, in Rouven's voice, in the places it currently leaves empty.

Three layers, in order of cost and in order of build:

1. **Voice.** Every string on the site moves from anonymous museum-label copy to first person with one specific detail. No layout changes at all.
2. **The mark.** The featured rows' huge voids get a marginal layer borrowed from a real photographer's object: the grease-pencil ring, the strike-out, the arrow and the terse note that a photographer puts on a contact sheet. Off-grid, in accent, on a layer of its own so nothing currently welded to the grid moves.
3. **The instrument.** The colourist's grade wipe that already runs on the hero plate (`src/canvas/shaders/imagePlane.ts:115-152`) becomes draggable. Grab the accent hairline, pull it across the frame, log on one side and rec.709 on the other. One behaviour, on one element, on one page.

The argument for this over everything else in section 3: it makes the site personal and playful with the same device, it uses objects and tools that are native to Rouven's actual craft rather than generic web-design play, and it can never hide content, which is the one thing the 2021 site did that `PRODUCT.md` calls a gimmick.

---

## 2. Depth

### 2.1 Reading the brief again

> "it feels good in general, but there is still something wrong for a more personal page. how can we get this more.. playful?"

The subject of that sentence is **"a more personal page."** "Playful" arrives second, after an ellipsis, as the word he reached for to name a fix. That hesitation is the most useful signal in the brief. It's a person feeling an absence and grabbing the nearest available adjective.

So the honest first move is to separate the two axes, because they are genuinely different products:

- **Personal** = a stranger leaves knowing something about *who made this*.
- **Playful** = the artefact behaves with wit, looseness or surprise.

A site can be extremely playful and completely anonymous. Most award-shortlist WebGL portfolios are exactly that. And a site can be extremely personal with zero play (a plain text page with good writing on it).

The current site is at zero on both. It is *poised*. What follows is an argument that the absent thing is **presence**, and that playfulness is the delivery mechanism for it rather than the goal.

### 2.2 Four conceptions of "playful", and which one is actually missing

**Playful as visual style.** Rotation, stickers, off-grid objects, colour as surface. `PRODUCT.md` names "concert poster, sticker sheet" as physical references and nothing on the site behaves like either. There is not a single `rotate()` in `src/styles/site.css` across 1367 lines. Every element is axis-aligned and flush to a 12-column grid (`site.css:697`, `911`, `971`). This conception is cheap, reversible, and it says nothing about Rouven. A tilted `01` tells you the developer knows about `transform`.

**Playful as behaviour.** The site does something unexpected when touched. This is the conception with the most credibility upside, because for a creative developer the site *is* the portfolio item. It's also where the 2021 scar lives.

**Playful as voice.** The writing is human and funny. Cheapest of the four, near-zero technical risk, and by far the strongest at making the site personal. Weak on its own at proving "can build".

**Playful as structure.** The site becomes a toy, a game, an instrument, something you operate rather than read. Biggest upside, biggest risk, and directly adjacent to the anti-reference.

The site is missing all four, but not equally. It is missing **voice** catastrophically and **behaviour** meaningfully. It is missing **style** in a way that is mostly cosmetic, and it should probably stay missing **structure**, for reasons in section 4.

### 2.3 The finding that reframes everything: the author has been compiled out

`src/pages/Home.tsx` and `src/content/hero.ts` contain the best writing on this project.

> "The three words are the process both crafts share, and each one is legible in both: you shoot a frame or a scene, you grade a picture or a build, you ship a film or a site." (`Home.tsx:49-53`)

> "This file is a *video still*, exported off an edit timeline. That is not a detail, it is the concept: the one artefact that belongs to both halves of what Rouven does." (`hero.ts:5-9`)

> "Log is not a look, it is storage… Somebody then writes a look and runs it over every frame of the sequence. Writing a transform and running it over your material is the same job twice, in two crafts, which is the whole idea the site is built on." (`imagePlane.ts:96-105`)

That is a specific, opinionated, slightly obsessive person with a real theory about his own two crafts. **None of it reaches the visitor.** A cold client sees `still 01:43:01` and `log-c → rec.709` (`Home.tsx:208-220`) and has no idea any of that thinking happened.

The site's personality exists. It's in the comments. It gets stripped at build time.

This is why "playful" feels like the right word and isn't. The absence isn't fun. It's authorship.

### 2.4 Jobs the idea does

**Functional.** Let a cold client, in under ten seconds, form a specific impression of a specific person rather than a favourable impression of an anonymous studio. Let a fellow creative find one thing worth screenshotting. Let Rouven ship a site he still likes in eighteen months.

**Emotional.** For the visitor: the small pleasure of catching someone in the act of having taste, rather than being shown the results of it. For Rouven: relief. Right now the site is a very good argument he can't sign.

### 2.5 Load-bearing assumptions

If these are false, the thread collapses.

1. **The felt problem is absence of author, not absence of decoration.** If Rouven adds rotated stickers and the feeling goes away, this whole document is wrong.
2. **Rouven wants to be visible.** Some people say "more personal" and mean "more characterful". He put a portrait of himself at 16:9 on `/about` and wrote a paragraph about a one-person studio, so this looks safe, but it's an assumption.
3. **First-person specificity reads as confidence, not as oversharing, to a wedding client.** This is the riskiest one. A bride booking a photographer and a CTO hiring a contractor want different amounts of personality.
4. **The photographs can survive a louder container.** Interrogated below in 2.7.
5. **He will maintain what he adds.** Any dated or logged content decays into evidence of neglect.

### 2.6 First principles

Start from what a portfolio *is*, not from what portfolios look like.

A portfolio is a **claim of judgment**. The photographs aren't the product. The product is the argument that this person can look at a thousand frames and know which six are worth showing. That's true for the code too: the value in `Home.tsx` isn't the GSAP, it's the decision to align the plate's bottom edge with the byline rule (`Home.tsx:152-154`).

Judgment is invisible when only the outcome is shown. Four beautiful photographs in four identical rectangles is a display of *results*. It's indistinguishable from four beautiful photographs that a client picked, or that an algorithm surfaced, or that came off a stock site.

So the first-principles move: **make the judgment visible instead of only its output.** That is simultaneously the most personal thing a portfolio can do (judgment is the most individual thing a person has) and the most credible (it's the actual skill being sold), and it happens to be inherently playful, because a visible judgment invites disagreement, and disagreement is play.

Second first principle: **the container should have the same dynamic range as the contents.** A system that gives a saturated green stage flare and a quiet valley the same rectangle at the same grid position has flattened both.

### 2.7 Is the photography the ceiling?

The hypothesis in the brief was that the work is calm, wide, natural-light landscape and travel, and that this ceilings how loud the container can get. Looking at the screenshots, that's about half right and the wrong half matters.

`home-05-y1815.jpg` and `work-03-y1233.jpg` show the concerts cover: an acid-green stage wash, blown highlights, a guitarist mid-kick. That frame is louder than `#ff4d00`. It's the loudest object on the entire site. `work-03-y1233.jpg` also has the street frame, a cold blue Vienna dusk full of tram wires. Against those, `home-08-y2904.jpg` (Cabo da Roca at golden hour) and `home-03-y1089.jpg` (a peak in cloud) are genuinely calm.

So the archive has range. The *system* doesn't. `site.css:733-736` gives all four featured images `aspect-ratio: 5 / 6` with the comment "one ratio for all four prints", and `Home.tsx:296` alternates them left and right. That reasoning is correct for what it was solving. Its side effect is that the loudest picture Rouven owns is served in the same box as the quietest, at the same size, at the same rhythm.

The photographs are not the ceiling. The uniform crop is.

### 2.8 Where playful costs credibility, and where it's the only thing that buys it

**Where it costs.** Anything that delays the photographs. Anything a visitor has to figure out. Anything that reads as a technique demo. A wedding client does not care that the scroll is Lenis-smoothed; a wedding client cares whether the pictures look like her day. For that audience every second of interaction budget spent on the container is a second not spent on the work.

**Where it's the only thing that buys it.** For the dev-client and fellow-creative audiences, the container *is* the work sample. Photos prove the photographer. Only behaviour proves the developer. Right now the strongest engineering on the site (the split-screen grade wipe, `imagePlane.ts:96-152`) plays itself once, in the first two seconds, before the visitor's attention has arrived, and can never be seen again without a hard refresh. The single most impressive thing Rouven built is functionally invisible.

The resolution isn't to split the difference. It's that **playfulness must be made of the same material as the work.** A colourist's wipe is craft. A bouncing sticker is decoration. Both are "playful". Only one of them is also evidence.

### 2.9 The 2021 scar: how is this not that again?

`PRODUCT.md` anti-reference 1: *"The old 2021 site's '3D camera model you must click to find the work' (gimmick over content)."*

The precise failure there was **gating**. The work was behind an interaction. A visitor who didn't play didn't see the portfolio.

That gives a clean, testable rule that any proposal in this document has to pass:

> **The gating test.** If a visitor never interacts with the mechanic, do they lose any content?

The grade drag passes: the hero already plays the wipe on load, exactly as it does today. Drag is something you find afterwards, and both states are a finished photograph at every instant, which the shader comment already argues at `imagePlane.ts:110-114`. Nothing is hidden, ever.

A hidden-easter-egg system fails. A "click the camera to reveal" system fails. A puzzle fails.

### 2.10 Second-order implications

- **Maintenance becomes a design surface.** The moment the site carries dated or first-person-current content, staleness becomes a visible flaw. A `/now` page last updated fourteen months ago is worse than no `/now` page. Any thread that adds content-with-a-clock is adding a recurring obligation.
- **Copy becomes load-bearing, so copy becomes a blocker.** Right now Rouven can ship a new category by adding six lines to `categories.ts`. If every category needs a genuine sentence about a genuine moment, publishing gets slower. That's a real cost and probably a good one.
- **Visible judgment invites judgment.** Saying "this one, not that one" exposes taste to disagreement. That's the point, and it's also the thing that makes it scary to ship.
- **The site starts to have a version identity.** `vol. 02` already appears in the hero rail (`Home.tsx:166`). Once the site has a voice, `vol. 03` becomes a thing people might want to see.
- **He'll want to reuse it.** arlou (`About.tsx:61`) is a studio that builds "portfolio pages". Anything genuinely good here becomes a house style, which raises the bar on it not being kitsch.

### 2.11 Failure modes, including the quiet ones

**Tone drift into LinkedIn.** Already present in seed form: *"I love telling stories through my lens and documenting my life nowadays"* (`About.tsx:70-71`). That's one degree from "passionate about visual storytelling". First person is not automatically personal. First person plus abstraction is worse than third person plus precision.

**Quirk-as-brand cringe.** The Notion-personality-page register: coffee counts, "chaotic good", a list of favourite snacks. Instantly dates, instantly reads as borrowed.

**Kitsch.** Literal handwriting fonts, paper textures, tape graphics, torn-edge PNGs. `PRODUCT.md` says "handmade", which is a trap word. Handmade as *evidence of a hand having made a decision* is the good reading. Handmade as *skeuomorphic craft-fair texture* is the bad one, and it's the default one.

**Novelty decay.** A joke read once is charming. The home page above the fold is read hundreds of times, mostly by Rouven, then by returning clients. Anything witty and fixed at the top of the page becomes embarrassing faster than anything else on the site.

**The clever-developer trap.** Micro-interactions read as *engineering-flavoured*, not *person-flavoured*. A cold visitor cannot tell a hard interaction from an easy one, and doesn't try. Interactions buy credibility with other developers only. That's one of three audiences.

**Incentive leak: the container competing with the content.** `PRODUCT.md` principle 1 says the photos are the hero. Every gram of personality added to the frame is a gram of attention taken from the picture. This is a real budget with a real ceiling.

**Ten quiet moments instead of one loud one.** `PRODUCT.md` principle 2. The failure shape here is adding a small witty thing to every surface until the site is uniformly quirky, which is the same disease as uniformly poised.

**Backfire on the primary audience.** The most personal version of this site is the worst version for a corporate dev-client procurement page. That's probably an acceptable trade, but it should be a decision, not an accident.

### 2.12 Constitution tests

Each one is a concrete pass/fail question, not a principle.

| # | Test | Question |
|---|---|---|
| T1 | **Gating** | If a visitor never interacts, do they lose content? Must be no. (Anti-ref 1) |
| T2 | **Three seconds** | Can a cold client name what this person does and see a photograph within three seconds of load? (Users) |
| T3 | **One loud moment** | Does each surface still have exactly one loud moment? (Principle 2) |
| T4 | **On, not beside** | Is the effect happening on the images or next to them? (Principle 1) |
| T5 | **DOM** | Is every readable word in DOM and selectable? (Principle 3) |
| T6 | **Three objects** | Does the result read as a darkroom print, a concert poster or a sticker sheet? If it reads as none of the three, it's off-brand. (Brand voice) |
| T7 | **Lowercase** | Does it hold the lowercase rule, and if it can't, is that a decision? (Brand voice; currently violated at `About.tsx:51` and `Contact.tsx`, see 8.4) |
| T8 | **Not-generic-dark** | Would this survive being described without naming the site, without sounding like every dark portfolio? (Anti-ref 2) |
| T9 | **Stranger** | Does a stranger leave able to say one true, specific thing about Rouven? (Proposed, not in PRODUCT.md) |
| T10 | **Eighteen months** | Will this still be true and un-embarrassing with no maintenance? (Proposed) |

---

## 3. Range

Thirteen distinct positions in the space. Cross-domain analogies, inversions and combinations are labelled.

### R1. The marginalia baseline (the six tactical moves)

Rotate the index numbers off-grid, rewrite taglines to first person, drench one mid-scroll row in `#ff4d00`, make the cursor chunkier and context-aware, snap the number animation instead of easing it, put something in the voids. This is the conservative point in the space: everything is a property change on an existing element, nothing is new content, and the whole thing is reversible in an afternoon. Its ceiling is that it makes the site look looser without making it belong to anyone.

### R2. The contact sheet (cross-domain: photography's own object)

*Magnum Contact Sheets* (Lubben, 2011) reproduces 139 sheets from 69 photographers, and the thing that makes the book electric is not the frames, it's the marks. Grease-pencil and chinagraph annotations in different colours, a private vocabulary unique to each photographer, so that the physical trace of the hand is felt on the sheet. Cartier-Bresson ringed two frames on a Seville sheet in white chinagraph and one of them became one of the most reproduced photographs of the century. Applied here: the work index becomes a sheet of the frames Rouven shot, most of them struck through, one ringed in accent, with a two-word note. The mechanic being borrowed is precise: the mark vocabulary (ring, strike, arrow, terse note), not the thumbnail grid.

### R3. Field notes in the void (voice-only, zero visual change)

Each featured row's empty 40 per cent gets one sentence in Rouven's actual voice about that specific shoot, set in the same monospaced register as the hero slate. Not a caption describing the picture. A note about the making of it: what the weather did, what went wrong, who was annoyed. Nothing in the layout moves, nothing rotates, no new colour. The claim is that the site's entire problem is that it was written by a museum and not by a person.

### R4. The reject (inversion: show what you threw away)

Next to each kept frame, the frame from the same roll that didn't make it, at half size, and one line on why. Museum curation calls this the "curator's choice" move: the interesting content is the reasoning, not the object. Extremely personal, extremely revealing of judgment, and it deliberately puts weaker photographs on a portfolio, which is the whole risk.

### R5. /now and the log (cross-domain: personal-web convention)

Derek Sivers started the `/now` page convention in October 2015: one page saying what you're focused on right now, what you'd tell a friend you hadn't seen in a year, dated. Thousands of personal sites carry one. Adding `/now` to rouvens.work costs one route and one markdown file and instantly makes the site a person's site rather than a studio's. It also creates a permanent obligation, and a stale `/now` is a stronger negative signal than no `/now`.

### R6. The instrument (structural, materially bolder)

The site becomes something you operate. The grade wipe in `imagePlane.ts:115-152` is already a real colourist's tool rendered in a real shader: it just plays itself once and dies. Expose it. The accent hairline becomes a handle you can grab and drag across the hero plate, log on the right, rec.709 on the left, the same visual language a colourist uses to check a look. Nothing is hidden and nothing is gated; you're handed the transform the site is *about* and allowed to run it yourself.

### R7. The sticker sheet, literally (toy)

`Star.tsx` and the index numbers become a physical set of stickers the visitor can drag around the page, persisting in `localStorage`, with the site remembering your arrangement between visits. Toy-logic: give people a small set of objects and a surface, don't tell them what for. The failure mode is severe: it puts the visitor's mess on top of Rouven's photographs, which inverts `PRODUCT.md` principle 1, and it reads as 2019 Gumroad within a year.

### R8. One knob (inversion of R6: one control, everywhere, instead of one control, once)

A single global control in the header pill that changes the entire site's look: a grain slider, or a log/graded toggle, or a "print" mode that flips the whole thing to warm paper. One gesture, global consequence, discoverable in the one place everybody looks. The inversion is instructive: R6 gives you deep control of one object, R8 gives you shallow control of everything. R8 also hands a stranger the ability to make the photographs look bad.

### R9. Voice-only maximalism (the pure writing argument)

Change zero pixels. Rewrite every string in the repository. Taglines (`categories.ts:44,58,71,82,98,113`), the work subtitle "six ways of looking, 28 frames", the hero rail, the loading screen, the 404, the footer's job-title list "web developer · mobile developer · photographer" (`Footer.tsx:16`), the alt text, the button labels, the aria-labels. Every one of them becomes first person and carries one concrete detail. The strong version of this position is that the site is already visually excellent and that all of the missing personality is a copy problem, and that any visual change is procrastination.

### R10. The premise questioner: it's not playfulness, it's authorship

Argue the brief has the wrong word. The site doesn't feel unplayful, it feels **unauthored**. Everything on it is true and nothing on it is *claimed* by anybody. The hero says "photography / development" (`Home.tsx:163`), the taglines are wall labels ("loud rooms, low light", "the day, as it happened"), the work page says "six ways of looking, 28 frames", and the first "I" on the home page appears at roughly 90 per cent scroll depth in the about teaser (`Home.tsx:357`). By then the visitor has already decided. Under this reading, adding play to an unauthored site produces a *quirky* unauthored site, which is worse.

### R11. The life list (cross-domain: field naturalist practice)

Birders keep a life list: every species, first sighting, date, place, conditions, in one running dated index maintained for decades. The portfolio becomes that. Every frame gets a row, chronological, terse, with conditions, and the galleries become views onto the list. It reframes the work from "selected highlights" to "an ongoing practice", which is genuinely how a photographer relates to their own archive. It requires date and location data that does not currently exist (see 6.5) and it turns a portfolio into a database.

### R12. The second pass (cross-domain: letterpress, and an argument for a specific kind of rotation)

Hatch Show Print has been setting concert posters from wood type since 1879, and every additional colour requires a second physical pass of the paper through the press. That's where the aesthetic comes from: overlaps, near-misses and a second ink sitting slightly off from the first are consequences of the process, not decoration. Applied literally: one element per surface gets a deliberate second pass, an accent duplicate offset three or four pixels and a degree or two off-square. It's the honest derivation of "rotation", and it produces something that reads as a printed object rather than as a CSS transform.

### R13. Do less (inversion)

Cut the site to one scrolling page with eight photographs at full bleed, no categories, no index numbers, no featured rows, three sentences total. The claim is that the site feels stiff because it's over-composed, and that looseness comes from having less to hold in place. It's the only proposal here that would make the site faster and shorter, and it throws away the best design reasoning in the codebase.

### R14. Combination: the marked sheet (R2 + R3)

The contact sheet's mark vocabulary carries the field note. The ring, the strike and the arrow are the visual play; the sentence they point at is the voice. One device delivers both axes: the mark is playful and the note is personal, and they need each other, because a mark with nothing to say is decoration and a sentence with nothing pointing at it is a caption.

### R15. Combination: the marked sheet plus the instrument (R14 + R6)

Add exactly one operable object to the site, on the hero, made of the site's own shader. The marks handle personality across the scroll; the drag handles the "can build" claim in the first three seconds, for the audience that can read it. Two different mechanisms serving two different audiences with no overlap and no competition, because they live on different surfaces.

---

## 4. Convergence

**Selected: R15, built as R9 → R14 → R6.**

Voice first, marks second, the instrument third. Here's why it beats each thing I'm setting aside.

**Over R1 (the six tactical moves).** R1 is the right instinct executed at the wrong layer. Rotating an index number is a property change with no referent: it's loose because looseness was requested. The same rotation applied to a chinagraph ring is loose *because that's what a hand-drawn ring looks like*, and it carries information. Same visual delta, completely different meaning. R1 also fails T9 outright, because none of its six moves leaves a stranger able to say a true thing about Rouven.

**Over R9 (voice only).** I'm keeping R9 almost entirely, as phase one, because it's right about the diagnosis. I'm rejecting it as the whole answer for one reason: a creative developer whose portfolio answers "make this more playful" by changing only its words has not answered the question. The container is the work sample for a third of the audience, and R9 leaves the container untouched.

**Over R2 as a page (the full contact sheet).** Turning `/work` into an actual sheet of 28 thumbnails is a worse first impression than four large prints, and it inverts principle 1 by shrinking the photographs to make room for a concept. I'm taking the mark vocabulary and leaving the sheet.

**Over R4 (the reject).** This is the most tempting rejected item and the closest call in the document. It's the purest expression of visible judgment and it would be genuinely thrilling to a fellow photographer. It fails on audience: a wedding client scrolling past a deliberately worse photograph does not read sophistication, she reads a worse photograph. The idea survives in weakened form inside R14, where the strike-through mark implies the rejected frames without showing them.

**Over R5 (/now).** Fails T10. A `/now` page is only personal while it's current, and its decay curve is steep and public. Revisit when the site has an established update rhythm, which it doesn't yet.

**Over R7 (draggable stickers).** Fails T4 and principle 1: it puts visitor-generated clutter over the photographs. Fails T10 badly. Highest kitsch risk in the document.

**Over R8 (one global knob).** Hands a stranger control of how the photographs look, which is the one thing a photographer must never delegate. Also fails T2, because a header control is invisible to the visitor who is looking at the hero.

**Over R11 (life list).** Needs data that doesn't exist (`categories.ts:1-9` carries `src`, `width`, `height`, `focus`, and nothing else), and it converts a portfolio into an archive, which serves the wrong job.

**Over R13 (do less).** The composition reasoning in `Home.tsx:140-154`, `Home.tsx:249-253` and `site.css:691-693` is hard-won and correct. It was written to fix an actual felt problem ("scattered"). Throwing it away to buy looseness would reintroduce the exact disease it cured.

**Over R12 (letterpress second pass) as a standalone.** It's a better justification for rotation than R1's, and I'm folding its *derivation logic* into the mark layer, but on its own it's still style with no content behind it.

**Over R10 as a rejection.** R10 questions the premise and it's right, which is why it isn't a rejected variant. It's the frame the recommendation sits inside. The word is wrong; the feeling is real; the fix is authorship delivered playfully.

### Why the phasing is part of the recommendation

Phase one is pure copy and can ship in a weekend with no risk. If phase one alone fixes the feeling, phases two and three become optional, and that's a good outcome rather than a failed plan. If phase one doesn't fix it, the diagnosis in 2.3 is wrong and phases two and three should be re-examined before being built. The sequence is also the cheap validation, which is section 12.

---

## 5. The experience

A wedding photographer's client, cold, on a laptop, from an Instagram link.

**0.0s.** Loader lifts. The valley plate arrives in log, flat and green, and the accent hairline sweeps left to right grading it as it goes. `shoot. grade. ship.` rises. Exactly as today. Nothing has changed and nothing needed to.

**2.2s.** The wipe finishes at the right edge. Instead of vanishing, the hairline parks against the right edge of the frame with a small accent handle on it, and the word under the plate reads `log-c ← drag → rec.709` (`Home.tsx:213-219` already has the arrow; it becomes bidirectional and gains a hint). She doesn't drag. Nothing is lost. She scrolls.

**Alternative 2.2s.** He is a CTO, not a bride. He notices the handle, grabs it, and pulls it back across the frame. The valley goes flat and green under his cursor. He pulls it back to the right and it grades again. He does this four times, at speed, because it feels good, then reads `log-c → rec.709` and understands what he just did. That is the entire "this person can build" argument, delivered in six seconds, using a real tool from the other craft. He scrolls.

**Ticker.** Unchanged.

**First featured row, `01 nature`.** The plate arrives on the left. On the right, where there is currently 40 per cent of a viewport of empty charcoal (`home-03-y1089.jpg`), the caption block sits at the bottom as it does now, and above it, in the void, an accent ring is drawn around nothing in particular, a degree and a half off-square, with a short rule running from it back toward the print's top corner. Under the ring, in the monospaced slate register:

> `kept 1 of 40. i sat in that cloud for two hours and it opened for about nine seconds.`

The tagline underneath is gone. "mountains, coasts and quiet places" was doing nothing that the photograph wasn't already doing better.

**Second row, `02 concerts`.** Mirrored. The acid-green frame sits right, the void sits left, and the mark in the void is a strike-through: three short accent strokes stacked like crossed-out frames, then:

> `shot at 1/60 because the room had no light and i had no fast lens yet. i'd do it again.`

She has now met somebody. Two sentences in, she knows he sits in the cold, he shoots weddings and metal shows with the same hands, and he's honest about gear.

**Third and fourth rows.** Same device, different mark, different note. The vocabulary stays small: ring, strike, arrow, star. Four rows, four marks, no repeats.

**`all work.`** Unchanged.

**About teaser.** The first-person sentence that currently arrives here (`Home.tsx:357`) is no longer the first time she meets him. It now confirms something instead of introducing it.

**Footer.** The orange wall. Unchanged, and now it's the fifth accent event of the scroll rather than the first, so it lands as an arrival rather than a shock.

**`/work`.** Subtitle changes from "six ways of looking, 28 frames" to something she'd believe a person wrote.

**`/about`.** The four paragraphs get rewritten with specifics. "building all kinds of different apps and products" (`About.tsx:53-55`) becomes something with a noun in it.

She emails him. In the email she mentions the nine seconds.

---

## 6. Candidate mechanics

Every mechanic traced to what the codebase actually has. Dependencies flagged.

### 6.1 First-person string rewrite
**Data it needs:** the strings already in `src/content/categories.ts:44,58,71,82,98,113`, `src/pages/Work.tsx`, `Footer.tsx:16`, `About.tsx:51-71`, `Contact.tsx`, `hero.ts:36-37`.
**Dependency:** none technically. Rouven has to write them. That's the actual constraint.

### 6.2 The note field
**Data it needs:** a new `note?: string` on `Category` (`categories.ts:11-18`), one sentence per category.
**Dependency:** six sentences that Rouven has to write and mean. This is the whole risk of phase two.

### 6.3 The mark layer in the void
**Data it needs:** nothing new. The void is a real, addressable grid region. `.featured-media` holds `1 / 7` and `.featured-text` holds `8 / 13` (`site.css:704-728`), and `.featured-text` is bottom-aligned via `align-items: end` on the parent (`site.css:699`), so the top of columns 8 through 12 is genuinely unoccupied.
**Dependency:** the mark artwork. Should be inline SVG so it stays crisp and colourable, not raster. Four marks, drawn once.
**Critical constraint:** the mark is a new absolutely-positioned layer. Nothing currently on the grid may move to accommodate it. See 8.1.

### 6.4 The draggable grade
**Data it needs:** all of it already exists. `uDevelop` is a live uniform (`imagePlane.ts:21`), the wipe head is computed from it at `imagePlane.ts:120`, the hairline and bloom at `147-151`, and `WebGLImage` already takes a `develop` prop and fires `onDevelopStart` (`Home.tsx:188-196`).
**What's new:** a pointer handler on `.hero-frame` mapping normalised x to `uDevelop`, plus a rule that the first user grab cancels the auto-tween and the `--ink` tween in `Home.tsx:69-84` doesn't re-fire. Touch should fall back to no-op rather than fighting the scroll.
**Dependency:** none.

### 6.5 Anything with a date or a place
**Data it needs:** capture date, location, and ideally the count of frames shot.
**Status: hard dependency, does not exist.** `Photo` is `{ src, width, height, focus? }` (`categories.ts:1-9`). There is no EXIF pipeline. `heroSlate.location` is deliberately empty with a comment explaining that a wrong place name must never ship (`hero.ts:51-53`), which shows the standard Rouven holds himself to here.
**Consequence:** the "kept 1 of 40" phrasing in section 5 is a claim, and Rouven has to actually know the number or not write it. Everything in R11 (life list) is blocked on this.

### 6.6 Context-aware cursor labels
**Data it needs:** nothing. `Cursor.tsx:26` already resolves `closest('[data-cursor="view"]')`. Extending to `data-cursor="drag"` on the hero frame is a one-line change plus one CSS rule (`site.css:139-147`).
**Dependency:** none. Cheap, and it's how the drag becomes discoverable without a written instruction.

### 6.7 Breaking the uniform crop
**Data it needs:** nothing new. `site.css:733-736` hardcodes `aspect-ratio: 5 / 6` for all four featured images.
**Note:** this is listed as a mechanic because 2.7 argues the uniform crop is what flattens the archive's dynamic range. It is *not* part of the recommended thread, because changing it directly attacks the reasoning at `site.css:730-732` and `site.css:691-693`. It belongs in open questions, not in the plan.

**Tried, measured, reverted (2026-07-25).** A per-category `ratio` was built and given to `concerts` at `3 / 4`. Measured in a real engine at 1440×900: the concert print came out **526.5 × 702** against **585 × 702** for its neighbours. It got *narrower*, not taller.

The cause is that `max-height: 78svh` — not `aspect-ratio` — is the binding constraint at ordinary viewport heights. At a 900px viewport the cap is 702px and every print is already pinned to it, so a taller ratio cannot buy height; the box preserves the ratio by giving up width. The print then stops filling its grid column, and `.featured-num`, which is positioned against the print's own edge (`site.css:747-756`), detaches from it. That is precisely the "02 and 04 adrift in empty space beside their pictures" failure that `Home.tsx:305-307` records having fixed.

**Consequence for anyone picking this up:** giving one frame more wall is a `max-height` decision, not an `aspect-ratio` one. Showing the concerts cover uncropped at its native 3/4 while still filling its column needs roughly 86svh at 1440×900, i.e. ~78px more than the others, which spends fold budget the 78svh cap was presumably chosen to protect. That is a judgment about the scroll rhythm of the whole featured section and it needs Rouven's eye, not a measurement.

---

## 7. Constraint / constitution audit

| Principle (source) | How the thread honours it | Tension |
|---|---|---|
| **Site is the proof of craft, both disciplines in one artefact** (`PRODUCT.md` What this is) | The drag makes the colourist's transform operable, so the site performs the merge instead of asserting it in a comment | None |
| **Cold clients judge in seconds; one job: taste + can build** (Users) | Voice layer does taste, drag does build, both inside the first screen and a half | The notes add reading time before the second photograph |
| **Confident, playful, handmade** (Brand voice) | The mark is handmade in the true sense: evidence of a hand having decided something | "Handmade" invites kitsch. Hard rule needed: no handwriting fonts, no paper texture, no tape |
| **Lowercase everything** (Brand voice) | Notes and rewritten strings set lowercase | Already violated on `/about` and `/contact`. First-person lowercase ("i sat in that cloud") is a real stylistic commitment, see 8.4 |
| **darkroom print / concert poster / sticker sheet** (Brand voice) | The contact sheet is the missing fourth object and it's the parent of the other three. Marks give the poster its marginalia and the sticker sheet its loose objects | None. This is the strongest fit in the audit |
| **Committed accent, chunky micro-interactions** (Aesthetic lane) | Accent becomes a mark-making colour across the scroll, not only punctuation. The drag is chunky by construction: it tracks the pointer 1:1 with no easing | The mark layer adds four small accent events, which risks "ten quiet moments". Cap at one mark per row, non-negotiable |
| **NOT minimal-gallery-white, NOT editorial-serif** (Aesthetic lane) | Unaffected | None |
| **Anti-ref: gimmick over content** (Anti-references) | Drag gates nothing; the wipe still autoplays. Marks gate nothing; the notes are plain DOM text | See 8.2 |
| **Anti-ref: generic AI dark portfolio** (Anti-references) | The marks and notes are the least generatable part of the site | None |
| **1. Photos are the hero; 3D serves them** (Strategic) | The drag runs on the photograph. The marks sit in space no photograph occupies | The mark is *beside* an image, not on it. Partial tension with "effects on the images, not beside them" |
| **2. One loud moment per surface** (Strategic) | Hero: the drag. Featured: the mark. Footer: the drench | See 8.3 |
| **3. Readable text in DOM** (Strategic) | Notes are `<p>`. Marks are decorative SVG with `aria-hidden`. Rewritten strings stay in `categories.ts` | None |

---

## 8. Constraint-risk flags

Stated plainly, without resolving them by softening the constraint.

### 8.1 The mark contradicts the codebase's own hardest-won lesson

`Home.tsx:249-253` and `site.css:691-693` document a real fix: images used to translate ±90px against a grid the captions were aligned to, "so nothing ever agreed with anything for more than a frame", and half the scattered feeling was motion rather than layout. The response was to weld everything to the grid and move depth into the shader.

An off-grid, rotated mark is the reintroduction of exactly the thing that was removed.

The only defence is a strict separation: **the mark is a new layer that nothing else is aligned to, and no element that is currently on the grid may leave it.** If that rule slips even slightly, the site regresses to the state Rouven already fixed once. This is the single highest risk in the document and it should be the first thing checked in any build.

### 8.2 The drag is a behaviour a cold visitor will never find

Discoverability sits between "invisible" and "instructional", and both ends are failures. Written instructions on a hero are a design smell. No affordance at all means the work went into something nobody experiences. The cursor label (6.6) is the mitigation, and it only fires on desktop fine pointers (`Cursor.tsx:14`), so mobile gets nothing. Accept that this feature exists for one audience on one device class, or don't build it.

### 8.3 The home page will have two loud moments

Principle 2 says one loud moment per surface. The hero and the featured section are arguably two surfaces, which is the defence, but scrolled as one continuous page a visitor encounters the drag, then four marks, then the orange wall. Whether that reads as rhythm or as noise is not knowable from a document. It's the thing to look at in the first screenshot after building.

### 8.4 First-person lowercase is an unresolved conflict, and it's already broken

`PRODUCT.md` says lowercase everything. `About.tsx:51` says "I'm Rouven and I love filmmaking as much as I love coding." `Contact.tsx` says "Write me a message, I'd love to hear from you." The only first-person voice on the site is also the only place the type system breaks. That's not a coincidence: nobody has decided whether Rouven's "i" is lowercase.

Both options cost something. `i sat in that cloud for two hours` is a commitment that reads as either confident or affected depending on the reader. Sentence case keeps the system broken in exactly the place the personality lives. This needs a decision before any copy is written, because it sets the register of every sentence in phase one.

### 8.5 Removing the taglines removes SEO and a11y text

The mechanic in section 5 replaces `category.tagline` with a note. Taglines currently appear on `/work`, on the featured rows and in the gallery header (`Gallery.tsx:67`). Removing them removes indexable descriptive text. The note has to be at least as descriptive, or the tagline has to survive somewhere it doesn't compete.

### 8.6 The notes create a publishing dependency on Rouven's memory

Six sentences that have to be true. `hero.ts:51-53` shows the standard: rather than guess a valley's name, the field ships empty. Applied consistently, a category Rouven can't remember a true story about doesn't get a note, and then the mark layer is inconsistent across rows, which reads as a bug rather than as restraint.

### 8.7 Kitsch has no automated test

Nothing in the audit catches "this now looks like an Etsy shop". The only defence is a written rule list (no handwriting fonts, no paper, no tape, no torn edges, marks are geometric and drawn in the accent at hairline weight) and a willingness to delete the layer.

---

## 9. What to explicitly NOT build

- **A hidden easter egg, a konami code, or anything findable.** Fails T1 and it is precisely the 2021 camera in a new costume.
- **A cursor trail, a WebGL fluid, or a distortion field.** Generic, unrelated to either craft, fails T8, and it competes with the photographs for the eye.
- **Playful 404 art, a joke loading screen, a fake terminal.** These are where portfolios put personality when they haven't got any in the main flow. Fixing the main flow makes them unnecessary.
- **A visitor-facing theme switcher or grain slider (R8).** A photographer does not hand a stranger the grade.
- **A `/now` page, for now (R5).** Revisit once there's a publishing rhythm to attach it to.
- **A "fun facts" or "random things about me" block.** The single highest-cringe artefact available. Specificity inside real sentences beats a list of quirks every time.
- **Literal handwriting.** The mark is drawn geometry in the accent colour. The moment it becomes a script font it is a craft-fair sign.
- **The reject frames as visible photographs (R4).** Implied by the strike-through mark, never shown.
- **More than four marks on the home page.** One per featured row, hard cap. Not on `/work`, not in the galleries, not in the footer.
- **Making `/about` longer.** The problem with `/about` is that four paragraphs say nothing specific, not that there are only four.

---

## 10. Phase fit / sequencing sketch

The site is at `vol. 02` (`Home.tsx:166`), post-rebuild, pre-launch-polish. The layout system is done and it's good. This is the layer that goes on top of a finished system, which is the correct time for it: marginalia only works when there's a margin, and the margin only exists because the composition was solved first.

**Phase 0. Decide the voice register.** (8.4) One hour. Lowercase-i or sentence case, and a one-line description of the voice, written down, before any copy exists.

**Phase 1. Voice.** Rewrite every string. `categories.ts`, `Work.tsx`, `About.tsx`, `Contact.tsx`, `Footer.tsx:16`, `hero.ts:36-37`, alt text, aria-labels, 404. No layout change, no new components, no risk. Ship it and live with it for a week. This is also the validation in section 12.

**Phase 2a. The cursor label and the drag.** (6.4, 6.6) Small, self-contained, uses only existing uniforms, and it's the highest ratio of impressiveness to code in the whole document. It can ship independently of the marks.

**Phase 2b. One mark, one row.** Build the mark layer on `01 nature` only. Screenshot it at 1440 and at 390. If 8.1 has been violated, it will be obvious immediately, and only one row is thrown away.

**Phase 3. The remaining three marks**, and only if 2b survived a week of Rouven looking at it.

**Deferred indefinitely.** Breaking the uniform crop (6.7), `/now`, the changelog page, anything needing capture dates (6.5).

---

## 11. Open questions

1. **Does Rouven want to be visible, or does he want the site to have character?** These lead to different documents. If it's the latter, R12 and R1 rise and the voice layer shrinks.
2. **Lowercase i.** (8.4) Blocks phase 1.
3. **Is there recoverable capture data?** If the original files still carry EXIF, R11 and a whole family of slate-based mechanics reopen, and the hero slate's empty `location` gets filled. If not, a lot of possible surface is permanently closed.
4. **Where does the mark live on mobile?** The void is a desktop artefact. The block around `site.css:1213-1248` collapses the featured row to one column, and at that point there is no margin to put marginalia in. Either the mark is desktop-only (acceptable, it's a poster device) or it needs a different form at narrow widths.
5. **Is the concerts frame representative or an outlier?** If the archive genuinely has more loud work, 6.7 gets much more important and might outrank the mark layer entirely. Now also blocked on a second question the measurement in 6.7 surfaced: **is one featured print allowed to be taller than the others**, i.e. to exceed the 78svh fold budget? Without a yes to that, per-print ratios cannot work at all.
6. **How many audiences is this site actually for?** The recommendation quietly optimises for photo clients and fellow creatives. If dev clients are the commercial priority, the honest answer might be that the personality belongs on arlou.dev and rouvens.work should stay poised.
7. **Does anything here survive Rouven's own six-month taste?** He rebuilt the whole site once already. The marks are the most fashion-exposed element proposed.

---

## 12. Cheap validation

The load-bearing assumption is 2.5.1: **the felt problem is absence of author, not absence of decoration.**

**Test, cost about twenty minutes, zero code.**

Take `home-03-y1089.jpg`. Make two edited copies in any image editor.

- **Copy A (voice).** Replace "mountains, coasts and quiet places" with a real first-person sentence about that shoot. Change nothing else.
- **Copy B (style).** Keep the tagline. Rotate the `01` four degrees, add a ring mark in the void. Change no words.

Show both, plus the untouched original, to three people who don't know Rouven, one at a time. Ask exactly one question: **"What is the person who made this like?"**

- If A produces a description of a person and B produces a description of a website, the diagnosis holds and phase 1 is the right first move.
- If B produces more reaction than A, the brief meant what it said, R1 and R12 become the thread, and this document's convergence is wrong.
- If neither changes the answer, the problem is structural and R6 or R13 deserve a second look.

**Second test, cost about thirty lines, for the drag.** Wire `uDevelop` to pointer x on the hero with no styling, no handle, no cursor label. Use it for ten minutes. The question is whether it feels like an instrument or like a loading bar that broke. If it's the latter, no amount of affordance design will save it, and phase 2a should be dropped without regret.

---

## Sources for the cross-domain references

- [Magnum Contact Sheets, Magnum Photos](https://www.magnumphotos.com/theory-and-practice/magnum-contact-sheets/) and [Eye Magazine review](https://www.eyemagazine.com/review/article/one-image-many-photos) — the grease-pencil and chinagraph mark vocabulary, and the point that the marks are unique per photographer.
- [Hatch Show Print, What is Letterpress?](https://hatchshowprint.com/learn/what-is-letterpress) — multi-pass colour printing as the source of the poster aesthetic.
- [Derek Sivers, How and why to make a /now page](https://sive.rs/now2) and [nownownow.com](https://nownownow.com/about) — the /now convention, started October 2015.
- [Mmuseumm](https://en.wikipedia.org/wiki/Mmuseumm) and [Fortune longform](https://fortune.com/longform/mmuseumm-best-museums-in-new-york) — "object journalism", where the label copy carries the curatorial voice and the object is the evidence.
