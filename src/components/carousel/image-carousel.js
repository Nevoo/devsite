import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Image } from "@react-three/drei";
import "./bent-plane-geometry";
import { easing } from "maath";
import useGeneralState, { useProjectState } from "@/src/state/general";
import {
    useAnimationFrame,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";
import { motion } from "framer-motion-3d";
import { Exo_2 } from "next/font/google";

export const ImageCarousel = () => {
    return <Carousel position={[0, -0.13, -0.4]} rotation={[0, 0, 0]} />;
};

function Carousel({ snapThreshold = 0.2, ...props }) {
    const projects = useProjectState((state) => state.projects);
    const count = projects.length;

    const { scrollYProgress } = useScroll();
    const setScrollDistance = useGeneralState(
        (state) => state.setScrollDistance
    );
    const { viewport } = useThree();

    const responsiveRadius = useMemo(() => {
        return Math.min(viewport.width, viewport.height) * 0.5;
    }, [viewport]);

    const setCurrentIndex = useGeneralState((state) => state.setIndex);

    const rawDistance = useTransform(scrollYProgress, [0, 1], [0, 2 * Math.PI]);
    const snapDistance = useTransform(rawDistance, (value) => {
        const snapPoints = Array.from(
            { length: count },
            (_, i) => (i / count) * 2 * Math.PI
        );

        const mobileOffset = viewport.width < 768 ? Math.PI / count : 0;
        const adjustedValue = value + mobileOffset;

        const closest = snapPoints.reduce((prev, curr) =>
            Math.abs(curr - adjustedValue) < Math.abs(prev - adjustedValue)
                ? curr
                : prev
        );

        const index = snapPoints.indexOf(closest);

        setCurrentIndex(index);

        return closest - mobileOffset;
    });

    const springDistance = useSpring(snapDistance, {
        stiffness: 200,
        damping: 20,
    });

    useMotionValueEvent(springDistance, "change", (latest) => {
        setScrollDistance(latest);
    });

    const anglePerImage = (2 * Math.PI) / count;

    return (
        <motion.group {...props} rotation-y={springDistance}>
            {Array.from({ length: count }, (_, i) => {
                const angle = (i / count) * 2 * Math.PI;

                return (
                    <Card
                        key={i}
                        index={i}
                        url={projects[i].imageUrl}
                        position={[
                            Math.sin(angle) * responsiveRadius,
                            0,
                            Math.cos(angle) * responsiveRadius,
                        ]}
                        rotation={[0, Math.PI + (i / count) * Math.PI * 2, 0]}
                    />
                );
            })}
        </motion.group>
    );
}

function Card({ url, ...props }) {
    const ref = useRef();
    const [hovered, hover] = useState(false);
    const pointerOver = (e) => (e.stopPropagation(), hover(true));
    const pointerOut = () => hover(false);

    useFrame((state, delta) => {
        easing.damp(
            ref.current.material,
            "zoom",
            hovered ? 1 : 1.5,
            0.2,
            delta
        );
    });

    return (
        <Image
            ref={ref}
            url={url}
            transparent
            side={THREE.DoubleSide}
            onClick={(e) => {
                e.stopPropagation();
                // TODO: transition to gallery view
                // maybe through viewfinder of camera?
                console.log(props.index);
            }}
            onPointerOver={pointerOver}
            onPointerOut={pointerOut}
            radius={0.05}
            {...props}
        >
            <bentPlaneGeometry args={[0.1, 1.3, 1, 20, 20]} />
        </Image>
    );
}
