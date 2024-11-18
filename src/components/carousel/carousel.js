import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Image, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";
import { useProjectState } from "@/src/state/general";

export const Slider = () => {
    const groupRef = useRef();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const spacing = 16.5;
    const projects = useProjectState((state) => state.projects);
    const [manualOffset, setManualOffset] = useState(0);

    // Spring animation for smooth sliding
    const [springs, api] = useSpring(() => ({
        position: 0,
        config: { mass: 1, tension: 280, friction: 60 },
    }));

    const clampIndex = (index) => {
        return Math.max(0, Math.min(index, projects.length - 1));
    };

    const snapToNearestSlide = (offset) => {
        const slideThreshold = spacing * 0.3; // 30% of slide width for snap threshold
        const normalizedOffset = offset / spacing;
        const nearestSlide = Math.round(normalizedOffset);

        if (Math.abs(normalizedOffset - nearestSlide) > slideThreshold) {
            const newIndex = clampIndex(currentIndex - Math.sign(offset));
            setCurrentIndex(newIndex);
        }
        setManualOffset(0);
    };

    // Handle wheel scrolling
    const handleWheel = (event) => {
        const scrollSensitivity = 0.01;
        const newOffset = manualOffset + event.deltaY * scrollSensitivity;
        setManualOffset(newOffset);
        snapToNearestSlide(newOffset);
    };

    // Handle drag interactions
    const handlePointerDown = (event) => {
        setIsDragging(true);
        setStartX(event.clientX);
    };

    const handlePointerUp = () => {
        if (isDragging) {
            snapToNearestSlide(manualOffset);
            setIsDragging(false);
        }
    };

    const handlePointerMove = (event) => {
        if (!isDragging) return;

        const deltaX = event.clientX - startX;
        const sensitivity = 0.01;
        const newOffset = deltaX * sensitivity;
        setManualOffset(newOffset);
        setStartX(event.clientX);
    };

    // Update spring when currentIndex or manualOffset changes
    useEffect(() => {
        api.start({
            position: -currentIndex * spacing + manualOffset,
        });
    }, [currentIndex, manualOffset, api]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") {
                setCurrentIndex((prev) => clampIndex(prev + 1));
                setManualOffset(0);
            }
            if (e.key === "ArrowLeft") {
                setCurrentIndex((prev) => clampIndex(prev - 1));
                setManualOffset(0);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <animated.group
            ref={groupRef}
            position-x={springs.position}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerMove={handlePointerMove}
        >
            {projects.map((project, index) => (
                <Image
                    rotation={[0, -Math.PI / 2, 0]}
                    key={index}
                    url={project.imageUrl}
                    position={[index * spacing, -0.15, -0.5]}
                >
                    <planeGeometry args={[16 * 0.17, 9 * 0.17, 4, 4]} />
                </Image>
            ))}
        </animated.group>
    );
};
