"use client";

import {
    ContactShadows,
    Environment,
    Float,
    MeshReflectorMaterial,
    OrbitControls,
    PivotControls,
    Stage,
    useHelper,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import CameraNew from "./Model";
import * as THREE from "three";

import { TextCarousel } from "./TextCarousel";

import Rig from "./Rig";
import { useRef } from "react";
import { ModelUpdated } from "./ModelUpdated";
import NavigationMenu from "./NavigationMenu";
import { Controls, Slider } from "./carousel/carousel";
import { Bloom, DepthOfField, EffectComposer } from "@react-three/postprocessing";

export default function Scene() {
    return (
        <div className="container">
            <Canvas
                // position gets overriden by rig component
                camera={{ position: [0, 0, 4], fov: 40, far: 10 }}
                // gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
                // linear
            >
                <color attach="background" args={['black']} />
                <Lights />
                {/* <OrbitControls /> */}
                
                {/* <TextCarousel /> */}
                <Float floatIntensity={0.5} rotationIntensity={0.5}>
                    {/* <PivotControls> */}
                        <CameraNew />
                    {/* </PivotControls> */}
                </Float>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
                    <planeGeometry args={[50, 50]} />
                    <MeshReflectorMaterial
                        blur={[500, 10]}
                        resolution={2048}
                        mixBlur={1}
                        mixStrength={180}
                        roughness={1}
                        depthScale={1.5}
                        minDepthThreshold={0.1}
                        maxDepthThreshold={2}
                        color="#202020"
                        metalness={1}
                    />
                </mesh>
                <EffectComposer disableNormalPass>
                    <Bloom luminanceThreshold={0} mipmapBlur luminanceSmoothing={0.0} intensity={1} />
                    <DepthOfField target={[0, 0, 0]} focalLength={5} bokehScale={15} height={700} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}

function Lights() {
    const directionalLightRef = useRef();

    // useHelper(directionalLightRef, THREE.DirectionalLightHelper);

    return (
        <group>
            <pointLight distance={2} intensity={2} position={[1, 0, 0]} color="orange" />
             {/* <hemisphereLight intensity={0.15} groundColor="black" /> */}
             <spotLight decay={0} position={[10, 20, 10]} angle={0.12} penumbra={1} intensity={1} castShadow shadow-mapSize={1024} />

            {/* <ambientLight intensity={Math.PI} /> */}
            <directionalLight
                ref={directionalLightRef}
                position={[-5, 1, 20]}
                angle={0.1}
                intensity={Math.PI * 0.05}
            />
            {/* <Environment preset="city" blur={1} /> */}
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
