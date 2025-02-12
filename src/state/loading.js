import { create } from "zustand";

export const useLoadingState = create((set) => ({
  isLoading: true,
  setIsLoading: (value) => set({ isLoading: value }),
}));
