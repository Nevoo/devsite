import React from "react";
import { useThree } from "@react-three/fiber";
import { Text, Center, Text3D } from "@react-three/drei";

export default function Headline({ children, ...props }) {
  const { width } = useThree((state) => state.viewport);
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
      position={[
        props.config.textPositionX,
        props.config.textPositionY,
        props.config.textPositionZ,
      ]}
    >
      <Text3D {...props.config} size={width / 8} font="/Inter_Bold.json">
        {children}
        <meshNormalMaterial />
      </Text3D>
    </Center>
  );
}
