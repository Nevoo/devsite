# Portfolio Redesign Plan: Photo & Film Showcase
## A Case Study in Modern Web Animation & UX

---

## Executive Summary

This document outlines a complete redesign of rouvens.work, transforming it from a 3D camera-centric portfolio into a **cinematic, scroll-driven photo & film showcase**. The redesign prioritizes:

- **Immersive storytelling** through scroll-based animations
- **Content-first design** that lets the work speak
- **Award-winning animation techniques** inspired by Awwwards sites
- **Seamless UX** that feels as polished as the creative work it presents

---

## Part 1: Research Findings

### 1.1 Current State Analysis

**Tech Stack:**
- React 18 + React Three Fiber
- GSAP 3.12.5 (underutilized)
- React Spring (primary animation)
- Zustand state management
- Custom shaders for image effects

**Current Strengths:**
- 3D camera model is unique and memorable
- Smooth spring-based animations
- Good mobile responsiveness foundation
- Clean typography (Gilroy font family)

**Pain Points:**
- 3D experience can feel gimmicky, distracting from actual work
- Navigation is unclear (clicking camera to enter gallery)
- Gallery experience is basic—horizontal scroll with no storytelling
- Limited use of GSAP's powerful ScrollTrigger capabilities
- No video/film showcase capability
- Loading experience doesn't build anticipation

### 1.2 Award-Winning Portfolio Patterns (Awwwards 2025)

Based on recent Site of the Day winners like **PaulKram** and honorable mentions:

| Pattern | Description |
|---------|-------------|
| **Scroll-driven reveals** | Content unfolds as user scrolls, creating narrative |
| **Full-bleed imagery** | Edge-to-edge images that dominate the viewport |
| **Typography as design** | Large, bold type that works with (not against) imagery |
| **Horizontal + vertical hybrid** | Sections that scroll horizontally within vertical flow |
| **Cursor interactions** | Custom cursors that respond to hoverable content |
| **Smooth page transitions** | Seamless morphing between pages/projects |
| **Video integration** | Autoplay loops, hover-triggered previews |

### 1.3 GSAP Techniques to Implement

**Core Plugins:**
```
ScrollTrigger    - Link animations to scroll position
ScrollSmoother   - Native smooth scrolling (now free!)
SplitText        - Character/word/line text animations
Observer         - Touch/scroll/wheel detection
```

**Key Techniques:**
1. **Scrub animations** - `scrub: 1` for smooth scroll-linked motion
2. **Pin sections** - Lock elements during scroll for storytelling
3. **Parallax layers** - `data-speed` attributes for depth
4. **Staggered reveals** - Sequential element entrances
5. **Scale-on-scroll** - Images that grow/shrink with scroll progress
6. **Mask reveals** - Content revealed through animated masks

---

## Part 2: Design Concept

### 2.1 Design Philosophy

> **"The work is the hero. Everything else supports it."**

The redesign shifts from "look at this cool 3D camera" to "experience this photographer's vision." Every animation should serve the content, not compete with it.

### 2.2 Visual Language

**Color Palette:**
```css
--bg-primary: #0a0a0a;      /* Deep black for cinematic feel */
--bg-secondary: #141414;    /* Subtle card backgrounds */
--text-primary: #fafafa;    /* High contrast white */
--text-muted: #666666;      /* Secondary text */
--accent: #ff4d00;          /* Warm accent (optional, for CTAs) */
--overlay: rgba(0,0,0,0.4); /* Image overlays */
```

**Typography:**
```css
--font-display: 'Gilroy', sans-serif;    /* Headlines - keep existing */
--font-body: 'Inter', sans-serif;        /* Body text */
--font-mono: 'JetBrains Mono', mono;     /* Metadata/captions */
```

**Typography Scale:**
- Hero titles: `clamp(4rem, 15vw, 12rem)` - Massive, impactful
- Section headers: `clamp(2rem, 5vw, 4rem)` - Bold but readable
- Body: `1rem / 1.6` - Clean, comfortable reading
- Captions: `0.75rem` - Subtle metadata

