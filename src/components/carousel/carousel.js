import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Image, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";
import { useProjectState } from "@/src/state/general";

const ImagePlane = ({ texture, position, ...props }) => {
    return (
        <mesh position={position} {...props} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[16 * 0.2, 9 * 0.2, 4, 4]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
    );
};

// Pexel images
const imageIds = [
    1103970, 416430, 310452, 327482, 325185, 358574, 227675, 911738, 1738986,
];
const imageUrls = imageIds.map(
    (id) =>
        `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`
);

export const Slider = () => {
    const groupRef = useRef();
    const [currentIndex, setCurrentIndex] = useState(0);
    const spacing = 16.5; // Width + gap between images

    // Load all textures at once using drei's useTexture
    const textures = useTexture(imageUrls);

    const projects = useProjectState((state) => state.projects);

    // Spring animation for smooth sliding
    const [springs, api] = useSpring(() => ({
        position: 0,
        config: { mass: 1, tension: 280, friction: 60 },
    }));

    const nextSlide = () => {
        if (currentIndex < imageIds.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const previousSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    // Update spring when currentIndex changes
    useEffect(() => {
        api.start({
            position: -currentIndex * spacing,
        });
    }, [currentIndex, api]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") nextSlide();
            if (e.key === "ArrowLeft") previousSlide();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex]);

    return (
        <animated.group ref={groupRef} position-x={springs.position}>
            {projects.map((project, index) => (
                <Image
                    rotation={[0, -Math.PI / 2, 0]}
                    key={imageIds[index]}
                    url={project.imageUrl}
                    position={[index * spacing, -0.15, -0.5]}
                >
                    <planeGeometry args={[16 * 0.17, 9 * 0.17, 4, 4]} />
                </Image>
                // <ImagePlane
                //     key={imageIds[index]}
                //     texture={texture}
                //     position={[index * spacing, 0, 0]}
                // />
            ))}
        </animated.group>
    );
};
