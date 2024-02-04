import * as THREE from "three";

import {
    Image,
    Preload,
    Scroll,
    ScrollControls,
    Text,
    useIntersect,
    useScroll,
} from "@react-three/drei";
import { CameraView } from "../../../routing/camera-view";
import { useRef } from "react";
import useImageState from "../landing-view/state/image-state";
import { useParams } from "react-router-dom";
import { useFrame, useThree } from "@react-three/fiber";
import { suspend } from "suspend-react";

const gilroy = import("../../../fonts/Gilroy/Gilroy-ExtraBold.otf");

export const GalleryView = () => {
    const { width, height } = useThree((state) => state.size);

    return (
        <CameraView isFloating={false}>
            <ScrollControls
                damping={0.2}
                pages={width > 1200 && height > 800 ? 6 : 8}
                distance={0.5}
            >
                {/* <Lens> */}
                <Scroll>
                    {/* <Typography /> */}
                    <Images />
                </Scroll>
                <Preload />
                {/* </Lens> */}
            </ScrollControls>
        </CameraView>
    );
};

const Images = () => {
    const group = useRef();
    const data = useScroll();
    const { width, height } = useThree((state) => state.size);

    const { id } = useParams();
    const categoryImages = useImageState((state) => state.images[id] ?? []);

    const calculatePosition = (index) => {
        if (width > 1200 && height > 800) {
            return [
                index % 2 === 0 ? -1.6 : 1.6,
                -Math.floor(index / 2) * 5,
                0,
            ];
        } else {
            return [0, -(index * 2.5) - index * 0.6, -15];
        }
    };

    return (
        <group ref={group}>
            {categoryImages.map((image, index) => {
                const position = calculatePosition(index);
                return (
                    <ImageItem
                        key={index}
                        position={position}
                        scale={image.scale}
                        url={image.url}
                    />
                );
            })}
        </group>
    );
};

function ImageItem({ scale, url, index, ...props }) {
    const visible = useRef(false);
    const ref = useIntersect((isVisible) => (visible.current = isVisible));
    const { height } = useThree((state) => state.viewport);

    useFrame((state, delta) => {
        ref.current.position.y = THREE.MathUtils.damp(
            ref.current.position.y,
            visible.current ? 0 : -height / 1.5 + 1,
            4,
            delta
        );

        ref.current.material.zoom = THREE.MathUtils.damp(
            ref.current.material.zoom,
            visible.current ? 1 : 1.5,
            4,
            delta
        );
    });
    return (
        <group {...props}>
            <Image ref={ref} scale={scale} url={url} />
        </group>
    );
}

function Typography() {
    const state = useThree();
    const { width, height } = state.viewport.getCurrentViewport(
        state.camera,
        [0, 0, 12]
    );
    const shared = {
        font: suspend(gilroy).default,
        letterSpacing: -0.05,
        color: "#FFFFFF",
    };
    return (
        <>
            <Text
                children="black"
                anchorX="left"
                position={[-width / 1.5, -height / 10, 8]}
                {...shared}
            />
            <Text
                children="mist"
                anchorX="right"
                position={[width / 2.5, -height * 2, 8]}
                {...shared}
            />
        </>
    );
}
