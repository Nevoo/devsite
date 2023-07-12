import React, { Suspense, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { a, animated, config, useTransition } from "@react-spring/three";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import { useControls } from "leva";

import { useNavigate, Route, Routes } from "react-router-dom";
import { useView, View } from "./view-context";
import LandingPageScene from "../scenes/landingpage_scene";
// import { NotFound } from "./NotFound";
import { Camera } from "../components/blender-models/camera_glb";
import KeyboardGLTF from "../components/keyboard/keyboard";

const dashboardOptions = [
  {
    to: "/",
  },
  {
    to: "/test",
  },
  {
    to: "/landing-page",
  },
];

const items = [{ to: "/" }];

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
          if (dashboardOptions.indexOf(c) === dashboardOptions.length - 1) {
            view.updateRoute();
          }
        },
      },
    }),
    [view.active]
  );

  const [cameraTransition, cameraTransApi] = useTransition(
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
    cameraTransApi.start();
  }, [view.active]);

  return (
    <View delayedTransition>
      {/* {transition((props, option, _, i) => {
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
      })} */}

      {cameraTransition((props, option, _, i) => {
        return (
          <group key={i}>
            <OrbitControls></OrbitControls>
            {/* <PerspectiveCamera
              name="Camera"
              makeDefault
              far={100}
              near={0.1}
              fov={22.9}
              position={[0, 0, 1]}
              rotation={[0, 0, 0]}
            /> */}

            <ambientLight intensity={debugConfig.ambienLightIntensity} />
            <directionalLight castShadow intensity={3} position={[0, 0, 10]} />

            <Suspense fallback={null}>
              {/* <animated.group
                scale={props.scale}
                onClick={() => {
                  navigate(option.to);
                }}
                
                onPointerOver={() => {
                  setActive(true);
                }}
                onPointerOut={() => {
                  setActive(false);
                }}
              > */}
              <KeyboardGLTF rotation={[0, 0, 0]} position={[-1, -4, 0]} />
              {/* <Headline config={debugConfig} shouldAnimate={isHovering}>
                  {debugConfig.text}
                </Headline> */}
              {/* </animated.group> */}
            </Suspense>
          </group>
        );
      })}
    </View>
  );
}

export function Views() {
  const { path } = useView();
  return (
    <Routes location={path}>
      <Route path="/" element={<TestView />} />
      <Route path="/landing-page" element={<TestView />} />
      {/* <Route path="" element={<LandingPageScene />} /> */}
      <Route path="/test" element={<TestView />} />
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}
