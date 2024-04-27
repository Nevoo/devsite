import { useEffect } from "react";
import { routes } from "../routing/routes";
import { matchPath, useLocation } from "react-router-dom";
import useCameraTransitionState from "../global-state/model-state";
import { useThree } from "@react-three/fiber";
import useImageState from "../ui/views/landing-view/state/image-state";

export const useMoveCamera = () => {
    const { pathname } = useLocation();
    const { viewport, size } = useThree((state) => state);

    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);
    const setRotation = useCameraTransitionState((state) => state.setRotation);
    const setDisplayHeadlines = useCameraTransitionState(
        (state) => state.setDisplayHeadlines
    );
    const setGalleryOpen = useImageState((state) => state.setGalleryOpen);

    useEffect(() => {
        let scale = 0;
        switch (pathname) {
            case routes.home:
                scale = 0.5;
                setPosition([0, 0, 0]);
                setScale(scale);
                setRotation([0, 4, 0]);
                setDisplayHeadlines(true);
                document.title = "rouvens.work";
                setGalleryOpen(false);
                break;
            case routes.about:
                setGalleryOpen(false);
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
                setGalleryOpen(false);
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
            case routes.privacy:
                setDisplayHeadlines(false);
                setGalleryOpen(false);
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
                document.title = "Privacy";
                break;
            default:
                setDisplayHeadlines(false);
                setGalleryOpen(false);
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
                    setGalleryOpen(true);

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
