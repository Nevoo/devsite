export const routes = {
    home: "/",
    about: "/about",
    contact: "/contact",
};

export const transitionObjects = Object.entries(routes).map(([key, value]) => {
    return { to: value };
});
