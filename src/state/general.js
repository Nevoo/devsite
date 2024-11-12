import { create } from "zustand";

const useGeneralState = create((set, get) => ({
    scrollDistance: 0,
    setScrollDistance: (distance) => set({ scrollDistance: distance }),
    index: 0,
    setIndex: (index) => set({ index }),
}));

const galleryBase = "/images";

const gallery = (id, category) =>
    `${galleryBase}/${category}/gallery/DSC${id}.jpeg`;

const cover = (category) => `${galleryBase}/${category}/cover.jpeg`;

const verticalScale = [16, 9, 0];
export const useProjectState = create((set, get) => ({
    projects: [
        {
            imageUrl: cover("animals"),
            title: "aNimAlS",
            images: [
                { url: gallery("00880", "animals"), scale: verticalScale },
                { url: gallery("8270", "animals"), scale: verticalScale },
            ], // animals
        },
        {
            imageUrl: cover("nature"),
            title: "NaTurE",
            images: [
                { url: gallery("03694", "nature"), scale: verticalScale },
                { url: gallery("03828", "nature"), scale: verticalScale },
                { url: gallery("03830", "nature"), scale: verticalScale },
                { url: gallery("03855", "nature"), scale: verticalScale },
                { url: gallery("03588", "nature"), scale: verticalScale },
                { url: gallery("8162", "nature"), scale: verticalScale },
            ], // nature
        },
        {
            imageUrl: cover("travel"),
            title: "TraVel",
            images: [
                { url: gallery("03743", "travel"), scale: verticalScale },
                { url: gallery("03700", "travel"), scale: verticalScale },
                { url: gallery("03862", "travel"), scale: verticalScale },
                { url: gallery("03816", "travel"), scale: verticalScale },
                { url: gallery("8251", "travel"), scale: verticalScale },
            ], // travel
        },
        {
            imageUrl: cover("street"),
            title: "StReeT",
            images: [
                { url: gallery("05320", "street"), scale: verticalScale },
                { url: gallery("05299", "street"), scale: verticalScale },
                { url: gallery("03647", "street"), scale: verticalScale },
            ], // street
        },
        {
            imageUrl: cover("concerts"),
            title: "CoNceRtS",
            images: [
                { url: gallery("04137", "concerts"), scale: verticalScale },
                { url: gallery("04159", "concerts"), scale: verticalScale },
                { url: gallery("04230", "concerts"), scale: verticalScale },
                { url: gallery("04248", "concerts"), scale: verticalScale },
                { url: gallery("04330", "concerts"), scale: verticalScale },
                { url: gallery("04360", "concerts"), scale: verticalScale },
            ], // concerts
        },
        {
            imageUrl: cover("weddings"),
            title: "WeDdiNgS",
            images: [
                { url: gallery("02799", "weddings"), scale: verticalScale },
                { url: gallery("02640", "weddings"), scale: verticalScale },
                { url: gallery("02729", "weddings"), scale: verticalScale },
                { url: gallery("02936", "weddings"), scale: verticalScale },
                { url: gallery("02847", "weddings"), scale: verticalScale },
                { url: gallery("02597", "weddings"), scale: verticalScale },
            ], // weddings
        },
        // {
        //     imageUrl: cover("street"),
        //     title: "StReeT",
        //     images: [
        //         { url: gallery("05320", "street"), scale: verticalScale },
        //         { url: gallery("05299", "street"), scale: verticalScale },
        //         { url: gallery("03647", "street"), scale: verticalScale },
        //     ], // street
        // },
    ],
    setProjects: (projects) => set({ projects }),
}));

export default useGeneralState;
