import { create } from "zustand";

const useRigState = create((set) => ({
    isRigActive: true,
    setRig: (isActive) => set({ isRigActive: isActive }),
}));

export default useRigState;
