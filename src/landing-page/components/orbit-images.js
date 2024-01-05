import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useState } from "react";
import { Text } from "@react-three/drei";
import { suspend } from "suspend-react";
import { CurvedPlane } from "./curved-plane/curved-plane";
import { easing } from "maath";
import {
    config,
    animated,
    useSpring,
    useTransition,
    useChain,
    useTrail,
} from "@react-spring/three";
import useImageState from "../state/image-state";
import { useShallow } from "zustand/react/shallow";

const inter = import("@pmndrs/assets/fonts/inter_extra_bold.woff");

export const OrbitImages = ({ radius, images }) => {
    const [angle, setAngle] = useState(0); // Define a state for the rotation angle
    const [hovered, setHovered] = useState(null);

    const { cameraTapped, tapCamera } = useImageState(
        useShallow((state) => ({
            cameraTapped: state.cameraTapped,
            tapCamera: state.tapCamera,
        }))
    );

    useFrame((state, delta) => {
        // Increment the rotation angle based on the delta time
        if (cameraTapped) {
            setAngle((prevAngle) => prevAngle + delta * 0.1);
        }
    });

    useEffect(() => {
        // if (cameraTapped) {
        //     transApi.start();
        // }
    }, [cameraTapped]);

    const calculatePosition = (index) => {
        return angle + (index * 2 * Math.PI) / images.length;
    };

    const trail = useTrail(images.length, {
        config: {
            mass: 5,
            friction: 200,
            tension: 2000,
        },
        positionOffset: cameraTapped ? 0 : 100,
        rotationOffset: cameraTapped ? 0 : 15,
        scale: cameraTapped ? 5 : 0,
        fontScale: cameraTapped ? 1 : 0,
        from: {
            positionOffset: 100,
            rotationOffset: 15,
            scale: 0,
            fontScale: 0,
        },
    });

    return (
        <>
            {trail.map(({ ...style }, index) => {
                const imageData = images[index];
                let position = [
                    radius * Math.sin(calculatePosition(index)),
                    0,
                    radius * Math.cos(calculatePosition(index)),
                ];

                let rotation = [0, calculatePosition(index), 0];

                return (
                    <group
                        key={index}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            setHovered(index);
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            setHovered(null);
                        }}
                    >
                        <CurvedPlane
                            position={style.positionOffset.to((offset) => [
                                position[0],
                                position[1] + offset,
                                position[2] + offset,
                            ])}
                            hovered={hovered === index}
                            transitionScale={style.scale.to((x) => x)}
                            rotation={style.rotationOffset.to((offset) => [
                                rotation[0] + offset,
                                rotation[1],
                                rotation[2] + offset,
                            ])}
                            imageData={imageData}
                            index={index}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                tapCamera(false);
                            }}
                        />
                        <CategoryTitle
                            scale={style.fontScale.to((x) => x)}
                            position={position}
                            rotation={rotation}
                            title={imageData.title}
                            hovered={hovered === index}
                        />
                    </group>
                );
            })}
        </>
    );
};

const CategoryTitle = ({ hovered, title, position, rotation, scale }) => {
    const { fontSize, color } = useSpring({
        fontSize: hovered ? 0.7 : 0.6,
        color: hovered ? "black" : "white",
        config: config.wobbly,
    });

    const AnimatedText = animated(Text);

    return (
        <AnimatedText
            scale={scale}
            fontSize={fontSize}
            font={suspend(inter).default}
            color={color}
            position={[position[0], position[1] - 3, position[2] + 0.3]}
            rotation={rotation}
        >
            {title}
        </AnimatedText>
    );
};
