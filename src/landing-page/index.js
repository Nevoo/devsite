import { useFrame } from "@react-three/fiber";

import React from "react";
import "./index.css";
import {
    Float,
    Lightformer,
    ContactShadows,
    Environment,
} from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { easing } from "maath";

import { Camera } from "../components/blender-models/camera_glb";
import { OrbitImages } from "./components/orbit-images";

export const CameraLandingPage = (props) => (
    <>
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
            ></Camera>
            <OrbitImages radius={10} />
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

        <EffectComposer disableNormalPass>
            <N8AO aoRadius={1} intensity={2} />
            {/* <TiltShift2 blur={0.2} /> */}
        </EffectComposer>
        <Rig />
    </>
);

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
