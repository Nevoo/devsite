import { create } from 'zustand'
import type { Photo } from '@/content/categories'

interface LightboxState {
  /**
   * whatever ordered set of frames is on display — a category's gallery, a
   * place's sitting off the globe. The viewer never resolves anything itself;
   * generalised from category-keyed the day the globe's card fans needed to
   * open an arbitrary stack (GLOBE-V2.md §6.5 called it).
   */
  photos: Photo[]
  /** counter/aria label: 'nature', 'bali, id', … */
  label: string
  index: number
}

interface UIState {
  /**
   * true while the viewport shows page content — false under the initial
   * loader and while a page transition covers the screen. Pages gate their
   * entrance animations on it so they fire with the reveal, not behind it.
   */
  revealed: boolean
  setRevealed: (v: boolean) => void

  /**
   * true while React swaps routes behind the transition cover. The WebGL
   * canvas owns an independent rAF loop, so without this freeze it can render
   * a torn frame containing the outgoing planes and the incoming route's DOM.
   */
  canvasFrozen: boolean
  setCanvasFrozen: (v: boolean) => void

  /** current smooth-scroll velocity, written by SmoothScroll every frame, read transiently in useFrame */
  scrollVelocity: number

  lightbox: LightboxState | null
  openLightbox: (label: string, photos: Photo[], index: number) => void
  closeLightbox: () => void
  stepLightbox: (dir: 1 | -1) => void

  /**
   * true while a card is popped out of a globe hand at viewer scale (the
   * hero's genie viewer — not the Lightbox). The canvas tour reads it per
   * frame (getState, never a hook) and freezes, exactly as it does for the
   * lightbox: the sphere advancing under a popped card would collapse the
   * fan it flew out of.
   */
  popOpen: boolean
  setPopOpen: (v: boolean) => void
}

export const useUI = create<UIState>((set) => ({
  revealed: false,
  setRevealed: (v) => set({ revealed: v }),

  canvasFrozen: false,
  setCanvasFrozen: (v) => set({ canvasFrozen: v }),

  scrollVelocity: 0,

  lightbox: null,
  openLightbox: (label, photos, index) =>
    photos.length ? set({ lightbox: { label, photos, index } }) : undefined,
  closeLightbox: () => set({ lightbox: null }),
  popOpen: false,
  setPopOpen: (v) => set({ popOpen: v }),

  stepLightbox: (dir) =>
    set((s) =>
      s.lightbox
        ? {
            lightbox: {
              ...s.lightbox,
              index: (s.lightbox.index + dir + s.lightbox.photos.length) % s.lightbox.photos.length,
            },
          }
        : s
    ),
}))
