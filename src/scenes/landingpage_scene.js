import React, { Suspense, useState, useEffect } from "react";
import "../App.css";
import { Camera } from "../components/blender-models/camera_glb";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import Headline from "../components/text/text";
import { useControls } from "leva";
import {
  animated,
  useSpring,
  config,
  useTransition,
} from "@react-spring/three";
import { useNavigate } from "react-router-dom";
import { useView, View } from "../routing-test/view-context";

const items = [{ to: "/" }];

const LandingPageScene = () => {
  const navigate = useNavigate();
  const view = useView();

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
    cameraPosition: [0.2, 0.01, 0.3],
    cameraRotation: [0.02, -1.09, 0.0],
    cameraScale: [2.5, 2.5, 2.5],
    ambienLightIntensity: { value: 0.3, min: 0, max: 1, step: 0.001 },
  });

  const [transition, transApi] = useTransition(
    view.active ? items : [],
    () => ({
      from: { scale: 0, rotation: [0, 0, 0], position: [0, 0, 0] },
      enter: {
        scale: 1,
        rotation: debugConfig.cameraRotation,
        position: debugConfig.cameraPosition,
        config: config.stiff,
      },
      leave: {
        config: config.stiff,
        scale: 0,
        rotation: [0, 0, 0],
        position: [0, 0, 0],
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

  const [isHovering, setIsHovering] = useState(false);

  const [active, setActive] = useState(false);

  // const { scale } = useSpring({
  //   scale: active ? 2.7 : 2.5,
  //   config: config.wobbly,
  // });

  const onHover = (isAnimating) => {
    setIsHovering(isAnimating);
  };

  return (
    <View delayedTransition>
      {transition((props, option, _, i) => {
        return (
          <group key={i}>
            {/* <OrbitControls></OrbitControls> */}
            <PerspectiveCamera
              name="Camera"
              makeDefault
              far={100}
              near={0.1}
              fov={22.9}
              position={[0, 0, 1]}
              rotation={[0, 0, 0]}
            />

            <ambientLight intensity={debugConfig.ambienLightIntensity} />
            <directionalLight
              castShadow
              intensity={0.6}
              position={[0, 0, 10]}
            />

            <Suspense fallback={null}>
              <animated.group
                scale={props.scale}
                onClick={() => {
                  navigate(option.to);
                }}
                rotation={props.rotation}
                position={props.position}
                onPointerOver={() => {
                  setActive(true);
                }}
                onPointerOut={() => {
                  setActive(false);
                }}
              >
                <Camera position={debugConfig.cameraPosition} />
                {/* <Headline config={debugConfig} shouldAnimate={isHovering}>
                  {debugConfig.text}
                </Headline> */}
              </animated.group>
            </Suspense>
          </group>
        );
      })}
    </View>
  );
};

export default LandingPageScene;
