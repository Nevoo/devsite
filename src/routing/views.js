import React, { useEffect } from "react";

import { Route, Routes, useParams } from "react-router-dom";
import { useView } from "./view-context";
import { AboutPage } from "../pages/about/about-page";

import { OrbitImages } from "../landing-page/components/orbit-images";
import useImageState from "../landing-page/state/image-state";
import { CameraView } from "./camera-view";
import { routes } from "./routes";
import { useMoveCamera } from "../hooks/useCustomNavigate";

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

const GalleryView = () => {
    const { id } = useParams();

    useEffect(() => {
        // console.log(id);
    }, []);

    return <CameraView isFloating={false} />;
};

const TestView3 = () => {
    return <CameraView isFloating={false} />;
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
