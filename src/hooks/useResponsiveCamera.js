import { useEffect } from "react";
import { useCameraState } from "../state/camera";
import { useShallow } from "zustand/react/shallow";
import { useThree } from "@react-three/fiber";

export const useResponsiveCamera = () => {
    const { viewport, size } = useThree((state) => state);

    const { setScale, setPosition, setRotation, scale } = useCameraState(
        useShallow((state) => ({
            setScale: state.setScale,
            setPosition: state.setPosition,
            setRotation: state.setRotation,
            scale: state.scale,
        }))
    );

    useEffect(() => {
        if (size.width > 1000 && size.height > 700) {
            setPosition([2, 0.1, -5]);
            setScale(viewport.width / 4);
            setRotation([0, Math.PI / 3, 0]);
        } else {
            setPosition([
                viewport.width / 2 - scale,
                viewport.height / 2 - 2,
                -5,
            ]);
            setScale(1.2);
            setRotation([0, Math.PI / 2, 0]);
        }
    }, [viewport, size, scale]);
};
