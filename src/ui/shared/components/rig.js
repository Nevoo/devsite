import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

export const Rig = () => {
    useFrame((state, delta) => {
        const cameraPos = [
            Math.sin(-state.pointer.x) * 5,
            state.pointer.y * 3.5,
            15 + Math.cos(state.pointer.x) * 10,
        ];

        easing.damp3(state.camera.position, cameraPos, 0.2, delta);
        state.camera.lookAt(0, 0, 0);
    });
};
