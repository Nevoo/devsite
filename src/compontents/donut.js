import React, { useRef } from "react"
import { useGLTF, PerspectiveCamera, useAnimations } from "@react-three/drei";

export default function Donut(props) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF("/new-donut.glb");
  const { actions } = useAnimations(animations, group);

  return (
    <group scale={30} ref={group} {...props} dispose={null}>
      <group name="Scene">
        <PerspectiveCamera
          name="Camera"
          makeDefault={false}
          far={1000}
          near={0.1}
          fov={22.9}
          position={[0.46, 0, 0.01]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <mesh
          name="Donut"
          castShadow
          receiveShadow
          geometry={nodes.Donut.geometry}
          material={materials["Material.003"]}
          position={[0, 0, 0.01]}
          rotation={[1.11, 0.25, -0.46]}
        >
          <mesh
            name="Icing"
            castShadow
            receiveShadow
            geometry={nodes.Icing.geometry}
            material={materials["Material.001"]}
          />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload("/new-donut.glb");