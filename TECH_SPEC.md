# Technical Specification

## Portfolio Website - Photo & Film Showcase

---

## 1. Overview

A personal portfolio website showcasing photography and film work. Built with modern web technologies prioritizing performance, animations, and developer experience without vendor lock-in.

**Live URL:** `https://rouvens.work` (Cloudflare Pages)

---

## 2. Technology Stack

### 2.1 Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Start** | ^1.95.0 | Full-stack React framework |
| **TanStack Router** | ^1.95.0 | Type-safe file-based routing |
| **TanStack Query** | ^5.62.0 | Async state management & caching |
| **React** | ^19.0.0 | UI library |
| **TypeScript** | ^5.7.0 | Type safety |
| **Vite** | ^6.0.0 | Build tool & dev server |

### 2.2 Animation

| Technology | Version | Purpose |
|------------|---------|---------|
| **GSAP** | ^3.12.5 | Core animation engine |
| **@gsap/react** | ^2.1.1 | React integration (useGSAP hook) |
| **ScrollTrigger** | (GSAP plugin) | Scroll-linked animations |
| **ScrollSmoother** | (GSAP plugin) | Smooth scrolling |
| **SplitText** | (GSAP plugin) | Text character/word animations |

### 2.3 State Management

| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Query** | ^5.62.0 | Server state (API data, images) |
| **Zustand** | ^5.0.0 | Client UI state (cursor, transitions) |

### 2.4 Styling

| Technology | Purpose |
|------------|---------|
| **CSS Modules** | Scoped component styles |
| **CSS Variables** | Design tokens (colors, spacing, typography) |
| **PostCSS** | Vendor prefixing, nesting |

### 2.5 Fonts

| Font | Weight | Usage |
|------|--------|-------|
| **Editorial New** | 300, 400 | Headlines, project titles |
| **Neue Montreal** | 400, 500, 600 | Body text, navigation, UI |

