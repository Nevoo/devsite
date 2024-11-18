"use client";

import {
    ContactShadows,
    Environment,
    Float,
    OrbitControls,
    PivotControls,
    Stage,
    useHelper,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import CameraNew from "./Model";
import * as THREE from "three";

import { TextCarousel } from "./TextCarousel";
import {
    DepthOfField,
    EffectComposer,
    ToneMapping,
} from "@react-three/postprocessing";
import Rig from "./Rig";
import { useRef } from "react";
import { ModelUpdated } from "./ModelUpdated";
import NavigationMenu from "./NavigationMenu";
import { Controls, Slider } from "./carousel/carousel";

export default function Scene() {
    return (
        <div className="container">
            <Canvas
                // position gets overriden by rig component
                camera={{ position: [0, 0, 4], fov: 40, far: 10 }}
                // gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
                // linear
            >
                <Lights />
                {/* <TextCarousel />
                <Float floatIntensity={0.5} rotationIntensity={0}>
                    <ModelUpdated />
                </Float> */}
            </Canvas>
        </div>
    );
}

function Lights() {
    const directionalLightRef = useRef();

    // useHelper(directionalLightRef, THREE.DirectionalLightHelper);

    return (
        <group>
            <ambientLight intensity={Math.PI} />
            <directionalLight
                ref={directionalLightRef}
                position={[-5, 3, 20]}
                angle={0.1}
                intensity={Math.PI * 0.5}
            />
            <Environment preset="city" blur={1} />
            <ContactShadows
                resolution={512}
                position={[0, -0.8, 0]}
                opacity={1}
                scale={10}
                blur={2}
                far={0.8}
            />
        </group>
    );
}
