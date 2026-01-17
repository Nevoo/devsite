# CLAUDE.md - Project Coding Guidelines

This document provides coding guidelines for AI assistants and developers working on this project. Follow these patterns to maintain clean, maintainable code.

---

## Project Overview

A personal portfolio website showcasing photo and film work. Built with TanStack Start, GSAP animations, and deployed to Cloudflare Pages.

**Stack:** TanStack Start + TanStack Router + TanStack Query + GSAP + Zustand

---

## TanStack Router Guidelines

### DO: Use File-Based Routing Structure

```
src/routes/
├── __root.tsx        # Root layout (header, footer, transitions)
├── index.tsx         # / (landing page)
├── about.tsx         # /about
├── contact.tsx       # /contact
└── work/
    ├── index.tsx     # /work (category grid)
    └── $category.tsx # /work/:category (gallery)
```

### DO: Leverage Type-Safe Route Parameters

```typescript
// ✅ Good - fully typed params
export const Route = createFileRoute('/work/$category')({
  component: GalleryPage,
  loader: ({ params }) => {
    // params.category is fully typed
    return fetchGalleryImages(params.category)
  }
})
```

### DO: Use Loaders for Data Fetching

```typescript
// ✅ Good - data loads before render, no waterfalls
export const Route = createFileRoute('/work/$category')({
  loader: async ({ params }) => {
    return {
      images: await fetchImages(params.category),
      meta: await fetchCategoryMeta(params.category)
    }
  },
  component: GalleryPage
})

function GalleryPage() {
  const { images, meta } = Route.useLoaderData()
  // No loading states needed - data is ready
}
```

### DO: Use Search Params for UI State (When Shareable)

```typescript
// ✅ Good - URL reflects UI state, shareable links
import { z } from 'zod'

const gallerySearchSchema = z.object({
  view: z.enum(['grid', 'list']).default('grid'),
  sort: z.enum(['date', 'name']).default('date')
})

export const Route = createFileRoute('/work')({
  validateSearch: gallerySearchSchema
})

function WorkPage() {
  const { view, sort } = Route.useSearch()
  const navigate = Route.useNavigate()

  const setView = (newView: 'grid' | 'list') => {
    navigate({ search: { view: newView } })
  }
}
```

### DO: Use beforeLoad for Auth/Guards

```typescript
// ✅ Good - redirect before component loads
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  }
})
```

---

## TanStack Router Anti-Patterns

### AVOID: Deep Import Paths

```typescript
// ❌ Bad - deep relative imports
import { Button } from '../../../components/ui/Button'
import { useGallery } from '../../../../hooks/useGallery'

// ✅ Good - use path aliases
import { Button } from '@/components/ui/Button'
import { useGallery } from '@/hooks/useGallery'
```

Configure in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### AVOID: Updating URL on Every Keystroke

```typescript
// ❌ Bad - causes rerenders and server round-trips
function SearchInput() {
  const navigate = useNavigate()

  return (
    <input
      onChange={(e) => navigate({
        search: { q: e.target.value } // Fires on every keystroke!
      })}
    />
  )
}

// ✅ Good - debounce URL updates, use local state for typing
function SearchInput() {
  const [localValue, setLocalValue] = useState('')
  const navigate = useNavigate()

  const debouncedNavigate = useDebouncedCallback((value: string) => {
    navigate({ search: { q: value } })
  }, 300)

  return (
    <input
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value)
        debouncedNavigate(e.target.value)
      }}
    />
  )
}
```

### AVOID: Auth Checks in beforeLoad That Hit Server Every Navigation

```typescript
// ❌ Bad - server round-trip on every navigation
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const session = await fetchSession() // Network request!
    if (!session) throw redirect({ to: '/login' })
  }
})

// ✅ Good - use cached/context auth state
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context }) => {
    // Auth state from context, no network request
    if (!context.auth.user) {
      throw redirect({ to: '/login' })
    }
  }
})
```

