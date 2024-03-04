import { create } from "zustand";

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

const galleryBase = 'images/categories';
const gallery = (id, category) => `${galleryBase}/${category}/gallery/DSC${id}.jpeg`; 
const cover = (category) => `${galleryBase}/${category}/cover.jpeg`;

// TODO: all this should be handled through a cms, s3 bucket or something
const useImageState = create((set) => ({
    categories: [
        { image: cover("animals"), title: "animals" }, // zoe
        { image: cover("nature"), title: "nature" },
        { image: cover("travel"), title: "travel" }, // bali, lisbon
        { image: cover("street"), title: "street" }, // nordtrip mixed with travel
        { image: cover("concerts"), title: "concerts" },
        // { image: cover("events"), title: "events" }, // bytabo events future & beer
        // { image: cover("weddings"), title: "weddings" },
    ],
    // index is the id of the category
    images: [
        [
            { url: gallery('00880', 'animals'), scale: [3, 2, 0] },
            { url: gallery('8270', 'animals'), scale: [2, 3, 0] },
        ], // animals
        [
            { url: gallery('03694', 'nature'), scale: [2, 3, 0] },
            { url: gallery('03828', 'nature'), scale: [2, 3, 0] },
            { url: gallery('03830', 'nature'), scale: [3, 2, 0] },
            { url: gallery('03855', 'nature'), scale: [3, 2, 0] },
            { url: gallery('03588', 'nature'), scale: [2, 3, 0] },
            { url: gallery('8162', 'nature'), scale: [2, 3, 0] },
        ], // nature
        [
            { url: gallery('03743', 'travel'), scale: [2, 3, 0] },
            { url: gallery('03700', 'travel'), scale: [2, 3, 0] },
            { url: gallery('03862', 'travel'), scale: [2, 3, 0] },
            { url: gallery('03816', 'travel'), scale: [2, 3, 0] },
            { url: gallery('8251', 'travel'), scale: [3, 2, 0] },
        ], // travel
        [
            { url: gallery('05320', 'street'), scale: [2, 3, 0] },
            { url: gallery('05299', 'street'), scale: [2, 3, 0] },
            { url: gallery('03647', 'street'), scale: [2, 3, 0] },
        ], // street
        [
            { url: gallery('04137', 'concerts'), scale: [3, 2, 0] },
            { url: gallery('04159', 'concerts'), scale: [2, 3, 0] },
            { url: gallery('04230', 'concerts'), scale: [2, 3, 0] },
            { url: gallery('04248', 'concerts'), scale: [3, 2, 0] },
            { url: gallery('04330', 'concerts'), scale: [3, 2, 0] },
            { url: gallery('04360', 'concerts'), scale: [2, 3, 0] },
        ], // concerts
        [
            { url: gallery('09296', 'events'), scale: [3, 2, 0] },
        ], // events
        [], // weddings
    ],

    cameraTapped: false,
    tapCamera: (isTapped) => set({ cameraTapped: isTapped }),
    galleryOpened: false,
    setGalleryOpen: (isTapped) => set({ galleryOpened: isTapped }),
}));

export default useImageState;
