import { Flex } from "@chakra-ui/layout";
import { Physics, useBox, usePlane } from "@react-three/cannon";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

function Box() {
    const [ref, api] = useBox(() => ({ mass: 1, position: [0, 4, 0] }));

    const onClick = () => {
        api.velocity.set(0, 2, 0);
    };

    return (
        <mesh onClick={onClick} ref={ref} position={[0, 4, 0]}>
            <boxBufferGeometry attach="geometry" />
            <meshLambertMaterial attach="material" color="hotpink" />
        </mesh>
    );
}

function Plane() {
    const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0] }));

    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
            <planeBufferGeometry attach="geometry" args={[100, 100]} />
            <meshLambertMaterial attach="material" color="lightblue" />
        </mesh>
    );
}

const ThreeExample = () => {
    return (
        <Flex height="100vh">
            <Canvas>
                <OrbitControls />
                <Stars />
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 15, 10]} angle={0.3} />
                <Physics >
                    <Box />
                    <Plane />
                </Physics>
            </Canvas>
        </Flex>
    );
};

export default ThreeExample;