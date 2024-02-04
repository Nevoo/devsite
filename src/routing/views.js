import React, { useRef } from "react";

import { Route, Routes } from "react-router-dom";
import { useView } from "./view-context";

import useImageState from "../ui/views/landing-view/state/image-state";
import { CameraView } from "./camera-view";
import { routes } from "./routes";
import { useMoveCamera } from "../hooks/useCustomNavigate";
import { OptimzedOrbitImages } from "../ui/views/landing-view/components/optimized";
import { AboutPage } from "../ui/views/about/about-page";
import { GalleryView } from "../ui/views/gallery-view/gallery-view";
import {
    Bloom,
    DepthOfField,
    EffectComposer,
    N8AO,
    SSR,
    TiltShift2,
} from "@react-three/postprocessing";
import { Html, Text } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Headlines } from "../App";
import { useControls } from "leva";

export function Views() {
    const { path } = useView();

    useMoveCamera();

    return (
        <Routes location={path}>
            <Route path={routes.home} element={<LandingPage />} />
            <Route path={routes.about} element={<AboutPage />} />
            <Route path={routes.contact} element={<TestView3 />} />
            <Route path={routes.gallery} element={<GalleryView />} />
        </Routes>
    );
}

const TestView3 = () => {
    const tapCamera = useImageState((state) => state.tapCamera);

    return <CameraView isFloating={false} />;
};

const LandingPage = () => {
    const categories = useImageState((state) => state.categories);
    const tapCamera = useImageState((state) => state.tapCamera);

    return (
        <group>
            <CameraView
                displayRig
                isFloating={true}
                onCameraTap={(e) => {
                    e.stopPropagation();
                    tapCamera(true);
                }}
            >
                <OptimzedOrbitImages />
                <EffectComposer disableNormalPass>
                    {/* <Bloom
                        luminanceThreshold={0.2}
                        mipmapBlur
                        luminanceSmoothing={0}
                        intensity={1.75}
                    /> */}

                    {/* <DepthOfField
                        target={[0, 0, 13]}
                        focalLength={15}
                        bokehScale={15}
                        height={700}
                    /> */}
                    <N8AO aoRadius={0.1} intensity={1} />
                    {/* <TiltShift2 blur={0.1} /> */}
                </EffectComposer>
            </CameraView>
        </group>
    );
};
