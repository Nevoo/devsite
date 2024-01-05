import { useFrame, useThree } from "@react-three/fiber";
import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { suspend } from "suspend-react";
import { CurvedPlane } from "./curved-plane/curved-plane";
import { easing } from "maath";
import { config, animated, useSpring } from "@react-spring/three";

const inter = import("@pmndrs/assets/fonts/inter_extra_bold.woff");

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

export const OrbitImages = ({ radius }) => {
    const [angle, setAngle] = useState(0); // Define a state for the rotation angle
    const [hovered, setHovered] = useState(null);

    useFrame((state, delta) => {
        // Increment the rotation angle based on the delta time
        setAngle((prevAngle) => prevAngle + delta * 0.1);
    });

    const images = [
        { image: pexel(911738), title: "category 1" },
        { image: pexel(416430), title: "category 2" },
        { image: pexel(310452), title: "category 3" },
        { image: pexel(911738), title: "category 4" },
        { image: pexel(327482), title: "category 5" },
        { image: pexel(325185), title: "category 6" },
        { image: pexel(911738), title: "category 7" },
        { image: pexel(358574), title: "category 8" },
        { image: pexel(227675), title: "category 9" },
        { image: pexel(911738), title: "category 10" },
        { image: pexel(1738986), title: "category 11" },
    ];

    const calculatePosition = (index) => {
        return angle + (index * 2 * Math.PI) / images.length;
    };

    return (
        <mesh>
            {images.map((imageData, index) => {
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
                            position={position}
                            rotation={rotation}
                            imageData={imageData}
                            hovered={hovered === index}
                        />
                        <CategoryTitle
                            position={position}
                            rotation={rotation}
                            title={imageData.title}
                            hovered={hovered === index}
                        />
                    </group>
                );
            })}
        </mesh>
    );
};

const CategoryTitle = ({ hovered, title, position, rotation }) => {
    const { fontSize, color } = useSpring({
        fontSize: hovered ? 0.7 : 0.6,
        color: hovered ? "black" : "white",
        config: config.wobbly,
    });

    const AnimatedText = animated(Text);

    return (
        <AnimatedText
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
