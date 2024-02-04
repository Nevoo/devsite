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
    const { viewport, size } = useThree((state) => state);

    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);
    const setDisplayHeadlines = useCameraTransitionState(
        (state) => state.setDisplayHeadlines
    );

    useEffect(() => {
        let scale = 0;
        switch (pathname) {
            case routes.home:
                scale = 0.5;
                setPosition([0, 0, 0]);
                setScale(scale);
                setDisplayHeadlines(true);
                document.title = "rouvens.work";
                break;
            case routes.about:
                setDisplayHeadlines(false);
                scale = 0.06;
                if (size.width > 1000 && size.height > 700) {
                    setPosition([
                        viewport.width / 2 - 0.5,
                        viewport.height / 2 - scale * 1.5,
                        -1,
                    ]);
                } else {
                    setPosition([0, viewport.height / 2 - scale * 1, -1]);
                }
                setScale(scale);
                document.title = "About";
                break;
            case routes.contact:
                setDisplayHeadlines(false);

                scale = 0.06;
                if (size.width > 1000 && size.height > 700) {
                    setPosition([
                        viewport.width / 2 - 0.5,
                        viewport.height / 2 - scale * 1.5,
                        -1,
                    ]);
                } else {
                    setPosition([0, viewport.height / 2 - scale * 1, -1]);
                }
                setScale(scale);
                document.title = "Contact";
                break;
            default:
                setDisplayHeadlines(false);

                const match = matchPath(
                    {
                        path: routes.gallery,
                        exact: true,
                        strict: false,
                    },
                    pathname
                );

                if (match) {
                    scale = 0.05;
                    if (size.width > 1000 && size.height > 700) {
                        setPosition([
                            -viewport.width / 2 + 0.8,
                            viewport.height / 2 - scale * 5.8,
                            1,
                        ]);
                    } else {
                        setPosition([0, viewport.height / 2 - scale * 6, 1]);
                    }
                    setScale(scale);
                    document.title = "Gallery";
                    break;
                }

                scale = 0.5;
                setPosition([0, 0, 0]);
                setScale(0.5);
                document.title = "rouvens.work";
                break;
        }
    }, [pathname, viewport, size]);
};
