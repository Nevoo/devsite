import { useHelper } from "@react-three/drei";
import { useRef } from "react";
import { DirectionalLightHelper } from "three";

export default function Lights() {
  const directionalLightRef = useRef();

  // useHelper(directionalLightRef, DirectionalLightHelper);

  return (
    <group>
      <pointLight
        distance={2}
        intensity={2}
        position={[0, 0, -1]}
        color="orange"
      />
      <spotLight
        decay={0}
        position={[10, 20, 10]}
        angle={0.12}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={1024}
      />

      <directionalLight
        ref={directionalLightRef}
        position={[4, 1, 20]}
        angle={0.1}
        intensity={Math.PI * 0.05}
      />
    </group>
  );
}
