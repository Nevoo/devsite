# PRODUCT.md

## What this is

rouvens.work — the personal portfolio of Rouven Lührs, photographer & creative developer. A scroll-driven WebGL photo showcase. The site itself is the proof of craft: it must demonstrate both the photography and the engineering taste in one artifact.

register: brand

## Users

Potential photo clients (weddings, concerts, events), potential dev clients/employers, and fellow creatives. They arrive cold, judge within seconds, and leave. The site's one job: "this person has taste and can build."

## Brand voice

Confident, playful, handmade. Lowercase everything. Three physical-object words: darkroom print, concert poster, sticker sheet.

## Aesthetic lane

Shopify-Editions energy applied to a photo portfolio: committed accent color, massive stacked display type with outline/fill mixing, marquee tickers, film grain, index numbers, chunky micro-interactions. NOT minimal-gallery-white, NOT editorial-serif-magazine.

## Design system (summary)

- Base: neutral gallery charcoal `#101013` (soft `#18181c`), text `#f4efe9`, muted `#98938f`
- Accent: `#ff2d1a` scarlet, with `#1c0605` as the ink that sits on it (committed: selection, cursor, numbers, ticker stars, transition panel, footer drench)
- Display: Gilroy ExtraBold, lowercase, tight leading (brand identity font, keep)
- Body: Inter (existing identity, keep)
- Data layer: `--font-mono` (system stack, zero download) — the instrument register for slates, rails, indices, timecodes; the third voice, and the only place the developer half is audible
- Recurring mark: eight-point star/spark (Star.tsx)
- Photos are WebGL planes with a develop-wipe reveal, hover saturation lift, scroll-velocity jelly

## Anti-references

- The old 2021 site's "3D camera model you must click to find the work" (gimmick over content)
- Generic AI dark portfolio: pure #000, gray text, fade-up reveals, no color commitment
- Editorial magazine aesthetics (serif italic, drop caps)

## Strategic principles

1. The photos are the hero; the 3D serves them (effects on the images, not beside them).
2. Every surface has one loud moment, not ten quiet ones.
3. All readable text stays in DOM (SEO, a11y); WebGL is imagery only.
