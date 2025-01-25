import { useRef } from "react";

export default function Lights() {
  const directionalLightRef = useRef();

  return (
    <group>
      <pointLight
        distance={2}
        intensity={2}
        position={[1, 0.5, 0]}
        color="orange"
      />
      {/* <hemisphereLight intensity={0.15} groundColor="black" /> */}
      <spotLight
        decay={0}
        position={[10, 20, 10]}
        angle={0.12}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={1024}
      />

      {/* <ambientLight intensity={Math.PI} /> */}
      <directionalLight
        ref={directionalLightRef}
        position={[-3, 1, 20]}
        angle={0.1}
        intensity={Math.PI * 0.05}
      />
      {/* <Environment preset="city" blur={1} /> */}
      {/* <ContactShadows
                  resolution={512}
                  position={[0, -0.8, 0]}
                  opacity={1}
                  scale={10}
                  blur={2}
                  far={0.8}
              /> */}
    </group>
  );
}
