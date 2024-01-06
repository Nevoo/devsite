import React, { Suspense, useEffect } from "react";
import { a, animated, config, useTransition } from "@react-spring/three";
import { useControls } from "leva";

import { useNavigate, Route, Routes } from "react-router-dom";
import { useView, View } from "./view-context";
import { CameraLandingPage } from "../landing-page";
import { AboutPage } from "../pages/about/about-page";
import { Camera } from "../components/blender-models/camera_glb";
import { navigate } from "wouter";
import { Environment, Lightformer } from "@react-three/drei";
import useCameraTransitionState from "../global-state/model-state";
import { useShallow } from "zustand/react/shallow";
import { Rig } from "../components/rig";

const dashboardOptions = [
    {
        to: "/",
    },
    {
        to: "/about",
    },
    {
        to: "/landing-page",
    },
];

const items = [{ to: "/camera2" }, { to: "/camera3" }];

export function TestView() {
    const debugConfig = useControls({
        textPosition: [0.03, 0.02, 0.05],
        text: "PICS",
        curveSegments: { value: 32, min: 1, max: 100, step: 1 },
        bevelSegments: { value: 32, min: 1, max: 100, step: 1 },
        bevelEnabled: true,
        bevelSize: { value: 0.002, min: 0, max: 0.01, step: 0.0001 },
        bevelThickness: { value: 0.01, min: 0, max: 1, step: 0.001 },
        bevelOffset: { value: 0, min: 0, max: 1, step: 0.001 },
        height: { value: 0.0, min: 0, max: 10, step: 0.01 },
        lineHeight: { value: 0.5, min: 0, max: 10, step: 0.01 },
        letterSpacing: {
            value: 0.008,
            min: -1,
            max: 1,
            step: 0.001,
        },
        modelPosition: [0, 0.04, -0.2],
        modelRotation: [0.15, 0, 0],
        cameraPosition: [1, 1.5, 0.3],
        cameraRotation: [0.02, -1.09, 0.0],
        cameraScale: { value: 50, min: 0, max: 100, step: 0.01 },
        ambienLightIntensity: { value: 0.3, min: 0, max: 1, step: 0.001 },
    });

    const view = useView();
    const navigate = useNavigate();
    const [transition, transApi] = useTransition(
        view.active ? dashboardOptions : [],
        () => ({
            trail: Math.max(10, 250 / dashboardOptions.length),
            from: { scale: 0, rotation: 0 },
            enter: { scale: 1, rotation: 4, config: config.stiff },
            leave: {
                config: config.stiff,
                scale: 0,
                rotation: 0,
                onRest: (_, __, c) => {
                    // Switch route when the last item has finished
                    // IDK if theres a better way to do this
                    if (
                        dashboardOptions.indexOf(c) ===
                        dashboardOptions.length - 1
                    ) {
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

    return (
        <View delayedTransition>
            {transition((props, option, _, i) => {
                const x = i;
                return (
                    <a.mesh
                        key={i}
                        position={[x * 1.2 - 1.4, 0, 0]}
                        rotation={props.rotation.to((r) => [r, 0, 0])}
                        onClick={() => navigate(option.to)}
                        scale={props.scale.to((x) => [x, x, x])}
                    >
                        <boxGeometry />
                        <meshNormalMaterial />
                    </a.mesh>
                );
            })}
        </View>
    );
}

export const CameraView = ({
    children,
    fromPosition,
    enterPosition,
    leavePosition,
}) => {
    const { previousPosition, position } = useCameraTransitionState(
        useShallow((state) => ({
            previousPosition: state.previousPosition,
            position: state.position,
        }))
    );

    const view = useView();

    const [transition, transApi] = useTransition(
        view.active ? items : [],
        () => ({
            // trail: Math.max(10, 250 / dashboardOptions.length),
            from: {
                scale: 50,
                rotation: 0,
                position: previousPosition,
                x: previousPosition[0],
                y: previousPosition[1],
                z: previousPosition[2],
            },
            enter: {
                scale: 150,
                rotation: 4,
                config: config.stiff,
                position: position,
                x: position[0],
                y: position[1],
                z: position[2],
            },
            leave: {
                position: previousPosition,
                x: position[0],
                y: position[1],
                z: position[2],
                config: config.stiff,
                scale: 50,
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
        <View delayedTransition>
            {transition((props, option, _, i) => {
                // console.log(props);
                props.position.to((position) => console.log(position));
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
                        <AnimatedCamera
                            scale={150}
                            rotation={[0, -2, 0]}
                            position={props.position}
                            // onClick={(e) => {
                            //     console.log(option.to);
                            //     navigate(option.to);
                            // e.stopPropagation();
                            // }}
                        />
                        {children}
                        <Rig />
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
            <Route path="/about" element={<AboutPage />} />
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
    return <CameraView />;
};

const TestView3 = () => {
    return <CameraView />;
};

const TestView4 = () => {
    return <CameraView />;
};