### 2.3 Layout System

**Grid Philosophy:**
- 12-column grid for flexibility
- Generous whitespace (8px base unit, scaling: 8, 16, 24, 32, 48, 64, 96, 128)
- Full-bleed sections punctuated by contained content
- Asymmetric layouts to create visual interest

---

## Part 3: Page-by-Page Breakdown

### 3.1 Landing Page (Hero Experience)

**Concept:** A cinematic intro that immediately establishes the photographer's style

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │           [HERO REEL - AUTOPLAY VIDEO]             │   │  ← Full viewport
│  │              with subtle grain overlay              │   │
│  │                                                     │   │
│  │         ROUVENS                                     │   │  ← Name reveals on scroll
│  │         PHOTO & FILM                                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  scroll to explore ↓                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Animations:**
1. **Video fade-in** (0.5s) on load with scale from 1.1 → 1.0
2. **Text mask reveal** - Name characters reveal left-to-right with stagger
3. **Parallax scroll** - Video moves slower than text (creates depth)
4. **Scroll indicator** - Gentle bounce animation, fades on scroll

**Technical Implementation:**
```javascript
// Hero video parallax
gsap.to(".hero-video", {
  yPercent: 30,
  ease: "none",
  scrollTrigger: {
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: true
  }
});

// Name reveal with SplitText
const split = new SplitText(".hero-name", { type: "chars" });
gsap.from(split.chars, {
  yPercent: 100,
  opacity: 0,
  stagger: 0.03,
  duration: 1,
  ease: "power4.out",
  scrollTrigger: {
    trigger: ".hero-name",
    start: "top 80%"
  }
});
```

---

### 3.2 Featured Work Section

**Concept:** Showcase 3-5 best projects with horizontal scroll-within-vertical-scroll

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  FEATURED WORK                                              │  ← Sticky header
│  ─────────────                                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │  │  ← Horizontal scroll
│  │  │Project │ │Project │ │Project │ │Project │  →     │  │    (pinned section)
│  │  │   1    │ │   2    │ │   3    │ │   4    │        │  │
│  │  │        │ │        │ │        │ │        │        │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │  │
│  │                                                      │  │
│  │  ANIMALS                                             │  │  ← Title animates
│  │  Wildlife photography from around the world          │  │    with each project
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Animations:**
1. **Horizontal scrub** - Vertical scroll translates to horizontal movement
2. **Scale on approach** - Center image scales to 1.1, others at 1.0
3. **Title crossfade** - Project title fades/slides as new project enters center
4. **Progress indicator** - Thin line shows scroll progress

**Technical Implementation:**
```javascript
// Horizontal scroll section
const sections = gsap.utils.toArray(".featured-project");

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".featured-container",
    pin: true,
    scrub: 1,
    snap: 1 / (sections.length - 1),
    end: () => "+=" + document.querySelector(".featured-container").offsetWidth
  }
});
```

---

### 3.3 Category Grid Section

**Concept:** Visual index of all work categories

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  EXPLORE                                                    │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │                 │  │                 │                  │
│  │    ANIMALS      │  │     NATURE      │                  │
│  │                 │  │                 │                  │  ← Masonry-ish
│  │  [hover: video  │  └─────────────────┘                  │    grid with
│  │   preview]      │  ┌─────────────────┐                  │    varying heights
│  │                 │  │                 │                  │
│  └─────────────────┘  │    PORTRAITS    │                  │
│  ┌─────────────────┐  │                 │                  │
│  │                 │  └─────────────────┘                  │
│  │     TRAVEL      │  ┌─────────────────┐                  │
│  │                 │  │    URBAN        │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
1. **Staggered reveal** - Cards fade in with Y offset as they enter viewport
2. **Hover state** - Image scales slightly, video preview plays (if film category)
3. **Magnetic effect** - Cards subtly pull toward cursor on hover
4. **Click transition** - Selected card expands to fill viewport before route change

---

### 3.4 Project/Gallery Page

