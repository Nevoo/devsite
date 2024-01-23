import React, { useEffect } from "react";

import { Route, Routes, useParams } from "react-router-dom";
import { useView } from "./view-context";
import { AboutPage } from "../pages/about/about-page";

import { OrbitImages } from "../landing-page/components/orbit-images";
import useImageState from "../landing-page/state/image-state";
import { CameraView } from "./camera-view";
import { routes } from "./routes";
import { useMoveCamera } from "../hooks/useCustomNavigate";
import useCameraTransitionState from "../global-state/model-state";

export function Views() {
    const { path } = useView();

    useMoveCamera();

    return (
        <Routes location={path}>
            <Route path={routes.home} element={<LandingPage />} />
            <Route path={routes.about} element={<AboutPage />} />
            <Route path={routes.contact} element={<TestView3 />} />
            <Route path={routes.gallery} element={<GalleryView />} />
            {/* <Route path="/camera4" element={<LandingPage />} /> */}
            {/* <Route path="/landing-page" element={<TestView />} /> */}
            {/* <Route path="" element={<LandingPageScene />} /> */}
            {/* <Route path="/test" element={<TestView />} /> */}
            {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
    );
}

const GalleryView = () => {
    const { id } = useParams();

    useEffect(() => {
        // console.log(id);
    }, []);

    return (
        <CameraView displayRig isFloating>
            {/* <OrbitImages radius={10} images={images} /> */}
        </CameraView>
    );
};

const TestView3 = () => {
    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);

    return (
        <CameraView
            displayRig
            isRigStatic
            isFloating={false}
            floatingRange={[0.1, 0.2]}
        />
    );
};

const LandingPage = () => {
    const images = useImageState((state) => state.images);
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
            <OrbitImages radius={10} images={images} />
        </CameraView>
    );
};
