# CONCEPT-LIVE-DARKROOM.md

One coherent concept distilled from the last 10 Awwwards SOTDs (Jul 17–26, 2026), mapped onto the current state of the rework branch. Companion to PRODUCT.md — this refines, it does not replace.

## The research in one paragraph

All ten winners — Partizan, SALT AND PEPPER/Artem, Spotify Wrapped Party, NORMAL IS BORING, Dragonfly Redux, Lacoste Polo Factory, Lama Lama, Glitch&Grit, IZANAMI, Hiroto Sato — converge on the same discipline: a **strict two-color UI where all chroma is delegated to the content** (photos, video, 3D props, per-project accents), **one committed accent used small** (Dragonfly `#FA4C14`, Artem's `#00FE40` scribbles, NIB's `#DB5C59` dot), a **mono/condensed "data register"** for every label (GT America Mono, Arial Narrow, brackets, crop marks), **live/status elements as personality** (Lama Lama's status pill + live clock ticker, IZANAMI's dual-city clocks, Dragonfly's 5-dot indicator), numbered indices nearly everywhere, and — the real lesson — **one mechanic carried through the whole site** rather than a different trick per page (Dragonfly: everything ASCII; G&G: one borrowed accent per case; NIB: type as container; Hiroto: one toy world bleeding past a Swiss frame).

## Where we already stand

The current build is closer to this bar than PRODUCT.md suggests. Scarlet `#ff2d1a` on neutral `#101013` with photos as the only chroma **is** the winning pattern — direction confirmed, don't touch the tokens. The develop-wipe with the `--ink` hollow-grade coupling is a genuine "one big idea" candidate. The mono data layer already exists in 8 places (rail, slate, log meta, globe labels, frame-pop caption). What's missing is not more ideas — it's that the existing idea isn't **committed everywhere**, and three surfaces (Contact, Privacy, interior-page entrances) fall out of the system entirely.

## The concept: the live darkroom

> The site is not a gallery. It is Rouven's darkroom, still running, and you walked in while the lights were on. Everything the interface says is an instrument readout; everything the interface shows is a print; scarlet is the grease pencil.

Three rules, applied to every surface:

1. **Instrument register.** Every piece of meta-text on the site — indices, dates, counts, coordinates, statuses — is set in ONE register: `--font-mono`, lowercase, bracketed, with the number in accent. `[ 01 ]`, `[ 54 frames ]`, `[ 53.55°n, 9.99°e ]`. No exceptions per page.
2. **Live, not archived.** The darkroom is in use *right now*: a live local clock, a status line, a ticker that says what's currently happening. Static portfolios feel like archives; a running one feels like a person.
3. **Prints carry all the color.** UI stays bone-on-charcoal + scarlet marks. Never introduce a second accent, never tint a section. (Already true — this rule exists so it stays true.)

## The seven moves (ranked by leverage)

### 1. Unify the index register — the cheapest coherence win
Today the same idea ships in four styles: `outline-accent` 4.5rem on Work, solid accent 1rem on Gallery, mono `01 / 12` in Lightbox, nothing on Log rows. Pick ONE spec — mono bracketed accent `[ 01 ]` for meta-scale, `outline-accent` reserved for the display-scale card numbers — and apply it to Log rows too. Lama Lama's `[ core value 01 ]` and G&G's `01–12` metadata bars show why this reads as a system: identical everywhere.

### 2. Deploy the ticker as the live status rail
`Ticker.tsx` is fully built and rendered nowhere — the loudest dead code in the repo. Give it the Lama Lama job: a persistent (or per-page footer-adjacent) rail carrying live data in the instrument register, star separators from `Star.tsx`:
`hamburg, de ✳ 15:47:32 ✳ vol. 02 ✳ currently grading: [outing name] ✳ open for bookings ✳`
This one move ships PRODUCT.md's promised "marquee tickers + ticker stars", uses the star mark, and delivers rule 2 site-wide.

### 3. Give Contact its loud moment: the full drench
Contact is 68 lines with no signature element — and it's the page with the highest intent. The footer already proves the move: accent background, `--accent-ink` text. Make Contact the only *page* that is scarlet-drenched edge to edge (the darkroom safelight moment): giant lowercase mailto in Gilroy on `#ff2d1a`, ticker in ink, live clock. One page, one color event, mirrors the footer so it feels inevitable rather than random. (NIB's drenched sections and the footer-as-destination pattern in Lama Lama both back this.)

### 4. One photo-in-type moment
NORMAL IS BORING's signature: photography clipped *inside* the letterforms. We already own the tech (`--ink` hollow coupling, `.outline` utilities, WebGL planes). Use it exactly once — the `the archive.` big-link on Home or the Gallery `next up` outline title: outline type that fills with the next category's photo on hover/scroll. This extends the existing grade-coupling idea instead of adding a new trick.

### 5. Differentiate interior entrances from one system
Work/About/Contact currently share one generic recipe (masked heading + fade-up) while Home is bespoke — the site's biggest structural inconsistency. Don't invent three new animations; derive each from the develop-wipe family: Work's heading develops (desat→graded sweep), About's portrait drives its own `--ink` moment, Contact rides the drench. Same mechanic, three expressions — the Dragonfly lesson (one engine, every surface).

### 6. Bring Privacy on-system
Lowercase, `display-xl`, entrance gate, one `[ last updated ]` instrument line. Half a day; removes the only page that breaks voice.

### 7. Paper cuts
- Update PRODUCT.md tokens to the real values (`#ff2d1a` / `#101013` / `#98938f`) — it's the stated source of truth and it's wrong.
- Delete dead CSS: `.home-featured*`, `.featured*`, `.hero-line` (~180 lines).
- Decide on Gilroy Light: use it (e.g. the one ultralight contrast word, NIB-style) or stop shipping the face.

## What we deliberately do NOT take

- **ASCII/dither filters, RGB-split glitch** — wrong lane; the photos are the hero, filters would fight them (anti-reference: gimmick over content).
- **Rounded floating panel over full-bleed shader** (Partizan/NIB/Hiroto) — strong pattern, but it would demote the photographs to background. Our version of "world bleeding past the frame" already exists: the globe cut by the viewport.
- **A second typeface or serif display** — anti-reference in PRODUCT.md; the winners with one family (G&G, Hiroto) prove single-family discipline reads as confidence.
- **Section color drenches beyond Contact + footer** — one color event per site visit, not five.

## Sequence

1 → 2 → 3 are the concept (register, liveness, drench): roughly a focused week.
4 → 5 are the craft layer that makes it award-plausible.
6 → 7 are hygiene, do them whenever.
