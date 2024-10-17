import { create } from "zustand";

export const useCameraState = create((set, get) => ({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    setRotation: (rotation) => set({ rotation }),
    setPosition: (position) => set({ position }),
    setScale: (scale) => set({ scale }),
}));
