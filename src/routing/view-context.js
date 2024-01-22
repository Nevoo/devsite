import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useLocation } from "react-router-dom";

export const ViewContext = createContext([
    {
        active: false,
        path: "/",
        updateRoute: () => {},
        viewProps: { delayedTransition: false },
    },
    () => {},
]);

export function ViewProvider({ children }) {
    const location = useLocation();
    const [path, setPath] = useState(location.pathname);
    const [viewProps, setProps] = useState();
    const nextPath = useRef(location.pathname);

    const updateRoute = (path = nextPath.current) => {
        setPath(path);
    };

    const context = useMemo(
        () => ({
            active: path === location.pathname,
            path,
            updateRoute,
            viewProps,
        }),
        [location, viewProps, path]
    );

    useEffect(() => {
        if (!context.viewProps?.delayedTransition) {
            // Immediately change route
            updateRoute(location.pathname);
        } else {
            // Wait for updateRoute() to be called by View component
            nextPath.current = location.pathname;
        }
    }, [context.viewProps?.delayedTransition, location.pathname]);

    return (
        <ViewContext.Provider value={[context, setProps]}>
            {children}
        </ViewContext.Provider>
    );
}

export function useView() {
    const location = useLocation();
    const [context] = useContext(ViewContext);
    const active = context.active;
    const updateRoute = context.updateRoute;

    return useMemo(
        () => ({
            path: context.path,
            updateRoute,
            active,
        }),
        [context.path, location.pathname, updateRoute, active]
    );
}

// Views that have a transition should be wrapped in this
export function View({ children, ...viewProps }) {
    const [_, setProps] = useContext(ViewContext);
    useEffect(() => {
        setProps(viewProps);
        return () => setProps(undefined);
    }, [viewProps.delayedTransition]);
    return children;
}
