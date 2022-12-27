import { Flex } from "@chakra-ui/layout";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Main from "../components/layouts/main";
import RootUI from "../components/main_ui/root_ui/root_ui";
import SpinningMeshes from "../components/main_ui/template_mesh";
import LowPolyRoom from "../public/low_poly_room/Scene";
import MelonPallet from "../public/melon_pallet/Scene";

const IndexPage = () => {
    const props = { orthographic: true, shadows: true, colorManagement: true, camera: { position: [20, 20, 20], fov: 60, zoom: 45 } };
    return (
        <Main>
            <Flex height="100vh">
                <Canvas {...props}>
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
                    <MelonPallet position={[-7, -5, 7]}/>
                    <MelonPallet position={[7, -5, -7]}/>
                </Canvas>
                <RootUI />
            </Flex>
        </Main>
    );
}

export default IndexPage;