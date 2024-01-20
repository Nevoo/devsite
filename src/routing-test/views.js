import React from "react";

import { Route, Routes } from "react-router-dom";
import { useView } from "./view-context";
import { CameraLandingPage } from "../landing-page";
import { AboutPage } from "../pages/about/about-page";

import { OrbitImages } from "../landing-page/components/orbit-images";
import useImageState from "../landing-page/state/image-state";
import { CameraView } from "./camera-view";

export function Views() {
    const { path } = useView();

    return (
        <Routes location={path}>
            <Route path="/" element={<CameraLandingPage />} />
            {/* <Route path="/about" element={} /> */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/camera3" element={<TestView3 />} />
            <Route path="/camera4" element={<TestView4 />} />
            {/* <Route path="/landing-page" element={<TestView />} /> */}
            {/* <Route path="" element={<LandingPageScene />} /> */}
            {/* <Route path="/test" element={<TestView />} /> */}
            {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
    );
}

const TestView3 = () => {
    return <CameraView />;
};

const TestView4 = () => {
    const images = useImageState((state) => state.images);
    const tapCamera = useImageState((state) => state.tapCamera);

    return (
        <CameraView
            displayRig
            onCameraTap={(e) => {
                e.stopPropagation();
                tapCamera(true);
            }}
        >
            <OrbitImages radius={10} images={images} />
        </CameraView>
    );
};
