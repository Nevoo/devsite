import {
    Image,
    Preload,
    Scroll,
    ScrollControls,
    Sphere,
    Text,
    useScroll,
} from "@react-three/drei";
import { CameraView } from "../../../routing/camera-view";
import { useEffect, useRef } from "react";
import useImageState from "../landing-view/state/image-state";
import { useParams } from "react-router-dom";
import { PlaneGeometry } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { suspend } from "suspend-react";

const gilroy = import("../../../fonts/Gilroy/Gilroy-ExtraBold.otf");

export const GalleryView = () => {
    const { width, height } = useThree((state) => state.size);

    return (
        <CameraView isFloating={false}>
            <ScrollControls
                damping={0.2}
                pages={width > 1000 && height > 1000 ? 4 : 8}
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
    const categoryImages = useImageState((state) => state.images[id]);

    useFrame(() => {
        group.current.children.forEach((image, index) => {
            if (index === 0 || index === 1) {
                image.material.zoom = 1 + data.range(0, 1 / 3) / 3;
            } else if (index >= 2 && index <= 5) {
                image.material.zoom = 1 + data.range(1 / 3, 1 / 2) / 2;
            } else {
                image.material.zoom = 1 + (1 - data.range(2 / 3, 1 / 3)) / 3;
            }
        });
    });

    const calculatePosition = (index) => {
        if (width > 1000 && height > 1000) {
            return [
                index % 2 === 0 ? -1.6 : 1.6,
                -Math.floor(index / 2) * 2.5,
                0,
            ];
        } else {
            return [0, -(index * 2.5) - index * 0.2, -15];
        }
    };

    return (
        <group ref={group}>
            {categoryImages.map((image, index) => {
                return (
                    <Image
                        position={calculatePosition(index)}
                        scale={[3, 2, 0]}
                        url={image}
                    />
                );
            })}
        </group>
    );
};

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
