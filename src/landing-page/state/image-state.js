import { create } from "zustand";

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

const useImageState = create((set) => ({
    images: [
        { image: pexel(911738), title: "category 1" },
        { image: pexel(416430), title: "category 2" },
        { image: pexel(310452), title: "category 3" },
        { image: pexel(911738), title: "category 4" },
        { image: pexel(327482), title: "category 5" },
        { image: pexel(325185), title: "category 6" },
        { image: pexel(911738), title: "category 7" },
        { image: pexel(358574), title: "category 8" },
        { image: pexel(227675), title: "category 9" },
        { image: pexel(911738), title: "category 10" },
        { image: pexel(1738986), title: "category 11" },
    ],

    cameraTapped: false,
    tapCamera: (isTapped) => set({ cameraTapped: isTapped }),
}));

export default useImageState;