Source: [Pangram Pangram Foundry](https://pangrampangram.com/) or self-hosted via Fontsource.

### 2.6 Deployment

| Service | Purpose |
|---------|---------|
| **Cloudflare Pages** | Hosting, CDN, edge functions |
| **Cloudflare R2** | Image/video storage (optional) |
| **Cloudflare Analytics** | Privacy-friendly analytics |

---

## 3. Project Structure

```
rouvens-portfolio/
├── public/
│   ├── fonts/                    # Self-hosted fonts
│   ├── images/                   # Static images (favicon, og-image)
│   └── videos/                   # Hero reel, previews
├── src/
│   ├── routes/                   # TanStack Router file-based routes
│   │   ├── __root.tsx           # Root layout
│   │   ├── index.tsx            # Landing page (/)
│   │   ├── about.tsx            # About page (/about)
│   │   ├── contact.tsx          # Contact page (/contact)
│   │   └── work/
│   │       ├── index.tsx        # Work overview (/work)
│   │       └── $category.tsx    # Gallery (/work/:category)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── PageTransition.tsx
│   │   │   ├── CustomCursor.tsx
│   │   │   └── SmoothScroll.tsx
│   │   ├── sections/
│   │   │   ├── Hero.tsx
│   │   │   ├── FeaturedWork.tsx
│   │   │   ├── CategoryGrid.tsx
│   │   │   └── ContactCTA.tsx
│   │   ├── gallery/
│   │   │   ├── GalleryLayout.tsx
│   │   │   ├── ImageReveal.tsx
│   │   │   ├── ParallaxImage.tsx
│   │   │   └── VideoPlayer.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Image.tsx
│   │       ├── Link.tsx
│   │       └── Text.tsx
│   ├── hooks/
│   │   ├── useCursor.ts
│   │   ├── useReducedMotion.ts
│   │   ├── useMediaQuery.ts
│   │   └── useScrollProgress.ts
│   ├── lib/
│   │   ├── gsap.ts              # GSAP setup & plugin registration
│   │   ├── utils.ts             # Utility functions
│   │   ├── cn.ts                # Class name helper
│   │   └── queryKeys.ts         # TanStack Query key factory
│   ├── stores/
│   │   ├── ui.ts                # UI state (cursor, menu)
│   │   └── gallery.ts           # Gallery state (active image)
│   ├── styles/
│   │   ├── global.css           # Global styles, resets
│   │   ├── variables.css        # CSS custom properties
│   │   └── typography.css       # Font definitions
│   ├── content/
│   │   ├── projects.ts          # Project/gallery data
│   │   └── meta.ts              # Site metadata
│   ├── types/
│   │   └── index.ts             # Shared TypeScript types
│   ├── app.tsx                  # App entry
│   ├── router.tsx               # Router configuration
│   └── entry-client.tsx         # Client entry point
├── app.config.ts                # TanStack Start configuration
├── tsconfig.json
├── package.json
├── CLAUDE.md                    # AI/Developer coding guidelines
├── TECH_SPEC.md                 # This file
└── PORTFOLIO_REDESIGN_PLAN.md   # Design documentation
```

---

## 4. Configuration

### 4.1 TanStack Start Config

```typescript
// app.config.ts
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({
  server: {
    preset: 'cloudflare-pages',
    prerender: {
      routes: [
        '/',
        '/about',
        '/contact',
        '/work',
        '/work/animals',
        '/work/nature',
        '/work/portraits',
        '/work/travel',
        '/work/urban',
        '/work/film'
      ]
    }
  },
  vite: {
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    }
  }
})
```

### 4.2 TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### 4.3 GSAP Setup

```typescript
// src/lib/gsap.ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { useGSAP } from '@gsap/react'

// Register plugins once
gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

// Configure defaults
gsap.defaults({
  ease: 'power3.out',
  duration: 0.8
})

// Configure ScrollTrigger
ScrollTrigger.defaults({
  markers: import.meta.env.DEV
})

export { gsap, ScrollTrigger, ScrollSmoother, useGSAP }
```

---

## 5. Design Tokens

### 5.1 Colors

```css
/* src/styles/variables.css */
:root {
  /* Background */
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #141414;
  --color-bg-tertiary: #1a1a1a;

  /* Text */
  --color-text-primary: #fafafa;
  --color-text-secondary: #a0a0a0;
  --color-text-muted: #666666;

  /* Accent */
  --color-accent: #ff4d00;
  --color-accent-hover: #ff6a2a;

  /* Utility */
  --color-overlay: rgba(0, 0, 0, 0.5);
  --color-border: rgba(255, 255, 255, 0.1);
}
```

### 5.2 Typography

```css
:root {
  /* Font families */
  --font-display: 'Editorial New', Georgia, serif;
  --font-body: 'Neue Montreal', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Font sizes (fluid) */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.6vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1rem + 1.25vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1rem + 2.5vw, 2rem);
  --text-3xl: clamp(2rem, 1rem + 5vw, 3rem);
  --text-4xl: clamp(2.5rem, 1rem + 7.5vw, 4.5rem);
  --text-hero: clamp(3rem, 1rem + 12vw, 10rem);

  /* Line heights */
  --leading-tight: 0.9;
  --leading-snug: 1.1;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Letter spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
}
```

### 5.3 Spacing

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */
  --space-8: 3rem;      /* 48px */
  --space-10: 4rem;     /* 64px */
  --space-12: 6rem;     /* 96px */
  --space-16: 8rem;     /* 128px */
}
```

### 5.4 Animation

```css
:root {
  /* Durations */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 800ms;

  /* Easings (CSS) */
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 6. Key Components

### 6.1 Root Layout

```typescript
// src/routes/__root.tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CustomCursor } from '@/components/layout/CustomCursor'
import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { PageTransition } from '@/components/layout/PageTransition'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout() {
  return (
    <>
      <CustomCursor />
      <Header />
      <SmoothScroll>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </SmoothScroll>
      <Footer />
    </>
  )
}
```

### 6.2 Smooth Scroll Wrapper

```typescript
// src/components/layout/SmoothScroll.tsx
import { useRef } from 'react'
import { useGSAP, gsap, ScrollSmoother } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return

    ScrollSmoother.create({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      smooth: 1.2,
      effects: true,
      smoothTouch: 0.1
    })
  })

  return (
    <div ref={wrapperRef} id="smooth-wrapper">
      <div ref={contentRef} id="smooth-content">
        {children}
      </div>
    </div>
  )
}
```

### 6.3 Image Reveal Animation

```typescript
// src/components/gallery/ImageReveal.tsx
import { useRef } from 'react'
import { useGSAP, gsap, ScrollTrigger } from '@/lib/gsap'
import styles from './ImageReveal.module.css'

interface ImageRevealProps {
  src: string
  alt: string
  priority?: boolean
}

export function ImageReveal({ src, alt, priority = false }: ImageRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const container = containerRef.current
    if (!container) return

    gsap.fromTo(
      container.querySelector('img'),
      { scale: 1.3 },
      {
        scale: 1,
        duration: 1.5,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        }
      }
    )

    gsap.fromTo(
      container.querySelector(`.${styles.mask}`),
      { scaleY: 1 },
      {
        scaleY: 0,
        transformOrigin: 'top',
        duration: 1.2,
        ease: 'power4.inOut',
        scrollTrigger: {
          trigger: container,
          start: 'top 80%'
        }
      }
    )
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.mask} />
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  )
}
```

---

## 7. Data Layer

### 7.1 Project Data Structure

```typescript
// src/content/projects.ts
export interface Project {
  id: string
  title: string
  category: Category
  description: string
  coverImage: string
  images: GalleryImage[]
  video?: string
  date: string
  location?: string
}

export interface GalleryImage {
  id: string
  src: string
  alt: string
  width: number
  height: number
  caption?: string
}

export type Category =
  | 'animals'
  | 'nature'
  | 'portraits'
  | 'travel'
  | 'urban'
  | 'film'

export const projects: Project[] = [
  {
    id: 'animals',
    title: 'Animals',
    category: 'animals',
    description: 'Wildlife photography from around the world',
    coverImage: '/images/animals/cover.webp',
    images: [
      {
        id: 'animals-1',
        src: '/images/animals/gallery/001.webp',
        alt: 'Lion at dawn',
        width: 1920,
        height: 2880,
        caption: 'Lion at Dawn - Kenya, 2024'
      },
      // ...
    ],
    date: '2024'
  },
  // ...
]
```

### 7.2 Query Keys

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, id] as const,
    category: (cat: string) => [...queryKeys.projects.all, 'category', cat] as const
  },
  images: {
    all: ['images'] as const,
    gallery: (projectId: string) => [...queryKeys.images.all, projectId] as const
  }
} as const
```

---

## 8. Deployment

### 8.1 Cloudflare Pages Setup

1. Connect repository to Cloudflare Pages
2. Configure build settings:
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Node.js version: 20.x

3. Environment variables:
   ```
   NODE_VERSION=20
   ```

### 8.2 Build & Deploy Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Deploy via Wrangler (optional, for manual deploys)
pnpm wrangler pages deploy dist
```

