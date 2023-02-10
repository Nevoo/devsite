import React from "react";
import { useThree } from "@react-three/fiber";
import { Text, Center, Text3D } from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/three";

export default function Headline({ children, shouldAnimate, ...props }) {
  const { width } = useThree((state) => state.viewport);

  const { scale } = useSpring({
    scale: shouldAnimate ? 1.2 : 1,
    config: config.wobbly,
  });

  const AnimatedText3D = animated(Text3D);

  return (
    // <Text
    //   position={props.position}
    //   lineHeight={0.8}
    //   //   font="/Ki-Medium.ttf"
    //   fontSize={width / 8}
    //   material-toneMapped={false}
    //   anchorX="center"
    //   anchorY="middle"
    // >
    //   {children}
    // </Text>
    <Center
      rotation={[-0.5, -0.25, 0]}
      position={props.config.textPosition}
      //   scale={scale}
    >
      <AnimatedText3D
        {...props.config}
        size={width / 8}
        font="/Inter_Bold.json"
      >
        {children}
        <meshNormalMaterial />
      </AnimatedText3D>
    </Center>
  );
}
