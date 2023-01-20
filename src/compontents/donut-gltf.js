import React, { useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from '@react-three/fiber'
import { useSpring, animated, config } from '@react-spring/three'


export default function DonutGLTF(props) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF(
    "/new-donut-for-threejs.gltf"
  );
  const { actions } = useAnimations(animations, group);
  const [animationState, setAnimation] = useState(false);
  const [active, setActive] = useState(false);

  const {scale} = useSpring({ 
    scale: active ? 1.5 : 1, 
    config: config.wobbly, 
  })


  useFrame(({ mouse, viewport }) => {
    if(!animationState) {
      const x = (mouse.x * viewport.width) / 2.5
      const y = (mouse.y * viewport.height) / 2.5
      group.current.lookAt(x, y, 1)
    }
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        <animated.mesh
          scale={scale}
          onPointerOver={() => {
              setAnimation(true);
              props.onHover(true);
              actions.DonutAction.setEffectiveTimeScale(1)
              actions.DonutAction.play();
              setActive(true)
            }
          }
          onPointerOut={() =>{
              setAnimation(false);
              props.onHover(false);
              actions.DonutAction.setEffectiveTimeScale(0)
              setActive(false)
            }
          }
          // onClick={handleClick}
          name="Donut"
          castShadow
          receiveShadow
          geometry={nodes.Donut.geometry}
          material={materials["Material.003"]}
          position={[0, 0, 0.01]}
          rotation={[1.11, 0.25, -0.46]}
        >
          <group name="Icing">
            <mesh
              name="Torus003"
              castShadow
              receiveShadow
              geometry={nodes.Torus003.geometry}
              material={materials["Material.001"]}
            />
            <mesh
              name="Torus003_1"
              castShadow
              receiveShadow
              geometry={nodes.Torus003_1.geometry}
              material={materials.Sprinkle}
            />
          </group>
        </animated.mesh>
      </group>
    </group>
  );
}

useGLTF.preload("/new-donut-for-threejs.gltf");
