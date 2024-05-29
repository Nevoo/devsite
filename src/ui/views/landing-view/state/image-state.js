import { create } from "zustand";

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

const galleryBase = "images/categories";
const gallery = (id, category) =>
    `${galleryBase}/${category}/gallery/DSC${id}.jpeg`;
const cover = (category) => `${galleryBase}/${category}/cover.jpeg`;

const horizontalScale = [3, 2, 0];
const verticalScale = [2, 3, 0];

// TODO: all this should be handled through a cms, s3 bucket or something
const useImageState = create((set) => ({
    categories: [
        { image: cover("animals"), title: "animals" }, // zoe
        { image: cover("nature"), title: "nature" },
        { image: cover("travel"), title: "travel" }, // bali, lisbon
        { image: cover("street"), title: "street" }, // nordtrip mixed with travel
        { image: cover("concerts"), title: "concerts" },
        // { image: cover("events"), title: "events" }, // bytabo events future & beer
        { image: cover("weddings"), title: "weddings" },
    ],
    // index is the id of the category
    images: [
        [
            { url: gallery("00880", "animals"), scale: verticalScale },
            { url: gallery("8270", "animals"), scale: verticalScale },
        ], // animals
        [
            { url: gallery("03694", "nature"), scale: verticalScale },
            { url: gallery("03828", "nature"), scale: verticalScale },
            { url: gallery("03830", "nature"), scale: verticalScale },
            { url: gallery("03855", "nature"), scale: verticalScale },
            { url: gallery("03588", "nature"), scale: verticalScale },
            { url: gallery("8162", "nature"), scale: verticalScale },
        ], // nature
        [
            { url: gallery("03743", "travel"), scale: verticalScale },
            { url: gallery("03700", "travel"), scale: verticalScale },
            { url: gallery("03862", "travel"), scale: verticalScale },
            { url: gallery("03816", "travel"), scale: verticalScale },
            { url: gallery("8251", "travel"), scale: verticalScale },
        ], // travel
        [
            { url: gallery("05320", "street"), scale: verticalScale },
            { url: gallery("05299", "street"), scale: verticalScale },
            { url: gallery("03647", "street"), scale: verticalScale },
        ], // street
        [
            { url: gallery("04137", "concerts"), scale: verticalScale },
            { url: gallery("04159", "concerts"), scale: verticalScale },
            { url: gallery("04230", "concerts"), scale: verticalScale },
            { url: gallery("04248", "concerts"), scale: verticalScale },
            { url: gallery("04330", "concerts"), scale: verticalScale },
            { url: gallery("04360", "concerts"), scale: verticalScale },
        ], // concerts
        // [{ url: gallery("09296", "events"), scale: [3, 2, 0] }], // events
        [
            { url: gallery("02799", "weddings"), scale: verticalScale },
            { url: gallery("02640", "weddings"), scale: verticalScale },
            { url: gallery("02729", "weddings"), scale: verticalScale },
            { url: gallery("02936", "weddings"), scale: verticalScale },
            { url: gallery("02847", "weddings"), scale: verticalScale },
            { url: gallery("02597", "weddings"), scale: verticalScale },
        ], // weddings
    ],

    cameraTapped: false,
    tapCamera: (isTapped) => set({ cameraTapped: isTapped }),
    galleryOpened: false,
    setGalleryOpen: (isTapped) => set({ galleryOpened: isTapped }),
}));

export default useImageState;
