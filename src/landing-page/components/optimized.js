import * as THREE from "three";
import { useRef, useState } from "react";
import {
    Image,
    Environment,
    ScrollControls,
    useScroll,
    useTexture,
} from "@react-three/drei";
import { useTrail, animated, config } from "@react-spring/three";
import { Canvas, useFrame } from "@react-three/fiber";
import { easing } from "maath";
import useImageState from "../state/image-state";
import "./bent-plane-geometry";
import { routes } from "../../routing/routes";
import { useShallow } from "zustand/react/shallow";
import { useNavigate } from "react-router-dom";
import { CategoryTitle } from "./orbit-images";

export const OptimzedOrbitImages = () => {
    const cameraTapped = useImageState((state) => state.cameraTapped);

    return (
        <group>
            <fog attach="fog" args={["#a79", 8.5, 12]} />
            <ScrollControls enabled={cameraTapped} pages={4} infinite>
                <Rig rotation={[0, 0, 0.05]}>
                    <Carousel />
                </Rig>
            </ScrollControls>
            {/* <Environment preset="city" background blur={0.5} /> */}
        </group>
    );
};

function Rig(props) {
    const ref = useRef();
    const scroll = useScroll();
    useFrame((state, delta) => {
        ref.current.rotation.y = -scroll.offset * (Math.PI * 2); // Rotate contents
        state.events.update(); // Raycasts every frame rather than on pointer-move
        easing.damp3(
            state.camera.position,
            [-state.pointer.x * 2, state.pointer.y + 1.5, 10],
            0.3,
            delta
        ); // Move camera
        state.camera.lookAt(0, 0, 0); // Look at center
    });
    return <group ref={ref} {...props} />;
}

function Carousel({ radius = 2 }) {
    const navigate = useNavigate();
    const images = useImageState((state) => state.images);
    const count = images.length;

    const [tappedImage, setTappedImage] = useState(null);

    const { cameraTapped, tapCamera } = useImageState(
        useShallow((state) => ({
            cameraTapped: state.cameraTapped,
            tapCamera: state.tapCamera,
        }))
    );

    const trail = useTrail(images.length, {
        config: config.stiff,
        positionOffset: cameraTapped ? 0 : 10,
        rotationOffset: cameraTapped ? 0 : 15,
        scale: cameraTapped ? 5 : 0,
        fontScale: cameraTapped ? 0.2 : 0,
        from: {
            positionOffset: 10,
            rotationOffset: 15,
            scale: 0,
            fontScale: 0,
        },
        onRest: (value, _, __) => {
            if (value.finished && tappedImage !== null) {
                navigate(routes.gallery.replace(":id", tappedImage));
            }
        },
    });

    return trail.map(({ ...style }, index) => {
        const imageData = images[index];

        return (
            <Card
                onPointerDown={(e) => {
                    e.stopPropagation();
                    setTappedImage(index);
                    tapCamera(false);
                }}
                key={index}
                url={imageData.image}
                title={imageData.title}
                position={[
                    Math.sin((index / count) * Math.PI * 2) * radius,
                    0,
                    Math.cos((index / count) * Math.PI * 2) * radius,
                ]}
                rotation={[0, Math.PI + (index / count) * Math.PI * 2, 0]}
                style={style}
            ></Card>
        );
    });
}

export const Card = ({ style, position, url, ...props }) => {
    const ref = useRef();
    const [hovered, hover] = useState(false);
    const pointerOver = (e) => (e.stopPropagation(), hover(true));
    const pointerOut = () => hover(false);
    useFrame((state, delta) => {
        easing.damp3(ref.current.scale, hovered ? 1.2 : 1, 0.1, delta);
        easing.damp(
            ref.current.material,
            "radius",
            hovered ? 0.2 : 0.1,
            0.2,
            delta
        );
        easing.damp(
            ref.current.material,
            "zoom",
            hovered ? 1 : 1.2,
            0.2,
            delta
        );
    });

    const AnimatedImage = animated(Image);

    return (
        <group>
            <AnimatedImage
                ref={ref}
                url={url}
                transparent
                side={THREE.DoubleSide}
                onPointerOver={pointerOver}
                onPointerOut={pointerOut}
                position={style.positionOffset.to((offset) => [
                    position[0],
                    position[1] + offset,
                    position[2] + offset,
                ])}
                {...props}
            >
                <bentPlaneGeometry args={[0.1, 1, 1, 20, 20]} />
            </AnimatedImage>
            <CategoryTitle
                scale={style.fontScale.to((x) => x)}
                position={position}
                rotation={[
                    props.rotation[0],
                    props.rotation[1] - Math.PI,
                    props.rotation[2],
                ]}
                title={props.title}
                hovered={hovered}
                offset={0.8}
            />
        </group>
    );
};
