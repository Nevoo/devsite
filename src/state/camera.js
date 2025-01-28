import { create } from "zustand";

export const useCameraState = create((set, get) => ({
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 10,
  mode: "portfolio", // 'portfolio', 'gallery', 'about'
  isShutterActive: false,
  setRotation: (rotation) => set({ rotation }),
  setPosition: (position) => set({ position }),
  setScale: (scale) => set({ scale }),
  setMode: (mode) => {
    set({ isShutterActive: true });
    setTimeout(() => {
      set({ mode, isShutterActive: false });
    }, 300); // Duration of shutter animation
  },
}));