**Concept:** Immersive, full-screen gallery with cinematic scroll experience

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ANIMALS                                               01/12│  ← Minimal header
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  │              [FULL BLEED IMAGE]                     │   │  ← Each image is
│  │                                                     │   │    a "chapter"
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Lion at Dawn                                    Kenya, 2024│  ← Caption reveals
│                                                             │
└─────────────────────────────────────────────────────────────┘

[SCROLL]

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌───────────────────┐  ┌───────────────────┐              │
│  │                   │  │                   │              │  ← Paired images
│  │    [IMAGE 2]      │  │    [IMAGE 3]      │              │    with parallax
│  │                   │  │                   │              │
│  └───────────────────┘  └───────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

[SCROLL]

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│               ┌───────────────────────┐                    │
│               │                       │                    │  ← Centered medium
│               │      [IMAGE 4]        │                    │    with text
│               │                       │                    │
│               └───────────────────────┘                    │
│                                                             │
│               "The golden hour light painted                │
│                everything in warm amber..."                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Layout Variations (randomized per gallery):**
- Full bleed hero (100vw × 100vh)
- Side-by-side pairs (50/50)
- Asymmetric pairs (60/40)
- Single centered (60vw centered)
- Grid of 3 (33/33/33)
- Full bleed with text overlay

**Animations:**
1. **Image reveal** - Clip-path animation from bottom to top
2. **Parallax depth** - Images with `data-speed` for layered scrolling
3. **Caption fade** - Text fades in after image fully reveals
4. **Progress bar** - Horizontal line at top showing gallery progress
5. **Next project teaser** - Peeking preview of next category at bottom

---

### 3.5 About Page

**Concept:** Personal, human connection with the artist

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────────────────────┐                          │
│  │                              │  ROUVENS NEUMANN         │
│  │                              │                          │
│  │      [PORTRAIT PHOTO]        │  Photographer &          │
│  │                              │  Filmmaker based in      │
│  │                              │  [Location]              │
│  │                              │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  With a passion for capturing moments that tell stories,   │
│  I specialize in wildlife, nature, and documentary         │
│  photography. My work has been featured in...              │
│                                                             │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  SERVICES                        CLIENTS                   │
│  • Photography                   • Client 1                │
│  • Videography                   • Client 2                │
│  • Post-production               • Client 3                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Animations:**
1. **Portrait reveal** - Image grows from center with slight rotation
2. **Text line reveal** - Each paragraph line reveals with stagger
3. **Stats counter** - Numbers count up when in viewport
4. **Horizontal scroll section** - Equipment/gear showcase (optional)

---

### 3.6 Contact Page

**Concept:** Clear, confident call-to-action

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│           LET'S CREATE                                      │
│           SOMETHING TOGETHER                                │
│                                                             │
│           ─────────────────────                             │
│                                                             │
│           hello@rouvens.work                                │
│           [COPY TO CLIPBOARD BUTTON]                        │
│                                                             │
│           ─────────────────────                             │
│                                                             │
│           Instagram    Twitter    LinkedIn                  │
│                                                             │
│           ─────────────────────                             │
│                                                             │
│           Based in [City], available worldwide              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
1. **Hover email** - Magnetic pull effect on email address
2. **Copy feedback** - Toast notification on copy
3. **Social links** - Scale + color change on hover
4. **Background** - Subtle gradient animation or grain effect

---

## Part 4: Micro-Interactions & Details

### 4.1 Custom Cursor

```javascript
// Cursor states
const cursorStates = {
  default: { size: 16, mix: 'difference' },
  hover: { size: 80, mix: 'normal', text: 'VIEW' },
  drag: { size: 120, mix: 'normal', text: 'DRAG' },
  video: { size: 80, mix: 'normal', icon: 'play' }
};
```

**Behavior:**
- Small dot by default
- Expands with label on interactive elements
- Shows "VIEW" on project thumbnails
- Shows "DRAG" on horizontal scroll sections
- Shows play icon on video content

### 4.2 Page Transitions

**Concept:** Seamless morphing between pages

