import { useFrame } from "@react-three/fiber";
import { easing } from "maath";

import useRigState from "../global-state/rig-state";

export const Rig = () => {
    const isRigActive = useRigState((state) => state.isRigActive);

    useFrame((state, delta) => {
        if (isRigActive) {
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
        } else {
            state.camera.position.set(0, 0, 20);
        }
    });
};
