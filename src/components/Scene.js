"use client";

import { Environment, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import CameraNew from "./Model";
import * as THREE from "three";
import { useEffect, useRef, useMemo, forwardRef, useState } from "react";
import useGeneralState from "../state/general";
import { ImageCarousel } from "./carousel/image-carousel";
import { useSpring, animated, useTransition } from "@react-spring/three";
import { TextCarousel } from "./TextCarousel";

export default function Scene() {
    return (
        <div className={"container"}>
            <Canvas
                // position gets overriden by rig component
                camera={{ position: [0, 0, 15], fov: 20, far: 50 }}
                gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
                linear
            >
                {/* <Environment preset="city" /> */}
                <directionalLight position={[0, 5, 10]} intensity={10} />
                <ambientLight intensity={Math.PI} />
                <TextCarousel />
                <CameraNew
                    rotation={[0, Math.PI / 3, 0]}
                    position={[0, 0, 0]}
                />
                {/* <ImageCarousel /> */}
                {/* <OrbitControls /> */}
            </Canvas>
        </div>
    );
}
