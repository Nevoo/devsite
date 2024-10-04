import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useRef } from "react";
import { useScroll } from "@react-three/drei";

export default function Rig(props) {
    const ref = useRef();
    const scroll = useScroll();

    useFrame((state, delta) => {
        // ref.current.rotation.y = -scroll.offset * (Math.PI * 2); // Rotate contents
        // state.events.update(); // Raycasts every frame rather than on pointer-move
        easing.damp3(
            state.camera.position,
            [-state.pointer.x * 2, state.pointer.y + 1.5, 10],
            0.3,
            delta
        ); // Move camera
        state.camera.lookAt(0, 0, 0); // Look at center
    });

    return <group ref={ref} {...props} />;
}
