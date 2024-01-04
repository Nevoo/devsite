import { useFrame } from "@react-three/fiber";
import React, { useState } from "react";
import { Text } from "@react-three/drei";
import { suspend } from "suspend-react";
import { CurvedPlane } from "./curved-plane/curved-plane";

const inter = import("@pmndrs/assets/fonts/inter_extra_bold.woff");

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

export const OrbitImages = ({ radius }) => {
    // Define the radius of the orbit
    const [angle, setAngle] = useState(0); // Define a state for the rotation angle

    useFrame((state, delta) => {
        // Increment the rotation angle based on the delta time
        setAngle((prevAngle) => prevAngle + delta * 0.2);
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

    return (
        <>
            {images.map((imageData, index) => {
                let position = [
                    radius *
                        Math.sin(angle + (index * 2 * Math.PI) / images.length),
                    0,
                    radius *
                        Math.cos(angle + (index * 2 * Math.PI) / images.length),
                ];

                let rotation = [
                    0,
                    angle + (index * 2 * Math.PI) / images.length,
                    0,
                ];

                return (
                    <>
                        <CurvedPlane
                            key={index}
                            position={position}
                            rotation={rotation}
                            imageData={imageData}
                        />
                        <Text
                            fontSize={0.6}
                            font={suspend(inter).default}
                            color="white"
                            position={[
                                position[0],
                                position[1] - 3,
                                position[2],
                            ]}
                            rotation={rotation}
                        >
                            {imageData.title}
                        </Text>
                    </>
                );
            })}
        </>
    );
};
