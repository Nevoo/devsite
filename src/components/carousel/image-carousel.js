import * as THREE from "three";
import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Image } from "@react-three/drei";
import "./bent-plane-geometry";
import { easing } from "maath";
import useGeneralState from "@/src/state/general";
import {
    useAnimationFrame,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from "framer-motion";
import { motion } from "framer-motion-3d";

export const ImageCarousel = () => {
    return <Carousel position={[0, -0.13, 0]} />;
};

function Carousel({ radius = 2, count = 7, snapThreshold = 0.2, ...props }) {
    const imageIds = [
        "416430",
        "310452",
        "327482",
        "325185",
        "358574",
        "227675",
        "911738",
        "1738986",
    ];
    const pexel = (id) =>
        `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;

    const { scrollYProgress } = useScroll();
    const setScrollDistance = useGeneralState(
        (state) => state.setScrollDistance
    );
    const setCurrentIndex = useGeneralState((state) => state.setIndex);

    const rawDistance = useTransform(scrollYProgress, [0, 1], [2 * Math.PI, 0]);
    const snapDistance = useTransform(rawDistance, (value) => {
        const snapPoints = Array.from(
            { length: count },
            (_, i) => (i / count) * 2 * Math.PI
        );
        const closest = snapPoints.reduce((prev, curr) =>
            Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
        );

        const index = snapPoints.indexOf(closest);
        setCurrentIndex(index);
        return closest;
    });

    const springDistance = useSpring(snapDistance, {
        stiffness: 200,
        damping: 20,
    });

    useMotionValueEvent(springDistance, "change", (latest) => {
        setScrollDistance(latest);
    });

    return (
        <motion.group {...props} rotation-y={springDistance}>
            {Array.from({ length: count }, (_, i) => (
                <Card
                    key={i}
                    index={i}
                    url={pexel(imageIds[i])}
                    position={[
                        Math.sin((i / count) * Math.PI * 2) * radius,
                        0,
                        Math.cos((i / count) * Math.PI * 2) * radius,
                    ]}
                    rotation={[0, Math.PI + (i / count) * Math.PI * 2, 0]}
                />
            ))}
        </motion.group>
    );
}

function Card({ url, ...props }) {
    const ref = useRef();
    const [hovered, hover] = useState(false);
    const pointerOver = (e) => (e.stopPropagation(), hover(true));
    const pointerOut = () => hover(false);

    useFrame((state, delta) => {
        // easing.damp3(ref.current.scale, hovered ? 1.1 : 1, 0.1, delta);
        // easing.damp(
        //     ref.current.material,
        //     "radius",
        //     hovered ? 0.1 : 0.05,
        //     0.2,
        //     delta
        // );
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
                console.log("clicked", props.index);
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
