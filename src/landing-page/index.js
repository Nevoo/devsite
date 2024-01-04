import {
    Canvas,
    useFrame,
    useThree,
    extend,
    useLoader,
} from "@react-three/fiber";

import { TextureLoader, Vector2, Vector4, MathUtils } from "three";

import React, { useRef, useState } from "react";
import "./index.css";
import "../App.css";
import {
    useGLTF,
    Float,
    Lightformer,
    Text,
    Html,
    useCursor,
    ContactShadows,
    Environment,
    MeshTransmissionMaterial,
    Image,
    RoundedBox,
    useTexture,
    planeGeometry,
    MeshDistortMaterial,
    GradientTexture,
    OrbitControls,
    Plane,
} from "@react-three/drei";
import {
    EffectComposer,
    N8AO,
    TiltShift2,
    DepthOfField,
} from "@react-three/postprocessing";
import { easing, geometry } from "maath";

import { suspend } from "suspend-react";
import { Camera } from "../components/blender-models/camera_glb";

import vertexShader from "./vertexShader";
import fragmentShader from "./fragmentShader";

const inter = import("@pmndrs/assets/fonts/inter_extra_bold.woff");

const pexel = (id) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;

extend({ RoundedPlaneGeometry: geometry.RoundedPlaneGeometry });

export const CameraLandingPage = (props) => (
    <>
        {/* <color
      attach="background-image"
      args={["url('/public/noisegradient.png')"]}
    /> */}
        <spotLight
            position={[20, 20, 10]}
            penumbra={1}
            castShadow
            angle={0.2}
        />
        {/* <BackgroundText position={[0, -2, -3]} /> */}
        <Float floatIntensity={1}>
            <Camera
                scale={150}
                rotation={[0, -2, 0]}
                position={[1, 4, 0]}
            ></Camera>
            {/* <Torus scale={0.5} position={[0, -5, -15]} />
            <Torus scale={0.6} position={[10, 5, -15]} />
            <Torus scale={0.6} position={[-20, 10, -15]} />
            <ImageItem position={[0, -5, -20]} url={pexel(310452)} {...props} />
            <ImageItem
                position={[-18, 8, -20]}
                url={pexel(358574)}
                {...props}
            /> */}
            {/* <ImageItem
                position={[20, 10, -20]}
                url={pexel(1738986)}
                {...props}
            /> */}
            {/* <ImageCarousel
                imageUrls={[pexel(358574), pexel(1738986), pexel(310452)]}
            ></ImageCarousel> */}
            <OrbitImages radius={10} />
        </Float>
        <ContactShadows
            scale={200}
            position={[0, -10, 0]}
            blur={1}
            far={100}
            opacity={0.85}
        />
        <Environment preset="city">
            <Lightformer
                intensity={8}
                position={[10, 5, 0]}
                scale={[10, 50, 1]}
                onUpdate={(self) => self.lookAt(0, 0, 0)}
            />
        </Environment>

        {/* <EffectComposer disableNormalPass>
            <N8AO aoRadius={1} intensity={2} />
            <TiltShift2 blur={0.2} />
        </EffectComposer> */}
        <Rig />
    </>
);

function OrbitImages({ radius }) {
    // Define the radius of the orbit
    const [angle, setAngle] = useState(0); // Define a state for the rotation angle

    useFrame((state, delta) => {
        // Increment the rotation angle based on the delta time
        setAngle((prevAngle) => prevAngle + delta * 0.2);
    });

    const images = [
        pexel(911738),
        pexel(416430),
        pexel(310452),
        pexel(911738),
        pexel(327482),
        pexel(325185),
        pexel(911738),
        pexel(358574),
        pexel(227675),
        pexel(911738),
        pexel(1738986),
    ];

    return (
        <>
            {images.map((imageUrl, index) => (
                <CurvedPlane2
                    key={index}
                    position={[
                        radius *
                            Math.sin(
                                angle + (index * 2 * Math.PI) / images.length
                            ),
                        0,
                        radius *
                            Math.cos(
                                angle + (index * 2 * Math.PI) / images.length
                            ),
                    ]}
                    rotation={[
                        0,
                        angle + (index * 2 * Math.PI) / images.length,
                        0,
                    ]}
                    textureUrl={imageUrl}
                />
            ))}
        </>
    );
}

function Rig() {
    useFrame((state, delta) => {
        easing.damp3(
            state.camera.position,
            [
                Math.sin(-state.pointer.x) * 5,
                state.pointer.y * 3.5,
                15 + Math.cos(state.pointer.x) * 10,
            ],
            0.2,
            delta
        );
        state.camera.lookAt(0, 0, 0);
    });
}

const BackgroundText = (props) => (
    <Text
        fontSize={3}
        letterSpacing={-0.025}
        font={suspend(inter).default}
        color="white"
        {...props}
    >
        <meshBasicMaterial toneMapped={false} />
        photos
        {/* <Html
      style={{
        color: "transparent",
        fontSize: "33.5em",
        cursor: "default",
        userSelect: "none",
      }}
      transform
    >
      photos
    </Html> */}
    </Text>
);

const CurvedPlane2 = ({ textureUrl, position, rotation }) => {
    const { mouse, width } = useThree((state) => state);
    const texture = useLoader(TextureLoader, textureUrl);

    return (
        <mesh position={position} scale={[5, 5, 0]} rotation={rotation}>
            <planeGeometry args={[1, 1, 32, 32]} />
            <shaderMaterial
                vertexShader={vertexShader}
                // vertexShader={`
                //     varying vec2 vUv;

                //     void main() {
                //         vUv = uv;
                //         vec4 modelPosition = modelMatrix * vec4(position, 1.0);

                //         modelPosition.z += modelPosition.x * modelPosition.x * -0.2;

                //         vec4 viewPosition = viewMatrix * modelPosition;
                //         vec4 projectedPosition = projectionMatrix * viewPosition;

                //         gl_Position = projectedPosition;
                //     }
                // `}
                fragmentShader={fragmentShader}
                args={[
                    {
                        uniforms: {
                            time: { value: 1.0 },
                            roundMedia: { value: 1 },
                            uSpeed: { value: 0.03 },
                            uTextureSize: { value: new Vector2(150, 100) },
                            uTexture: { value: texture },
                            uCorners: { value: new Vector4(0, 0, 0, 0) },
                            uResolution: { value: new Vector2(width, width) },
                            uQuadSize: { value: new Vector2(450, 300) },
                            uAlpha: { value: 1 },
                            uProgressHover: { value: 1.5 },
                            uProgressClick: { value: 0 },
                            uMouse: { value: mouse },
                        },
                        transparent: !0,
                        side: 2,
                        defines: {
                            PI: Math.PI,
                            PR: window.devicePixelRatio.toFixed(1),
                        },
                    },
                ]}
            />
        </mesh>
    );
};
