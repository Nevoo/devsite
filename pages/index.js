import { Flex } from "@chakra-ui/layout";
import { Canvas } from "@react-three/fiber";
import Main from "../components/layouts/main";
import RootUI from "../components/main_ui/root_ui/root_ui";
import SpinningMeshes from "../components/main_ui/template_mesh";

const IndexPage = () => {
    const props = { shadows: true, colorManagement: true, camera: { position: [0, 2, 10], fov: 60 } };
    return (
        <Main>
            <Flex height="100vh">
                <Canvas {...props}>
                    <SpinningMeshes />
                </Canvas>
                <RootUI />
            </Flex>
        </Main>
    );
}

export default IndexPage;