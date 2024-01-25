import { create } from "zustand";

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

// TODO: all this should be handled through a cms, s3 bucket or something
const useImageState = create((set) => ({
    categories: [
        { image: "https://i.imgur.com/clGfTlK.jpg", title: "black mist" },
        { image: pexel(416430), title: "weddings" },
        { image: pexel(310452), title: "events" },
        { image: pexel(911738), title: "travel" },
        { image: pexel(327482), title: "street" },
    ],
    // index is the id of the category
    images: [
        [
            "https://i.imgur.com/clGfTlK.jpg",
            "https://i.imgur.com/i0Nz97X.jpg",
            "https://i.imgur.com/FuT4pPb.jpg",
            "https://i.imgur.com/56cuB60.jpg",
            "https://i.imgur.com/aY9gpoZ.jpg",
            "https://i.imgur.com/lReS4Xq.jpg",
            "https://i.imgur.com/sjjc715.jpg",
            "https://i.imgur.com/MsVHVCH.jpg",
            "https://i.imgur.com/JcZD3cF.jpg",
            "https://i.imgur.com/VAnBLZN.jpg",
        ],
        [pexel(327482), pexel(325185), pexel(310452)],
    ],

    cameraTapped: false,
    tapCamera: (isTapped) => set({ cameraTapped: isTapped }),
}));

export default useImageState;
