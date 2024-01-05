import React, { Suspense } from "react";
import "./index.css";
import {
    Float,
    Lightformer,
    ContactShadows,
    Environment,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { Camera } from "../components/blender-models/camera_glb";
import { OrbitImages } from "./components/orbit-images";
import { useLenis } from "@studio-freight/react-lenis";
import { a, animated, config, useTransition } from "@react-spring/three";
import useImageState from "./state/image-state";
import { useShallow } from "zustand/react/shallow";

export const CameraLandingPage = (props) => {
    const images = useImageState((state) => state.images);
    const cameraTapped = useImageState((state) => state.cameraTapped);
    const tapCamera = useImageState((state) => state.tapCamera);

    return (
        <group>
            <spotLight
                position={[20, 20, 10]}
                penumbra={1}
                castShadow
                angle={0.2}
            />
            <Float floatIntensity={1}>
                <Camera
                    scale={150}
                    rotation={[0, -2, 0]}
                    position={[1, 4, 0]}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        tapCamera(true);
                    }}
                />
                <OrbitImages radius={10} images={images} />
            </Float>
            <ContactShadows
                scale={200}
                position={[0, -10, 0]}
                blur={1}
                far={100}
                opacity={0.85}
            />
            <Environment preset="city">
                <Lightformer
                    intensity={8}
                    position={[10, 5, 0]}
                    scale={[10, 50, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
            </Environment>
            <Rig />
        </group>
    );
};

function Rig() {
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
}
