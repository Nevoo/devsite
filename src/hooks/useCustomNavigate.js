import { useEffect, useState } from "react";
import { routes } from "../routing/routes";
import { useLocation, useNavigate } from "react-router-dom";
import { useView } from "../routing/view-context";
import useCameraTransitionState from "../global-state/model-state";

export const useCustomNavigate = () => {
    const navigate = useNavigate();
    useMoveCamera();

    return (to, option) => {
        navigate(to, option);
    };
};

export const useMoveCamera = () => {
    const { pathname } = useLocation();
    const [count, setCount] = useState(0);
    // location.pathname

    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);

    useEffect(() => {
        console.log(pathname);

        switch (pathname) {
            case routes.home:
                if (count !== 0) {
                    setPosition([-0.02, -0.01, 0.02]);
                    setScale(150);
                }
                document.title = "rouvens.work";
                break;
            case routes.about:
                setPosition([19, 8, 0]);
                setScale(20);
                document.title = "About";
                break;
            case routes.contact:
                setPosition([19, 8, 0]);
                setScale(20);
                document.title = "Contact";
                break;
            default:
                setPosition([-0.02, -0.01, 0.02]);
                setScale(150);
                document.title = "rouvens.work";
        }
        setCount((count) => count + 1);
    }, [pathname]);
};
