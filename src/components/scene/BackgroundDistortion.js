import { MeshTransmissionMaterial, Text } from "@react-three/drei";
import { forwardRef, useRef } from "react";
import * as THREE from "three";

const BackgroundDistortion = forwardRef(function (props, ref) {
  const materialRef = useRef();
  const textGroupRef = useRef();
  const textRefs = useRef([]);
  const textPositions = [
    [0, 2, -5],
    [0, 0, -5],
    [0, -2, -5],
  ];

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[10, 10, 0.1]} position={[0, 0, -4]} />
        <MeshTransmissionMaterial
          ref={materialRef}
          ior={1.2}
          thickness={1.5}
          anisotropy={0.1}
          chromaticAberration={0.04}
          distortion={0}
          distortionScale={0}
          temporalDistortion={0.01}
        />
      </mesh>

      <group ref={textGroupRef}>
        {textPositions.map((position, index) => (
          <Text
            key={index}
            ref={(el) => (textRefs.current[index] = el)}
            position={position}
            fontSize={2}
            font="fonts/Dirtyline-36daysoftype.otf"
            color="white"
            anchorX="center"
            anchorY="middle"
            side={THREE.DoubleSide}
            pointerEvents="none"
            fillOpacity={0}
          >
            eXpLoRe
          </Text>
        ))}
      </group>
    </group>
  );
});

export default BackgroundDistortion;
