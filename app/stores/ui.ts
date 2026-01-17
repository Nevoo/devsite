import { create } from 'zustand'

interface CursorState {
  isHovered: boolean
  text: string
  size: 'default' | 'large' | 'text'
}

interface UIState {
  // Cursor
  cursor: CursorState
  setCursor: (cursor: Partial<CursorState>) => void
  resetCursor: () => void

  // Menu
  isMenuOpen: boolean
  setMenuOpen: (open: boolean) => void
  toggleMenu: () => void

  // Page transition
  isTransitioning: boolean
  setTransitioning: (transitioning: boolean) => void

  // Loading
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

const defaultCursor: CursorState = {
  isHovered: false,
  text: '',
  size: 'default',
}

export const useUIStore = create<UIState>((set) => ({
  // Cursor
  cursor: defaultCursor,
  setCursor: (cursor) =>
    set((state) => ({
      cursor: { ...state.cursor, ...cursor },
    })),
  resetCursor: () => set({ cursor: defaultCursor }),

  // Menu
  isMenuOpen: false,
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),

  // Page transition
  isTransitioning: false,
  setTransitioning: (transitioning) => set({ isTransitioning: transitioning }),

  // Loading
  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),
}))

// Selectors for optimal re-renders
export const useCursor = () => useUIStore((state) => state.cursor)
export const useSetCursor = () => useUIStore((state) => state.setCursor)
export const useResetCursor = () => useUIStore((state) => state.resetCursor)
export const useIsMenuOpen = () => useUIStore((state) => state.isMenuOpen)
export const useIsTransitioning = () => useUIStore((state) => state.isTransitioning)
export const useIsLoading = () => useUIStore((state) => state.isLoading)
