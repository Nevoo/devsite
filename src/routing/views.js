import React, { useEffect } from "react";

import { Route, Routes, useParams } from "react-router-dom";
import { useView } from "./view-context";

import useImageState from "../ui/views/landing-view/state/image-state";
import { CameraView } from "./camera-view";
import { routes } from "./routes";
import { useMoveCamera } from "../hooks/useCustomNavigate";
import { OptimzedOrbitImages } from "../ui/views/landing-view/components/optimized";
import { AboutPage } from "../ui/views/about/about-page";

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
    const categoryImages = useImageState((state) => state.images[id]);

    useEffect(() => {
        console.log(categoryImages);
    }, [categoryImages]);

    return <CameraView isFloating={false} />;
};

const TestView3 = () => {
    const tapCamera = useImageState((state) => state.tapCamera);

    return <CameraView isFloating={false} />;
};

const LandingPage = () => {
    const categories = useImageState((state) => state.categories);
    const tapCamera = useImageState((state) => state.tapCamera);

    return (
        <CameraView
            isFloating={false}
            onCameraTap={(e) => {
                e.stopPropagation();
                tapCamera(true);
            }}
        >
            <OptimzedOrbitImages />
        </CameraView>
        // <CameraView
        //     isFloating={false}
        //     onCameraTap={(e) => {
        //         e.stopPropagation();
        //         tapCamera(true);
        //     }}
        // >
        //     <OrbitImages radius={10} images={images} />
        // </CameraView>
    );
};
