import React, { useEffect } from "react";

import { Route, Routes, useParams } from "react-router-dom";
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
    Glitch,
    N8AO,
    SSAO,
    TiltShift2,
} from "@react-three/postprocessing";

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

// const GalleryView = () => {
//     const { id } = useParams();
//     const categoryImages = useImageState((state) => state.images[id]);

//     useEffect(() => {
//         console.log(categoryImages);
//     }, [categoryImages]);

//     return <CameraView isFloating={false} />;
// };

const TestView3 = () => {
    const tapCamera = useImageState((state) => state.tapCamera);

    return <CameraView isFloating={false} />;
};

const LandingPage = () => {
    const categories = useImageState((state) => state.categories);
    const tapCamera = useImageState((state) => state.tapCamera);

    return (
        <CameraView
            displayRig
            isFloating={false}
            onCameraTap={(e) => {
                e.stopPropagation();
                tapCamera(true);
            }}
        >
            <OptimzedOrbitImages />
            <planeGeometry args={[50, 50]} />
            <EffectComposer>
                <Bloom
                    luminanceThreshold={0.2}
                    mipmapBlur
                    luminanceSmoothing={0.0}
                    intensity={2}
                />
                {/* <N8AO aoRadius={0.1} intensity={1} /> */}
                <TiltShift2 blur={0.1} />
            </EffectComposer>
        </CameraView>
    );
};