```javascript
// Route change animation
const pageTransition = gsap.timeline();

pageTransition
  .to(".page-content", {
    opacity: 0,
    y: -30,
    duration: 0.4
  })
  .to(".transition-overlay", {
    scaleY: 1,
    transformOrigin: "bottom",
    duration: 0.5
  })
  // [Route changes here]
  .to(".transition-overlay", {
    scaleY: 0,
    transformOrigin: "top",
    duration: 0.5
  })
  .from(".page-content", {
    opacity: 0,
    y: 30,
    duration: 0.4
  });
```

### 4.3 Loading States

**Initial Load:**
- Progress bar with percentage
- Staggered text reveal of name
- Smooth transition to hero

**Image Loading:**
- Blur-up technique (show blurred placeholder, reveal sharp)
- Or clip-path reveal from bottom
- Skeleton loading for grid layouts

### 4.4 Sound Design (Optional Enhancement)

- Subtle click sounds on navigation
- Ambient track on showreel (user-initiated)
- Hover sounds on interactive elements

---

## Part 5: Technical Architecture

### 5.1 Recommended Tech Stack Changes

| Current | Proposed | Reason |
|---------|----------|--------|
| React Three Fiber | Keep minimal 3D | Reduce complexity, focus on 2D |
| React Spring | GSAP only | Single animation library |
| Manual scroll | ScrollSmoother | Better performance, native scroll |
| useState for UI | Zustand (keep) | Already good |
| CSS + inline | CSS Modules + CSS Variables | Better organization |

### 5.2 New Dependencies

```json
{
  "@gsap/react": "^2.1.0",
  "gsap": "^3.12.5",
  "lenis": "^1.1.0",          // Alternative to ScrollSmoother if needed
  "splitting": "^1.0.6",       // Text splitting (free alternative to SplitText)
  "next": "^14.0.0"            // Consider migration for SSG/SSR
}
```

### 5.3 File Structure (Proposed)

```
src/
├── app/                      # Next.js app router (if migrating)
│   ├── page.tsx
│   ├── work/
│   │   ├── page.tsx
│   │   └── [category]/
│   │       └── page.tsx
│   ├── about/
│   │   └── page.tsx
│   └── contact/
│       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── PageTransition.tsx
│   │   └── CustomCursor.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── FeaturedWork.tsx
│   │   ├── CategoryGrid.tsx
│   │   └── ProjectGallery.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Image.tsx
│   │   ├── Video.tsx
│   │   └── ScrollProgress.tsx
│   └── animations/
│       ├── TextReveal.tsx
│       ├── ImageReveal.tsx
│       └── ParallaxWrapper.tsx
├── hooks/
│   ├── useScrollTrigger.ts
│   ├── useCursor.ts
│   └── useMediaQuery.ts
├── lib/
│   ├── gsap.ts              # GSAP setup + plugin registration
│   └── utils.ts
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── typography.css
└── content/
    ├── projects.json         # Or CMS integration
    └── about.json
```

### 5.4 GSAP Setup

```javascript
// lib/gsap.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

// Default configuration
gsap.defaults({
  ease: 'power3.out',
  duration: 0.8
});

// ScrollTrigger defaults
ScrollTrigger.defaults({
  markers: process.env.NODE_ENV === 'development'
});

export { gsap, ScrollTrigger, ScrollSmoother, SplitText, useGSAP };
```

### 5.5 Performance Considerations

1. **Image Optimization:**
   - Use `next/image` or sharp for automatic optimization
   - Serve WebP with JPEG fallback
   - Implement lazy loading with blur placeholders
   - Consider using Cloudinary or similar CDN

2. **Video Optimization:**
   - Serve WebM with MP4 fallback
   - Autoplay muted for hero reel
   - Load videos only when in viewport

3. **Animation Performance:**
   - Animate only `transform` and `opacity`
   - Use `will-change` sparingly
   - Disable complex animations on reduced motion preference
   - Use `ScrollTrigger.matchMedia()` for responsive breakpoints