### AVOID: Premature Abstractions

```typescript
// ❌ Bad - abstracting too early
const usePageData = <T>(routeId: string): T => {
  // Complex generic abstraction for "flexibility"
}

// ✅ Good - use Route.useLoaderData() directly until patterns emerge
function GalleryPage() {
  const data = Route.useLoaderData()
}
```

### AVOID: Mixing Navigation Methods

```typescript
// ❌ Bad - inconsistent navigation
<Link to="/about">About</Link>
<a href="/contact">Contact</a> // Regular anchor, loses SPA benefits

// ✅ Good - always use TanStack Router's Link
import { Link } from '@tanstack/react-router'

<Link to="/about">About</Link>
<Link to="/contact">Contact</Link>
```

---

## TanStack Query Guidelines

### DO: Use Appropriate staleTime

```typescript
// ✅ Good - configure staleTime based on data freshness needs
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes for most data
    }
  }
})

// For rarely changing data (portfolio images)
useQuery({
  queryKey: ['gallery', category],
  queryFn: () => fetchGalleryImages(category),
  staleTime: 1000 * 60 * 30, // 30 minutes - images don't change often
})
```

### DO: Use Query Keys Consistently

```typescript
// ✅ Good - organized, predictable query keys
export const queryKeys = {
  gallery: {
    all: ['gallery'] as const,
    category: (cat: string) => ['gallery', cat] as const,
    image: (cat: string, id: string) => ['gallery', cat, id] as const,
  },
  about: ['about'] as const,
}

// Usage
useQuery({
  queryKey: queryKeys.gallery.category('animals'),
  queryFn: () => fetchGalleryImages('animals')
})
```

### DO: Handle All States

```typescript
// ✅ Good - handle loading, error, and success states
function GalleryImages() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.gallery.category('animals'),
    queryFn: fetchImages
  })

  if (isLoading) return <Skeleton />
  if (isError) return <ErrorMessage error={error} />

  return <ImageGrid images={data} />
}
```

### DO: Use Invalidation Instead of Manual Refetch

```typescript
// ✅ Good - invalidate related queries after mutation
const mutation = useMutation({
  mutationFn: updateImage,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gallery.all })
  }
})
```

---

## TanStack Query Anti-Patterns

### AVOID: Mapping Query Data to Redux/Context

```typescript
// ❌ Bad - duplicating state management
const { data } = useQuery({ queryKey: ['images'], queryFn: fetchImages })

useEffect(() => {
  if (data) {
    dispatch(setImages(data)) // Don't do this!
  }
}, [data])

// ✅ Good - use query data directly, it's already cached
function Component() {
  const { data } = useQuery({ queryKey: ['images'], queryFn: fetchImages })
  return <ImageList images={data} />
}
```

### AVOID: Using TanStack Query for UI State

```typescript
// ❌ Bad - Query is for server state, not UI state
const { data: isModalOpen } = useQuery({
  queryKey: ['modal-state'],
  queryFn: () => false,
  staleTime: Infinity
})

// ✅ Good - use useState or Zustand for UI state
const [isModalOpen, setIsModalOpen] = useState(false)

// Or with Zustand for shared UI state
const isModalOpen = useUIStore((state) => state.isModalOpen)
```

### AVOID: Default staleTime of 0

```typescript
// ❌ Bad - aggressive refetching hammers the server
useQuery({
  queryKey: ['images'],
  queryFn: fetchImages,
  // staleTime defaults to 0 - refetches on every focus!
})

// ✅ Good - set appropriate staleTime
useQuery({
  queryKey: ['images'],
  queryFn: fetchImages,
  staleTime: 1000 * 60 * 10, // 10 minutes
})
```

### AVOID: Creating Request Waterfalls

