import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";

const Template = () => {
    return (
        <Canvas>
            <Suspense fallback={null}>
                <OrbitControls />
                <ambientLight intensity={1} />
                <spotLight position={[10, 15, 10]} angle={0.3} />
                <directionalLight position={[0, 1, 0]} castShadow={true} />
                <pointLight position={[0, 300, 500]} />
            </Suspense>
        </Canvas>
    );
}

export default Template;