import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { softShadows, Text } from "@react-three/drei";
import { useSpring, a } from "@react-spring/three";
import { OrbitControls, MeshWobbleMaterial } from "@react-three/drei";
import { useRouter } from "next/router";

softShadows();

const SpinningMesh = ({ position, args, color, textRef }) => {
    const mesh = useRef();

    const hoverColor = "#f12711";

    const [isExpanded, setExpanded] = useState(false);

    useFrame(({ mouse }) => {
        mesh.current.rotation.x = mesh.current.rotation.y += 0.01;

        if (textRef.current) {
            if (isExpanded) {
                textRef.current.color = hoverColor;
            } else {
                textRef.current.color = "white";
            }
        }
    });

    const props = useSpring({
        scale: isExpanded ? [1.4, 1.4, 1.4] : [1, 1, 1],
        color: isExpanded ? hoverColor : color
    });

    const onHover = () => setExpanded(!isExpanded);

    return (
        <a.mesh onPointerOver={onHover} onPointerOut={onHover} scale={props.scale} castShadow position={position} ref={mesh}>
            <boxBufferGeometry attach='geometry' args={args} />
            <a.meshStandardMaterial attach='material' color={props.color} />
        </a.mesh>
    );
}

const Headlines = ({ photoTextRef, devTextRef }) => {
    const fontUrl = "https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff";

    const config = { color: "white", font: fontUrl, fontSize: "0.7", anchorX: "center", anchorY: "middle" };

    return (
        <group>
            <Text ref={photoTextRef} position={[-3, -0.5, 2]} {...config}>
                PHOTOGRAPHY
            </Text>
            <Text ref={devTextRef} position={[3.5, -0.5, 2]} {...config}>
                DEVELOPMENT
            </Text>
        </group>
    );
}

const SpinningMeshes = () => {
    const photoTextRef = useRef();
    const devTextRef = useRef();

    const cubeColor = "#f5af19";

    return (
        <group>
            {/* <OrbitControls /> */}
            <ambientLight intensity={0.3} />
            <directionalLight
                castShadow
                position={[0, 10, 0]}
                intensity={1}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-far={50}
                shadow-camera-left={-10}
                shadow-camera-right={10}
                shadow-camera-top={10}
                shadow-camera-bottom={-10}
            />
            <pointLight position={[-10, 0, -20]} intensity={0.5} />
            <pointLight position={[0, -10, 0]} intensity={1.} />

            <group>
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
                    <planeBufferGeometry attach='geometry' args={[50, 50]} />
                    <meshStandardMaterial attach='material' color='hotpink' />
                    <shadowMaterial attach='material' opacity={0.3} />
                </mesh>
            </group>
            <Headlines photoTextRef={photoTextRef} devTextRef={devTextRef} />
            <SpinningMesh textRef={photoTextRef} position={[-5, 1, -4]} color={cubeColor} speed={4} factor={0.6} args={[3, 3, 3]} />
            <SpinningMesh textRef={devTextRef} position={[5, 1, -4]} color={cubeColor} speed={4} factor={0.6} args={[3, 3, 3]} />
        </group>
    );
}

export default SpinningMeshes;