```typescript
// ❌ Bad - sequential requests (waterfall)
function Gallery() {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  // This waits for categories to load first!
  const { data: images } = useQuery({
    queryKey: ['images', categories?.[0]?.id],
    queryFn: () => fetchImages(categories![0].id),
    enabled: !!categories
  })
}

// ✅ Good - use loader to fetch in parallel, or prefetch
export const Route = createFileRoute('/gallery')({
  loader: async () => {
    const [categories, featuredImages] = await Promise.all([
      fetchCategories(),
      fetchFeaturedImages()
    ])
    return { categories, featuredImages }
  }
})
```

### AVOID: Manual refetch() Everywhere

```typescript
// ❌ Bad - manually triggering refetch
const { refetch } = useQuery({ queryKey: ['images'], queryFn: fetchImages })

const handleUpdate = async () => {
  await updateImage(data)
  refetch() // Don't do this!
}

// ✅ Good - use mutations with invalidation
const mutation = useMutation({
  mutationFn: updateImage,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['images'] })
  }
})
```

---

## GSAP Animation Guidelines

### DO: Always Use useGSAP Hook

```typescript
// ✅ Good - automatic cleanup on unmount
import { useGSAP } from '@gsap/react'

function AnimatedComponent() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.item', {
      opacity: 0,
      y: 50,
      stagger: 0.1
    })
  }, { scope: containerRef }) // Scope selectors to container

  return (
    <div ref={containerRef}>
      <div className="item">Item 1</div>
      <div className="item">Item 2</div>
    </div>
  )
}
```

### DO: Use contextSafe for Event Handlers

```typescript
// ✅ Good - animations in event handlers are cleaned up
function Button() {
  const { contextSafe } = useGSAP()

  const handleClick = contextSafe(() => {
    gsap.to('.target', { scale: 1.2, duration: 0.3 })
  })

  return <button onClick={handleClick}>Animate</button>
}
```

### DO: Use ScrollTrigger with Proper Cleanup

```typescript
// ✅ Good - ScrollTrigger is automatically cleaned up via useGSAP
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function ParallaxSection() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.to('.parallax-bg', {
      yPercent: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef}>
      <div className="parallax-bg" />
    </section>
  )
}
```

### DO: Use revertOnUpdate for Dependency-Based Animations

```typescript
// ✅ Good - revert and recreate when dependencies change
function AnimatedList({ items }: { items: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.list-item', {
      opacity: 0,
      x: -20,
      stagger: 0.05
    })
  }, {
    scope: containerRef,
    dependencies: [items],
    revertOnUpdate: true // Revert previous animations when items change
  })

  return (
    <div ref={containerRef}>
      {items.map(item => <div key={item} className="list-item">{item}</div>)}
    </div>
  )
}
```

---

## GSAP Anti-Patterns

### AVOID: Using useEffect for GSAP Animations

```typescript
// ❌ Bad - no automatic cleanup, potential memory leaks
useEffect(() => {
  gsap.to('.element', { x: 100 })
}, [])

// ✅ Good - useGSAP handles cleanup
useGSAP(() => {
  gsap.to('.element', { x: 100 })
})
```

### AVOID: Animating Non-Performant Properties

```typescript
// ❌ Bad - animating layout properties causes reflow
gsap.to('.element', {
  width: 200,
  height: 100,
  top: 50,
  left: 100
})

// ✅ Good - animate transform and opacity only
gsap.to('.element', {
  x: 100,
  y: 50,
  scale: 1.2,
  opacity: 0.8
})
```

### AVOID: Creating Animations Outside useGSAP Without contextSafe

```typescript
// ❌ Bad - animation created outside useGSAP won't be cleaned up
function Component() {
  useGSAP(() => {
    // Initial animation - this is fine
    gsap.from('.element', { opacity: 0 })
  })

  const handleHover = () => {
    // This animation won't be cleaned up!
    gsap.to('.element', { scale: 1.1 })
  }

  return <div onMouseEnter={handleHover} />
}

// ✅ Good - use contextSafe
function Component() {
  const { contextSafe } = useGSAP()

  const handleHover = contextSafe(() => {
    gsap.to('.element', { scale: 1.1 })
  })

  return <div onMouseEnter={handleHover} />
}
```

