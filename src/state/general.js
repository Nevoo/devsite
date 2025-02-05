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
      imageUrl: "/videos/landing.mp4",
      title: "Exploring Kuala Lumpur",
      type: "video",
      videoUrl: "/videos/landing.mp4",
      description: "Video Project 1",
    },
    // {
    //   imageUrl: "/videos/project2/cover.jpg",
    //   title: "Bali Beach",
    //   type: "video",
    //   videoUrl: "/videos/project2/main.mp4",
    //   description: "Video Project 2",
    // },
    // {
    //   imageUrl: "/videos/project3/cover.jpg",
    //   title: "My Journey through 2024",
    //   type: "video",
    //   videoUrl: "/videos/project3/main.mp4",
    //   description: "Video Project 3",
    // },
    {
      imageUrl: cover("photography"),
      title: "Photography",
      type: "gallery",
      images: [
        { url: gallery("00880", "animals"), scale: verticalScale },
        { url: gallery("8270", "animals"), scale: verticalScale },
        { url: gallery("03694", "nature"), scale: verticalScale },
        { url: gallery("03828", "nature"), scale: verticalScale },
        { url: gallery("03830", "nature"), scale: verticalScale },
        { url: gallery("03743", "travel"), scale: verticalScale },
        { url: gallery("03700", "travel"), scale: verticalScale },
        { url: gallery("03862", "travel"), scale: verticalScale },
      ],
    },
  ],
  setProjects: (projects) => set({ projects }),
}));

export const useFloorState = create((set, get) => ({
  floorY: 0,
  setFloor: (floorY) => set({ floorY }),
}));

export default useGeneralState;
