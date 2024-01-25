import React from "react";
import Frames from "./components/frames";
import { MeshReflectorMaterial, Environment } from "@react-three/drei";
import images from "./images";

const GalleryScene = () => {
    return (
        <>
            <color attach="background" args={["#191920"]} />
            <fog attach="fog" args={["#191920", 0, 15]} />
            <group position={[0, -0.5, 0]}>
                <Frames images={images} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                    <planeGeometry args={[50, 50]} />
                    <MeshReflectorMaterial
                        blur={[300, 100]}
                        resolution={2048}
                        mixBlur={1}
                        mixStrength={50}
                        roughness={1}
                        depthScale={1.2}
                        minDepthThreshold={0.4}
                        maxDepthThreshold={1.4}
                        color="#050505"
                        metalness={0.5}
                    />
                </mesh>
            </group>
            <Environment preset="city" />
        </>
    );
};

export default GalleryScene;
