import React, { Suspense, useEffect } from "react";
import { a, animated, config, useTransition } from "@react-spring/three";
import { useControls } from "leva";

import { useNavigate, Route, Routes } from "react-router-dom";
import { useView, View } from "./view-context";
import { CameraLandingPage } from "../landing-page";
import { AboutPage } from "../pages/about/about-page";
import { Camera } from "../components/blender-models/camera_glb";
import { navigate } from "wouter";
import { Environment, Float, Lightformer } from "@react-three/drei";
import useCameraTransitionState from "../global-state/model-state";
import { useShallow } from "zustand/react/shallow";
import { Rig } from "../components/rig";
import { useFrame } from "@react-three/fiber";
import { OrbitImages } from "../landing-page/components/orbit-images";
import useImageState from "../landing-page/state/image-state";

const items = [{ to: "/camera2" }, { to: "/camera3" }, { to: "/camera4" }];

export const CameraView = ({ children, displayRig, onCameraTap }) => {
    const {
        previousPosition,
        position,
        previousScale,
        scale,
        previousRotation,
        rotation,
    } = useCameraTransitionState(
        useShallow((state) => ({
            previousPosition: state.previousPosition,
            position: state.position,
            previousScale: state.previousScale,
            scale: state.scale,
            previousRotation: state.previousRotation,
            rotation: state.rotation,
        }))
    );

    const view = useView();

    const [transition, transApi] = useTransition(
        view.active ? [1] : [],
        () => ({
            // trail: Math.max(10, 250 / dashboardOptions.length),
            from: {
                scale: previousScale,
                position: previousPosition,
                rotation: 0,
            },
            enter: {
                config: config.stiff,
                scale: scale,
                position: position,
                rotation: 4,
            },
            leave: {
                config: config.stiff,
                scale: previousScale,
                position: previousPosition,
                rotation: 0,
                onRest: (_, __, c) => {
                    // Switch route when the last item has finished
                    // IDK if theres a better way to do this
                    if (items.indexOf(c) === items.length - 1) {
                        view.updateRoute();
                    }
                },
            },
        }),
        [view.active]
    );

    useEffect(() => {
        transApi.start();
    }, [view.active]);

    const AnimatedCamera = animated(Camera);

    return (
        <View>
            {transition((props, option, _, i) => {
                // props.rotation.to(console.log);
                return (
                    <>
                        <Environment preset="city">
                            <Lightformer
                                intensity={8}
                                position={[10, 5, 0]}
                                scale={[10, 50, 1]}
                                onUpdate={(self) => self.lookAt(0, 0, 0)}
                            />
                        </Environment>
                        {/* <Float floatIntensity={1}> */}
                        {children}
                        <AnimatedCamera
                            scale={props.scale}
                            rotation={[0, -2, 0]}
                            position={props.position}
                            onPointerDown={onCameraTap}
                            // onClick={(e) => {
                            //     console.log(option.to);
                            //     navigate(option.to);
                            // e.stopPropagation();
                            // }}
                        />
                        {/* </Float> */}

                        {displayRig && <Rig />}
                    </>
                );
            })}
        </View>
    );
};

export function Views() {
    const { path } = useView();
    return (
        <Routes location={path}>
            <Route path="/" element={<CameraLandingPage />} />
            {/* <Route path="/about" element={} /> */}
            <Route path="/camera2" element={<TestView2 />} />
            <Route path="/camera3" element={<TestView3 />} />
            <Route path="/camera4" element={<TestView4 />} />
            {/* <Route path="/landing-page" element={<TestView />} /> */}
            {/* <Route path="" element={<LandingPageScene />} /> */}
            {/* <Route path="/test" element={<TestView />} /> */}
            {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
    );
}

const TestView2 = () => {
    // position={[-0.02, -0.01, 0.02]}
    return (
        <CameraView>
            <AboutPage />
        </CameraView>
    );
};

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
