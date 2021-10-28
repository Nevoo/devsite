import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { softShadows } from "@react-three/drei";
import { useSpring, a } from "@react-spring/three";

softShadows();

const SpinningMesh = ({ position, args, color }) => {
    const mesh = useRef();
    useFrame(() => (mesh.current.rotation.x = mesh.current.rotation.y += 0.01));

    const [isExpanded, setExpanded] = useState(false);

    const props = useSpring({
        scale: isExpanded ? [1.4, 1.4, 1.4] : [1, 1, 1],
        color: isExpanded ? "#f12711" : color
    });

    const onHover = () => setExpanded(!isExpanded);


    return (
        <a.mesh onPointerOver={onHover} onPointerOut={onHover} scale={props.scale} castShadow position={position} ref={mesh}>
            <boxBufferGeometry attach='geometry' args={args} />
            <a.meshStandardMaterial attach='material' color={props.color} />
        </a.mesh>
    );
}

const SpinningMeshes = () => {
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

            <SpinningMesh position={[-2, 1, -7]} color='#f5af19' speed={4} factor={0.6} args={[3, 3, 3]} />
            <SpinningMesh position={[7, 1, -2]} color='#f5af19' speed={4} factor={0.6} args={[3, 3, 3]} />
        </group>
    );
}

export default SpinningMeshes;