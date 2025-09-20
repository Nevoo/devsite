import { create } from "zustand";

export const useCameraState = create((set, get) => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 10,
  mode: "portfolio", // 'portfolio', 'gallery', 'about'
  isShutterActive: false,
  isAnimating: false,
  shouldNavigateToGallery: false,
  setRotation: (rotation) => set({ rotation }),
  setPosition: (position) => set({ position }),
  setScale: (scale) => set({ scale }),
  setMode: (mode) => {
    set({ isShutterActive: true });
    setTimeout(() => {
      set({ mode, isShutterActive: false });
    }, 300);
  },
  animateToGallery: () => {
    set({ isAnimating: true, shouldNavigateToGallery: true });
    setTimeout(() => {
      set({ isAnimating: false, shouldNavigateToGallery: false });
    }, 1800); // Match new flash transition duration
  },
}));
