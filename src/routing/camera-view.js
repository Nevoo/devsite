import React, { useEffect } from "react";
import { animated, config, useTransition } from "@react-spring/three";

import { useView, View } from "./view-context";
import { Camera } from "../components/blender-models/camera_glb";
import { Environment, Lightformer } from "@react-three/drei";
import useCameraTransitionState from "../global-state/model-state";
import { useShallow } from "zustand/react/shallow";
import { Rig } from "../components/rig";
import { transitionObjects } from "./routes";

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

    // console.log({ scale, previousScale });

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
                    if (
                        transitionObjects.indexOf(c) ===
                        transitionObjects.length - 1
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

    const AnimatedCamera = animated(Camera);

    return (
        <View>
            {transition((props, option, _, i) => {
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
