# rouvens.work

Personal portfolio — photography showcased through a scroll-driven WebGL experience.

## Stack

- [Vite](https://vitejs.dev) + React 19 + TypeScript
- [three.js](https://threejs.org) via [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [drei](https://docs.pmnd.rs/drei)
- [GSAP](https://gsap.com) (ScrollTrigger) + [Lenis](https://lenis.darkroom.engineering) smooth scroll
- [zustand](https://zustand.docs.pmnd.rs) for shared DOM ↔ canvas state

## Architecture

One persistent `<Canvas>` (`src/canvas/CanvasRoot.tsx`) mounts behind the page and never unmounts across routes. Every photo on the site is a drei `<View>` tracked to a plain DOM element (`src/components/WebGLImage.tsx`), rendered with a custom shader (`src/canvas/shaders/imagePlane.ts`) that handles the load reveal, hover zoom, chromatic shift and scroll-velocity distortion. All text stays in the DOM.

Lenis runs on the GSAP ticker (single animation loop); scroll velocity is written to the zustand store and read transiently inside `useFrame`.

## Development

```bash
bun install
bun run dev      # start dev server
bun run build    # typecheck + production build to dist/
bun run preview  # preview the production build
```

## Content

Photo categories live in `public/images/categories/<slug>/` with a `cover.jpeg` and a `gallery/` folder. The typed manifest (with image dimensions for aspect ratios) is `src/content/categories.ts`.
