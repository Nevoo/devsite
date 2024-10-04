const { create } = require("zustand");

const useGeneralState = create((set, get) => ({
    scrollDistance: 0,
    setScrollDistance: (distance) => set({ scrollDistance: distance }),
    index: 0,
    setIndex: (index) => set({ index }),
}));

export default useGeneralState;
