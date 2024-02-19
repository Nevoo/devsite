import { create } from "zustand";

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

// TODO: all this should be handled through a cms, s3 bucket or something
const useImageState = create((set) => ({
    categories: [
        { image: pexel(911738), title: "black mist" },
        { image: pexel(416430), title: "weddings" },
        { image: pexel(310452), title: "events" }, // bytabo events future & beer
        { image: pexel(911738), title: "travel" }, // bali, lisbon
        { image: pexel(327482), title: "street" }, // nordtrip mixed with travel
        { image: pexel(327482), title: "concerts" },
        { image: pexel(310452), title: "animals" }, // zoe
        { image: pexel(327482), title: "nature" },
    ],
    // index is the id of the category
    images: [
        [
            { url: "https://i.imgur.com/clGfTlK.jpg", scale: [2, 3, 0] },
            { url: "https://i.imgur.com/i0Nz97X.jpg", scale: [3, 2, 0] },
            { url: "https://i.imgur.com/FuT4pPb.jpg", scale: [3, 2, 0] },
            { url: "https://i.imgur.com/56cuB60.jpg", scale: [2, 3, 0] },
            { url: "https://i.imgur.com/aY9gpoZ.jpg", scale: [3, 2, 0] },
            { url: "https://i.imgur.com/lReS4Xq.jpg", scale: [2, 3, 0] },
            { url: "https://i.imgur.com/sjjc715.jpg", scale: [2, 3, 0] },
            { url: "https://i.imgur.com/MsVHVCH.jpg", scale: [2, 3, 0] },
            { url: "https://i.imgur.com/JcZD3cF.jpg", scale: [2, 3, 0] },
            { url: "https://i.imgur.com/VAnBLZN.jpg", scale: [3, 2, 0] },
        ],
        [
            { url: pexel(327482), scale: [3, 2, 0] },
            { url: pexel(325185), scale: [3, 2, 0] },
            { url: pexel(310452), scale: [3, 2, 0] },
        ],
    ],

    cameraTapped: false,
    tapCamera: (isTapped) => set({ cameraTapped: isTapped }),
    galleryOpened: false,
    setGalleryOpen: (isTapped) => set({ galleryOpened: isTapped }),
}));

export default useImageState;
