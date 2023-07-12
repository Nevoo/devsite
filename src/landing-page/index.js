import { Canvas, useFrame } from "@react-three/fiber";

import React from "react";
import "./index.css";
import "../App.css";
import {
  useGLTF,
  Float,
  Lightformer,
  Text,
  Html,
  ContactShadows,
  Environment,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import {
  EffectComposer,
  N8AO,
  TiltShift2,
  DepthOfField,
} from "@react-three/postprocessing";
import { easing } from "maath";

import { suspend } from "suspend-react";
import { Camera } from "../components/blender-models/camera_glb";

const inter = import("@pmndrs/assets/fonts/inter_extra_bold.woff");

export const CameraLandingPage = () => (
  <>
    {/* <color
      attach="background-image"
      args={["url('/public/noisegradient.png')"]}
    /> */}

    <spotLight position={[20, 20, 10]} penumbra={1} castShadow angle={0.2} />
    <BackgroundText position={[0, -2, -3]} />
    <Float floatIntensity={1}>
      <Camera scale={150} rotation={[0, -2, 0]} position={[1, 4, 0]}></Camera>
    </Float>
    <ContactShadows
      scale={100}
      position={[0, -7.5, 0]}
      blur={1}
      far={100}
      opacity={0.85}
    />
    <Environment preset="city">
      <Lightformer
        intensity={8}
        position={[10, 5, 0]}
        scale={[10, 50, 1]}
        onUpdate={(self) => self.lookAt(0, 0, 0)}
      />
    </Environment>
    <EffectComposer disableNormalPass>
      <N8AO aoRadius={1} intensity={2} />
      <TiltShift2 blur={0.2} />
    </EffectComposer>
    <Rig />
  </>
);

function Rig() {
  useFrame((state, delta) => {
    easing.damp3(
      state.camera.position,
      [
        Math.sin(-state.pointer.x) * 5,
        state.pointer.y * 3.5,
        15 + Math.cos(state.pointer.x) * 10,
      ],
      0.2,
      delta
    );
    state.camera.lookAt(0, 0, 0);
  });
}

const BackgroundText = (props) => (
  <Text
    fontSize={3}
    letterSpacing={-0.025}
    font={suspend(inter).default}
    color="white"
    {...props}
  >
    <meshBasicMaterial toneMapped={false} />
    photos
    <Html style={{ color: "transparent", fontSize: "33.5em" }} transform>
      photos
    </Html>
  </Text>
);

const Torus = (props) => (
  <mesh receiveShadow castShadow {...props}>
    <torusGeometry args={[4, 1.2, 128, 64]} />
    <MeshTransmissionMaterial backside backsideThickness={5} thickness={2} />
  </mesh>
);
