import vertexShader from "./vertexShader";
import fragmentShader from "./fragmentShader";

import { useThree, useLoader } from "@react-three/fiber";

import { TextureLoader, Vector2, Vector4 } from "three";
import { useSpring, animated, config } from "@react-spring/three";

import React from "react";

export const CurvedPlane = ({
    imageData,
    position,
    rotation,
    hovered,
    transitionScale,
    index,
    ...props
}) => {
    const { mouse, width } = useThree((state) => state);
    const texture = useLoader(TextureLoader, imageData.image);

    const { scale } = useSpring({
        scale: hovered ? 5.5 : transitionScale,
        config: config.stiff,
    });

    return (
        <animated.mesh
            position={position}
            scale={scale}
            rotation={rotation}
            {...props}
        >
            <planeGeometry args={[1, 1, 32, 32]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                args={[
                    {
                        uniforms: {
                            time: { value: 1.0 },
                            roundMedia: { value: 1 },
                            uSpeed: { value: 0.03 },
                            uTextureSize: { value: new Vector2(150, 100) },
                            uTexture: { value: texture },
                            uCorners: { value: new Vector4(0, 0, 0, 0) },
                            uResolution: {
                                value: new Vector2(width, width),
                            },
                            uQuadSize: { value: new Vector2(450, 300) },
                            uAlpha: { value: 1 },
                            uProgressHover: { value: 1.5 },
                            uProgressClick: { value: 0 },
                            uMouse: { value: mouse },
                        },
                        transparent: !0,
                        side: 2,
                        defines: {
                            PI: Math.PI,
                            PR: window.devicePixelRatio.toFixed(1),
                        },
                    },
                ]}
            />
        </animated.mesh>
    );
};
