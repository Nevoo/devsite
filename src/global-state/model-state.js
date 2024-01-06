import { create } from "zustand";

const useCameraTransitionState = create((set, get) => ({
    position: [-0.02, -0.01, 0.02],
    previousPosition: [0, 0, 0],
    setRig: (isActive) => set({ isRigActive: isActive }),
    setPosition: (position) => {
        set({ previousPosition: get().position });
        set({ position: position });
    },
}));

export default useCameraTransitionState;