4. **Code Splitting:**
   - Dynamic imports for route-based splitting
   - Lazy load heavy components (video player, etc.)

---

## Part 6: Implementation Roadmap

### Phase 1: Foundation
- [ ] Set up GSAP with ScrollTrigger and ScrollSmoother
- [ ] Implement new color system and typography
- [ ] Create base layout components (Header, Footer, PageTransition)
- [ ] Build custom cursor component
- [ ] Set up smooth scrolling foundation

### Phase 2: Landing Page
- [ ] Hero section with video/image background
- [ ] Text reveal animations
- [ ] Featured work horizontal scroll section
- [ ] Category grid with hover effects
- [ ] Scroll-triggered reveals throughout

### Phase 3: Gallery Experience
- [ ] Dynamic gallery layout system
- [ ] Image reveal animations
- [ ] Parallax scrolling implementation
- [ ] Progress indicator
- [ ] Next project teaser
- [ ] Mobile touch interactions

### Phase 4: Supporting Pages
- [ ] About page with staggered reveals
- [ ] Contact page with interactions
- [ ] 404 page design
- [ ] Privacy policy styling

### Phase 5: Polish & Optimization
- [ ] Page transitions between routes
- [ ] Loading states and skeleton screens
- [ ] Image optimization pipeline
- [ ] Performance audit and fixes
- [ ] Cross-browser testing
- [ ] Accessibility audit (focus states, reduced motion)

### Phase 6: Content & Launch
- [ ] Curate and optimize images
- [ ] Write compelling copy
- [ ] Set up CMS or content management
- [ ] Deploy to production
- [ ] Submit to Awwwards/other galleries

---

## Part 7: Mobile Considerations

### Touch Interactions
- Swipe gestures for gallery navigation
- Pull-to-refresh style interactions
- Haptic feedback on key actions (if supported)

### Performance
- Reduced animation complexity on mobile
- Lower resolution images/videos
- Disable parallax on low-powered devices

### Layout Adaptations
- Single column layouts
- Full-width images
- Larger touch targets (min 44px)
- Bottom navigation consideration

```javascript
// Responsive ScrollTrigger setup
ScrollTrigger.matchMedia({
  "(min-width: 768px)": function() {
    // Desktop animations
  },
  "(max-width: 767px)": function() {
    // Simpler mobile animations
  },
  "(prefers-reduced-motion: reduce)": function() {
    // Minimal/no animations
  }
});
```

---

## Part 8: Measuring Success

### Performance Targets
- Lighthouse Performance: 90+
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.5s

### UX Metrics
- Average session duration
- Pages per session
- Scroll depth on gallery pages
- Contact form/email click rate

### Awards Submission Checklist
- [ ] Unique and memorable design
- [ ] Smooth 60fps animations
- [ ] Mobile-responsive
- [ ] Fast loading (optimize everything)
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Cross-browser compatible
- [ ] High-quality content
- [ ] Clear navigation
- [ ] Working contact functionality

---

## Appendix: Reference & Inspiration

### Award-Winning Sites to Study
- [PaulKram](https://paulkram.com) - Site of the Day Dec 2025
- [Gregory Lalle](https://gregorylalle.com) - Text transitions
- [Asmobius](https://asmobius.co.jp) - Mask reveals
- [Made with GSAP](https://madewithgsap.com) - GSAP techniques showcase

### Resources
- [GSAP ScrollTrigger Docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP ScrollSmoother Docs](https://gsap.com/docs/v3/Plugins/ScrollSmoother/)
- [Awwwards Photography Portfolios](https://www.awwwards.com/websites/photography/)
- [Codrops - GSAP Tutorials](https://tympanus.net/codrops/)
- [Frontend Horse - Animation Techniques](https://frontend.horse/articles/amazing-animation-techniques-with-gsap/)

### Color Inspiration
- Dark, cinematic palettes (Netflix, Apple TV+)
- High contrast for photography focus
- Neutral backgrounds that don't compete with images

---

*This plan serves as both a roadmap for implementation and a case study document showcasing the research and design thinking behind the redesign.*
