# PLAN-LIVE-DARKROOM.md

Implementation plan for CONCEPT-LIVE-DARKROOM.md. Three sequential lanes (all touch `site.css`). Design decisions are locked here so the lanes don't re-litigate them.

## Locked design decisions

- **Instrument register spec:** `[ 01 ]` — `--font-mono`, brackets + slash in `--text-muted`, digits in `--accent`, lowercase context. One shared component `src/components/Index.tsx`. Display-scale `outline-accent` numbers (Work cards) are a *separate, reserved* register and stay as they are.
- **Status rail placement:** inside the footer drench, top edge — the existing `Ticker` in an ink-on-accent variant. One variant, present on every page, and the footer becomes the site's "status" home. Items (nothing invented): `rouvens.work` · live clock in Europe/Berlin (`hh:mm:ss germany`) · `vol. 02` · `{n} frames in the archive` (computed from categories) · `open for bookings`.
- **Contact drench:** full-page `--accent` background, all text `--accent-ink`. Content unchanged; mailto promoted to `display-lg`. Body class `drench` while mounted drives cursor/selection/footer-seam overrides. Footer below gets a 1px `--accent-ink` top rule on this page so the two scarlet blocks read as intentional.
- **Photo-in-type:** exactly one instance — Gallery's `next up` outline title fills with the next category's cover via `background-clip: text` on hover/focus-visible (and a scroll-into-view fallback for touch). Home's `the archive.` big-link stays type-only.
- **Entrance recipes:** Work heading gets a develop-style wipe (clip-path left→right with a travelling accent hairline) instead of the generic mask-up; About portrait gets the `develop` reveal prop (colourist wipe entrance, not gradable — `the grade.` on Home stays the only operable object); Contact rides the drench with its existing entrance.
- **Privacy:** `privacy.` at `display-xl` with accent dot, `[ effective 01.03.2024 ]` instrument line, `revealed`-gated mask entrance. Body prose stays sentence-case English — it's legal text; the *frame* comes on-system, not the statute.
- **Gilroy Light:** removed (its @font-face, any preload, and the .otf). No current use; NIB-style ultralight contrast word conflicts with the single-voice display system.

## Lane 1 — foundation & hygiene

1. Delete dead CSS in `src/styles/site.css`: `.home-featured*`, `.featured*` (~1416–1572), `.hero-line`, `.featured-title-inner`, and the `@media` block (~2039–2068). Grep first — line numbers drift.
2. Update `PRODUCT.md` design-system tokens to reality: bg `#101013`, text `#f4efe9`, muted `#98938f`, accent `#ff2d1a`; add the mono data-layer font as a documented third voice.
3. Remove Gilroy Light: @font-face in `global.css`, preload in `index.html` if present, `public/fonts/Gilroy-Light.otf`.
4. Create `src/components/Index.tsx` + `.index-mark` CSS per the locked spec. Apply:
   - Gallery items (`.gallery-item-num`, Gallery.tsx:85–87) → `[ 01 ]`.
   - Lightbox counter (Lightbox.tsx:91–93) → `[ 01 / 12 ]`, same register.
   - Log rows (Home.tsx `LogRow`) → `[ 01 ]` leading `.log-meta`, numbered by outing order.

## Lane 2 — liveness

1. Extend `Ticker` to accept ReactNode items; add `Clock` (Europe/Berlin, `setInterval` 1s, cleared on unmount, tabular digits).
2. `StatusRail` = Ticker with the locked items, `.ticker-ink` variant (ink text, ink `.outline-ink` alternation, ink stars), mounted at the top of `Footer`.
3. Contact drench per locked spec (page CSS + `drench` body class + cursor/selection/footer-seam overrides). Reduced-motion: no new motion added, nothing to guard beyond what exists.
4. Privacy per locked spec.

## Lane 3 — craft

1. Gallery `next-up` photo-in-type per locked spec (two stacked layers: stroke layer + clipped-fill layer; fill fades/wipes in; `prefers-reduced-motion` gets an instant swap).
2. Work heading develop-wipe entrance (GSAP clip-path + accent hairline front, `revealed`-gated, reduced-motion fallback to no animation).
3. About portrait: add `develop` to the `WebGLImage` (verify the prop name in WebGLImage.tsx before using).

## Execution rules

- Lanes run sequentially, one worker-builder each. Verification by Rouven's eyes — no verifier agents. Leader runs `tsc --noEmit` + `vite build` after each lane.
- Match existing code idiom: narrative comments only where a constraint needs stating, lowercase copy voice, `prefersReducedMotion()` guards on all new motion, readable text stays in DOM.
