import React, { useEffect, useState } from "react";
import {
    animated,
    config,
    useSpring,
    useTransition,
} from "@react-spring/three";

import { useView, View } from "./view-context";
import {
    Backdrop,
    ContactShadows,
    Environment,
    Float,
    Lightformer,
    Stage,
} from "@react-three/drei";
import useCameraTransitionState from "../global-state/model-state";
import { useShallow } from "zustand/react/shallow";
import { Rig } from "../ui/shared/components/rig";
import { transitionObjects } from "./routes";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { CameraNew } from "../ui/shared/components/blender-models/Model";

export const CameraView = ({
    children,
    displayRig,
    isFloating,
    onCameraTap,
    delayedTransition,
}) => {
    const { previousPosition, position, previousScale, scale } =
        useCameraTransitionState(
            useShallow((state) => ({
                previousPosition: state.previousPosition,
                position: state.position,
                previousScale: state.previousScale,
                scale: state.scale,
            }))
        );

    useFrame((state, delta) => {
        if (!displayRig) {
            // fixes issue where camera would be positioned weird on a reload
            easing.damp3(state.camera.position, [0, 0, 15], 0.2, delta);
            state.camera.lookAt(0, 0, 0);
        }
    });

    const view = useView();

    const [hovered, setHovered] = useState(false);
    const { hoveredScale, springPos } = useSpring({
        hoveredScale: hovered ? scale * 1.3 : scale,
        springPos: position,
    });

    const [transition, transApi] = useTransition(
        view.active ? [1] : [],
        () => ({
            from: {
                scale: previousScale,
                position: previousPosition,
                rotation: 0,
            },
            enter: {
                config: config.stiff,
                scale: hoveredScale,
                position: springPos,
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
    }, [view.active, position, previousPosition]);

    const AnimatedCamera = animated(CameraNew);

    return (
        <View delayedTransition={delayedTransition}>
            {transition((props, option, _, i) => {
                return (
                    <>
                        <Environment>
                            <Lightformer
                                intensity={8}
                                position={[10, 15, 5]}
                                scale={[10, 50, 1]}
                            />
                            <Lightformer
                                intensity={3}
                                position={[-10, 15, 5]}
                                scale={[10, 50, 1]}
                            />
                        </Environment>

                        <Float
                            enabled={isFloating}
                            speed={2}
                            rotationIntensity={0.5}
                            floatIntensity={0.5}
                        >
                            {children}
                            <AnimatedCamera
                                onPointerEnter={() => setHovered(true)}
                                onPointerLeave={() => setHovered(false)}
                                scale={props.scale}
                                rotation={[0, -2, 0]}
                                position={props.position}
                                onPointerDown={onCameraTap}
                            />
                        </Float>
                        {displayRig && <Rig />}
                    </>
                );
            })}
        </View>
    );
};
