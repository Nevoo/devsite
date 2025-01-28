import { create } from "zustand";

export const useExploreState = create((set, get) => ({
  isExploring: false,
  setIsExploring: (isExploring) => set({ isExploring }),
}));
