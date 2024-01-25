import React, { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text, Center, Text3D, Edges, Bounds } from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/three";
import { LayerMaterial, Depth, Fresnel } from "lamina";
import { useControls } from "leva";

export default function Headline({ children, shouldAnimate, ...props }) {
    const ref = useRef();
    const { width } = useThree((state) => state.viewport);

    const AnimatedText3D = animated(Text3D);

    const { gradient } = useControls({
        gradient: { value: 0.7, min: 0, max: 1 },
    });

    // Animate gradient
    useFrame((state) => {
        const sin = Math.sin(state.clock.elapsedTime / 2);
        const cos = Math.cos(state.clock.elapsedTime / 2);
        ref.current.layers[0].origin.set(cos / 2, 0, 0);
        ref.current.layers[1].origin.set(cos, sin, cos);
        ref.current.layers[2].origin.set(sin, cos, sin);
        ref.current.layers[3].origin.set(cos, sin, cos);
    });

    return (
        <Center rotation={[0, 0, 0]} position={props.config.textPosition}>
            <Bounds fit clip observe margin={1.25}>
                <AnimatedText3D
                    {...props.config}
                    size={width / 16}
                    font="/font-json/Gilroy.json"
                >
                    {children}
                    <LayerMaterial ref={ref} toneMapped={false}>
                        <Depth
                            colorA="#FF2692"
                            colorB="#2F4FFF"
                            alpha={1}
                            mode="normal"
                            near={0.5 * gradient}
                            far={0.5}
                            origin={[0, 0, 0]}
                        />
                        <Depth
                            colorA="blue"
                            colorB="#FFAA26"
                            alpha={1}
                            mode="add"
                            near={2 * gradient}
                            far={2}
                            origin={[0, 1, 2]}
                        />
                        <Depth
                            colorA="green"
                            colorB="#FFAA26"
                            alpha={1}
                            mode="add"
                            near={3 * gradient}
                            far={3}
                            origin={[0, 1, -1]}
                        />
                        <Depth
                            colorA="white"
                            colorB="red"
                            alpha={1}
                            mode="overlay"
                            near={1.5 * gradient}
                            far={1.5}
                            origin={[1, -1, -1]}
                        />
                        <Fresnel
                            mode="add"
                            color="white"
                            intensity={0.5}
                            power={1}
                            bias={0.05}
                        />
                    </LayerMaterial>
                    <Edges color="white" />
                </AnimatedText3D>
            </Bounds>
        </Center>
    );
}
