import { animated, useSpring, config } from "@react-spring/three";
import { Text } from "@react-three/drei";
import { suspend } from "suspend-react";

const gilroy = import("../../../../fonts/Gilroy/Gilroy-ExtraBold.otf");

export const CategoryTitle = ({
    hovered,
    title,
    position,
    rotation,
    scale,
    offset,
}) => {
    const { fontSize, color } = useSpring({
        fontSize: hovered ? 0.7 : 0.6,
        color: hovered ? "#078080" : "#232323",
        config: config.wobbly,
    });

    const AnimatedText = animated(Text);

    return (
        <AnimatedText
            scale={scale}
            fontSize={fontSize}
            font={suspend(gilroy).default}
            color={color}
            position={[position[0], position[1] - offset ?? 3, position[2]]}
            rotation={rotation}
        >
            {title}
        </AnimatedText>
    );
};
