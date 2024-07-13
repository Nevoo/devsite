export const routes = {
    home: "/",
    about: "/about",
    contact: "/contact",
    gallery: "/gallery/:id",
    mobileGallery: "/mgallery/:id",
    privacy: "/privacy",
};

export const transitionObjects = Object.entries(routes).map(([key, value]) => {
    return { to: value };
});
