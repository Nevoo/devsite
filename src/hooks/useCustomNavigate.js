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
import { useThree } from "@react-three/fiber";

export const useMoveCamera = () => {
    const { pathname } = useLocation();
    const { width, height } = useThree((state) => state.viewport);

    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);

    useEffect(() => {
        const aspectRatio = width / height;

        switch (pathname) {
            case routes.home:
                setPosition([-0.02, -0.01, 0.02]);
                setScale(aspectRatio * 10);
                document.title = "rouvens.work";
                break;
            case routes.about:
                setPosition([1.8, 1.7, 0]);
                setScale(aspectRatio * 5);
                document.title = "About";
                break;
            case routes.contact:
                setPosition([1.8, 1.7, 0]);
                setScale(aspectRatio * 5);
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
                    setPosition([-2.7, 1.75, 0]);
                    // setPosition([1, 0, 0]);
                    setScale(aspectRatio * 2);
                    document.title = "Gallery";
                    break;
                }

                setPosition([-0.02, -0.01, 0.02]);
                setScale(aspectRatio * 10);
                document.title = "rouvens.work";
                break;
        }
    }, [pathname, width, height]);
};
