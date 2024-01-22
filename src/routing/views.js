import React, { useEffect } from "react";

import { Route, Routes } from "react-router-dom";
import { useView } from "./view-context";
import { AboutPage } from "../pages/about/about-page";

import { OrbitImages } from "../landing-page/components/orbit-images";
import useImageState from "../landing-page/state/image-state";
import { CameraView } from "./camera-view";
import { routes } from "./routes";

export function Views() {
    const { path } = useView();

    useEffect(() => {
        console.log({ path });
    }, [path]);

    return (
        <Routes location={path}>
            <Route path={routes.home} element={<LandingPage />} />
            <Route path={routes.about} element={<AboutPage />} />
            <Route path={routes.contact} element={<TestView3 />} />
            {/* <Route path="/camera4" element={<LandingPage />} /> */}
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

const LandingPage = () => {
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