### AVOID: Forgetting to Register Plugins

```typescript
// ❌ Bad - plugin not registered, will fail silently or error
import { ScrollTrigger } from 'gsap/ScrollTrigger'

useGSAP(() => {
  gsap.to('.element', {
    scrollTrigger: { /* ... */ } // ScrollTrigger not registered!
  })
})

// ✅ Good - register plugins once at app entry
// In lib/gsap.ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'

gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

export { gsap, ScrollTrigger, ScrollSmoother }

// In components - import from lib
import { gsap, ScrollTrigger } from '@/lib/gsap'
```

### AVOID: Multiple ScrollSmoother Instances

```typescript
// ❌ Bad - creating ScrollSmoother in multiple components
function Section1() {
  useGSAP(() => {
    ScrollSmoother.create({ /* ... */ })
  })
}

function Section2() {
  useGSAP(() => {
    ScrollSmoother.create({ /* ... */ }) // Second instance!
  })
}

// ✅ Good - create once in root layout
function RootLayout() {
  useGSAP(() => {
    ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.5,
      effects: true
    })
  })

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">
        <Outlet />
      </div>
    </div>
  )
}
```

---

## Zustand Guidelines (UI State)

### DO: Keep Stores Small and Focused

```typescript
// ✅ Good - separate stores for different concerns
// stores/ui.ts
export const useUIStore = create<UIState>((set) => ({
  isCursorHovered: false,
  cursorText: '',
  setCursor: (hovered: boolean, text?: string) =>
    set({ isCursorHovered: hovered, cursorText: text ?? '' })
}))

// stores/gallery.ts
export const useGalleryStore = create<GalleryState>((set) => ({
  activeCategory: null,
  setActiveCategory: (cat: string | null) => set({ activeCategory: cat })
}))
```

### DO: Use Selectors to Prevent Unnecessary Rerenders

```typescript
// ✅ Good - only subscribe to needed state
const cursorText = useUIStore((state) => state.cursorText)

// ❌ Bad - subscribes to entire store
const store = useUIStore()
```

---

## General Code Style

### File Naming
- Components: `PascalCase.tsx` (e.g., `ImageReveal.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useCursor.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Routes: Follow TanStack Router conventions (`$param.tsx` for dynamic routes)

### Component Structure
```typescript
// 1. Imports (external, then internal, then types)
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'

import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils'

import type { ImageProps } from './types'

// 2. Component
export function ImageReveal({ src, alt, className }: ImageProps) {
  // Refs first
  const imageRef = useRef<HTMLImageElement>(null)

  // Hooks
  useGSAP(() => {
    // ...
  }, { scope: imageRef })

  // Render
  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      className={cn('image-reveal', className)}
    />
  )
}
```

### Avoid Over-Engineering
- Don't abstract until you see the same pattern 3+ times
- Prefer explicit code over clever abstractions
- Keep components focused on one responsibility
- Don't add features "for the future"

---

## Performance Checklist

- [ ] Images are optimized (WebP, proper sizing)
- [ ] Videos are lazy-loaded
- [ ] GSAP animations use only `transform` and `opacity`
- [ ] ScrollTrigger animations have reasonable start/end points
- [ ] No layout thrashing (batch DOM reads/writes)
- [ ] Query staleTime is set appropriately
- [ ] Components are memoized only when necessary (measure first)
- [ ] Route code-splitting is enabled (automatic with file-based routing)

---

## Deployment (Cloudflare Pages)

```bash
# Build
pnpm build

# Preview locally
pnpm preview

# Deploy (via Cloudflare Pages git integration or wrangler)
wrangler pages deploy dist
```

Ensure `nitro.preset` is set to `cloudflare-pages` in config.
