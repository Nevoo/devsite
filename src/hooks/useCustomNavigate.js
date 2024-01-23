import { createContext, useContext, useEffect, useState } from "react";
import { routes } from "../routing/routes";
import {
    matchPath,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
import { useView } from "../routing/view-context";
import useCameraTransitionState from "../global-state/model-state";

export const useMoveCamera = () => {
    const { pathname } = useLocation();

    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);

    useEffect(() => {
        switch (pathname) {
            case routes.home:
                setPosition([-0.02, -0.01, 0.02]);
                setScale(150);

                document.title = "rouvens.work";
                break;
            case routes.about:
                setPosition([6.5, 6, 0]);
                setScale(20);
                document.title = "About";
                break;
            case routes.contact:
                setPosition([6.5, 6, 0]);
                setScale(20);
                document.title = "Contact";
                break;
            default:
                const match = matchPath(
                    {
                        path: routes.gallery,
                        exact: true,
                        strict: false,
                    },
                    pathname
                );

                if (match) {
                    setPosition([-7.2, 6.2, 0]);
                    setScale(10);
                    document.title = "Gallery";
                    break;
                }

                setPosition([-0.02, -0.01, 0.02]);
                setScale(150);
                document.title = "rouvens.work";
                break;
        }
        // setCount((count) => count + 1);
    }, [pathname]);
};
