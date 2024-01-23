export const routes = {
    home: "/",
    about: "/about",
    contact: "/contact",
    gallery: "/gallery/:id",
};

export const transitionObjects = Object.entries(routes).map(([key, value]) => {
    return { to: value };
});
