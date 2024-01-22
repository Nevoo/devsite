import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

export const Rig = () => {
    useFrame((state, delta) => {
        easing.damp3(
            state.camera.position,
            [
                Math.sin(-state.pointer.x) * 5,
                state.pointer.y * 3.5,
                15 + Math.cos(state.pointer.x) * 10,
            ],
            0.2,
            delta
        );
        state.camera.lookAt(0, 0, 0);
    });
};