### 8.3 Cloudflare Configuration

```toml
# wrangler.toml (optional, for advanced configuration)
name = "rouvens-portfolio"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

---

## 9. Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| Lighthouse Performance | 90+ | Lighthouse |
| First Contentful Paint | < 1.5s | WebPageTest |
| Largest Contentful Paint | < 2.5s | WebPageTest |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Total Blocking Time | < 200ms | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |

### Optimization Strategies

1. **Images**
   - Serve WebP with JPEG fallback
   - Use responsive `srcset`
   - Lazy load below-the-fold images
   - Blur-up placeholders

2. **Fonts**
   - Self-host fonts (no Google Fonts latency)
   - Use `font-display: swap`
   - Subset fonts to used characters

3. **Animations**
   - Only animate `transform` and `opacity`
   - Use `will-change` sparingly
   - Respect `prefers-reduced-motion`
   - Use ScrollTrigger's `fastScrollEnd`

4. **Code**
   - Route-based code splitting (automatic)
   - Tree-shake unused GSAP plugins
   - Minimize third-party scripts

---

## 10. Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |
| Mobile Safari | iOS 15+ |
| Chrome Android | Last 2 versions |

---

## 11. Accessibility

- WCAG 2.1 AA compliance target
- Keyboard navigation for all interactive elements
- Focus indicators visible
- `prefers-reduced-motion` respected
- Sufficient color contrast (4.5:1 minimum)
- Alt text for all images
- Semantic HTML structure
- Skip-to-content link

---

## 12. Future Considerations

- [ ] CMS integration (Sanity, Contentful, or Cloudflare KV)
- [ ] Image optimization pipeline (Cloudflare Images or R2 + Workers)
- [ ] Video hosting (Cloudflare Stream or Mux)
- [ ] Contact form with Cloudflare Workers
- [ ] Analytics dashboard
- [ ] A/B testing for portfolio presentation
