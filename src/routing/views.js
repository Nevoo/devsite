import React, { useEffect, useRef } from "react";

import { Route, Routes, useParams } from "react-router-dom";
import { useView } from "./view-context";

import useImageState from "../ui/views/landing-view/state/image-state";
import { CameraView } from "./camera-view";
import { routes } from "./routes";
import { useMoveCamera } from "../hooks/useCustomNavigate";
import { OptimzedOrbitImages } from "../ui/views/landing-view/components/optimized";
import { AboutPage } from "../ui/views/about/about-page";
// import { GalleryView } from "../ui/views/gallery-view/gallery-view";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { ContactPage } from "../ui/views/contact/contact";
import { Privacy } from "../ui/views/privacy";

import "./../App.css";
import { Image, Scroll, ScrollControls } from "@react-three/drei";
import { extend, useThree } from "@react-three/fiber";
import {
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Raycaster,
    Vector2,
} from "three";
import useCameraTransitionState from "../global-state/model-state";
import { MobileGalleryView } from "../ui/views/gallery-view/gallery-view";

extend({ Mesh });

export function Views() {
    const { path } = useView();

    useMoveCamera();

    return (
        <Routes location={path}>
            <Route path={routes.home} element={<LandingPage />} />
            <Route path={routes.about} element={<AboutPage />} />
            <Route path={routes.contact} element={<ContactPage />} />
            <Route path={routes.gallery} element={<GalleryView />} />
            <Route
                path={routes.mobileGallery}
                element={<MobileGalleryView />}
            />
            <Route path={routes.privacy} element={<Privacy />} />
        </Routes>
    );
}

const LandingPage = () => {
    const tapCamera = useImageState((state) => state.tapCamera);

    return (
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
                <N8AO aoRadius={0.1} intensity={1} />
            </EffectComposer>
        </CameraView>
    );
};

const GalleryView = () => {
    const { id } = useParams();
    const categoryImages = useImageState((state) => state.images[id] ?? []);
    const { width, height } = useThree((state) => state.size);

    const horizontal = width > 1000 && height > 700 ? true : false;

    const positions = [];

    const calculatePosition = (index, scale, positions) => {
        if (horizontal) {
            const pos = [0.95 * index - 1, -0.15, 0];
            positions.push(pos);

            return pos;
        } else {
            return [2 * index - 0.5, -0.15, 0];
        }
    };

    const rotation = (index) => {
        if (horizontal) {
            return [0, 0, 0];
        } else {
            return [0, 0, Math.PI / 2];
        }
    };

    return (
        <ScrollControls
            damping={0.2}
            pages={
                horizontal
                    ? Math.ceil(categoryImages.length / 3)
                    : categoryImages.length - 1
            }
            horizontal={horizontal}
        >
            <CameraView
                isFloating={false}
                displayRig
                portalChildren={
                    <Scroll>
                        {categoryImages.map((image, index) => {
                            return (
                                <Image
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("different");
                                    }}
                                    position={calculatePosition(
                                        index,
                                        image.scale,
                                        positions
                                    )}
                                    rotation={rotation(index)}
                                    scale={image.scale.map(
                                        (s) => s * (horizontal ? 0.45 : 0.6)
                                    )}
                                    key={index}
                                    url={`/${image.url}`}
                                />
                            );
                        })}
                    </Scroll>
                }
            />
        </ScrollControls>
    );
};
