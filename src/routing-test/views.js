import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { a, config, useTransition } from "@react-spring/three";
import { useNavigate, Route, Routes } from "react-router-dom";
import { useView, View } from "./view-context";
// import { NotFound } from "./NotFound";

const dashboardOptions = [
  {
    to: "/404",
  },
  {
    to: "/",
  },
  {
    to: "/test",
  },
  {
    to: "/test2",
  },
];

export function TestView() {
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

export function Views() {
  const { path } = useView();
  return (
    <Routes location={path}>
      <Route path="/" element={<TestView />} />
      <Route path="/test" element={<TestView />} />
      <Route path="/test2" element={<TestView />} />
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}
