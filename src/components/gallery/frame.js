import * as THREE from "three";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  useCursor,
  Image,
  Text,
  useScroll,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import { useRoute } from "wouter";
import { easing } from "maath";
import getUuid from "uuid-by-string";
import { useControls } from "leva";

const GOLDENRATIO = 1.61803398875;
const damp = THREE.MathUtils.damp;

function Frame({
  scale,
  length,
  index,
  position,
  url,
  clickedIndex,
  c = new THREE.Color(),
  ...props
}) {
  const config = useControls({
    transmissionSampler: false,
    backside: false,
    samples: { value: 10, min: 1, max: 32, step: 1 },
    resolution: { value: 2048, min: 256, max: 2048, step: 256 },
    transmission: { value: 1, min: 0, max: 1 },
    roughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
    thickness: { value: 3.5, min: 0, max: 10, step: 0.01 },
    ior: { value: 1.5, min: 1, max: 5, step: 0.01 },
    chromaticAberration: { value: 0.06, min: 0, max: 1 },
    anisotropy: { value: 0.1, min: 0, max: 1, step: 0.01 },
    distortion: { value: 0.52, min: 0, max: 1, step: 0.01 },
    distortionScale: { value: 0.3, min: 0.01, max: 1, step: 0.01 },
    temporalDistortion: { value: 0.5, min: 0, max: 1, step: 0.01 },
    clearcoat: { value: 0, min: 0, max: 1 },
    attenuationDistance: { value: 0.5, min: 0, max: 10, step: 0.01 },
    attenuationColor: "#9a4242",
    color: "#c9ffa1",
    bg: "#839681",
  });

  const image = useRef();
  const frame = useRef();
  const textRef = useRef();

  const [, params] = useRoute("/item/:id");
  const [hovered, hover] = useState(false);
  const [random] = useState(() => Math.random());
  const name = getUuid(url);
  const isActive = params?.id === name;
  const scroll = useScroll();

  useCursor(hovered);

  useFrame((state, deltaTime) => {
    const y = scroll.curve(index / length - 1.5 / length, 4 / length);
    const clickedImageScaling = 3;

    // clicked frame
    frame.current.scale[1] = frame.current.scale.y = damp(
      frame.current.scale.y,
      clickedIndex === index ? 2 : 1.5 + y,
      8,
      deltaTime
    );

    frame.current.scale[0] = frame.current.scale.x = damp(
      frame.current.scale.x,
      clickedIndex === index ? clickedImageScaling : scale[0],
      6,
      deltaTime
    );

    textRef.current.position.x = damp(
      textRef.current.position.x,
      clickedIndex === index ? position[1] + clickedImageScaling - 1.3 : 0.55,
      6,
      deltaTime
    );

    // frames next to clicked frame
    if (clickedIndex !== null && index < clickedIndex) {
      frame.current.position.x = damp(
        frame.current.position.x,
        position[1] - clickedImageScaling,
        6,
        deltaTime
      );

      textRef.current.position.x = damp(
        textRef.current.position.x,
        position[1] - clickedImageScaling - 1.3,
        7,
        deltaTime
      );
    }

    if (clickedIndex !== null && index > clickedIndex) {
      frame.current.position.x = damp(
        frame.current.position.x,
        position[1] + clickedImageScaling,
        6,
        deltaTime
      );

      textRef.current.position.x = damp(
        textRef.current.position.x,
        position[1] + clickedImageScaling + 1.3,
        7,
        deltaTime
      );
    }

    if (clickedIndex === null || clickedIndex === index) {
      frame.current.position.x = damp(
        frame.current.position.x,
        position[1],
        8,
        deltaTime
      );
    }
  });

  useFrame((state, deltaTime) => {
    image.current.material.zoom =
      2 + Math.sin(random * 10000 + state.clock.elapsedTime / 3) / 2;

    easing.damp3(
      image.current.scale,
      [
        0.85 * (!isActive && hovered ? 0.85 : 1),
        0.94 * (!isActive && hovered ? 0.95 : 1),
        1,
      ],
      0.1,
      deltaTime
    );
    easing.dampC(
      frame.current.material.color,
      hovered ? "white" : "#151515",
      0.1,
      deltaTime
    );
  });
  return (
    <group {...props} position={position}>
      <mesh
        ref={frame}
        name={name}
        onPointerOver={(event) => {
          event.stopPropagation();
          hover(true);
        }}
        onPointerOut={() => hover(false)}
        scale={[1, GOLDENRATIO, 0.05]}
        position={[0, GOLDENRATIO / 2, 0]}
      >
        <boxGeometry />
        <MeshTransmissionMaterial
          background={new THREE.Color(config.bg)}
          {...config}
        />
        <Image
          raycast={() => null}
          ref={image}
          position={[0, 0, 0.7]}
          url={url}
        />
      </mesh>
      <Text
        ref={textRef}
        maxWidth={0.1}
        anchorX="left"
        anchorY="top"
        position={[0.55, GOLDENRATIO, 0]}
        fontSize={0.025}
      >
        {name.split("-").join(" ")}
      </Text>
    </group>
  );
}

export default Frame;
