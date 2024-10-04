import { useEffect, useMemo, useRef, useState } from "react";
import { animated, useTransition, useSpring } from "@react-spring/three";
import useGeneralState from "../state/general";
import { shaderMaterial, Text, useTexture } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import { extend, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

const TextMaterial = shaderMaterial(
    {
        effectFactor: 1.2,
        direction: 0,
        time: 0,
        iChannel0: null,
        color: new THREE.Color("#fff"),
    },
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    `
    varying vec2 vUv;
    uniform sampler2D iChannel0;
    uniform float time;
    uniform float direction;
    uniform vec3 color;
  
    float r(in vec2 p) {
      return fract(cos(p.x*.98 + p.y*20.23) * 40.53);
    }
  
    float n(in vec2 p) {
      vec2 fn = floor(p);
      vec2 sn = smoothstep(vec2(0), vec2(1), fract(p));
  
      float h1 = mix(r(fn), r(fn + vec2(1,0)), sn.x);
      float h2 = mix(r(fn + vec2(0,1)), r(fn + vec2(1)), sn.x);
      return mix(h1 ,h2, sn.y);
    }
  
    float noise(in vec2 p) {
      return n(p/10.5) * 0.52 +
              n(p/10.2) * 0.51  +
              n(p/10.)  * 0.5;
    }
  
    void main() {
      vec3 col = texture(iChannel0, vUv).rgb;   
      
      vec2 uv0 = direction - (vUv*8.0 - 1.0) * 0.5;
      float length0 = sqrt(dot(uv0, uv0));
      float mask = 1.0 - smoothstep(0.0, 1.0, length0 * 3.0 - (time*(col.r*0.9+0.5)));
      mask *= dot(vec3(1.0), vec3(1.0/2.5));
      vec3 finalColor = (1.0-mask) * vec3(0.0) + mask*vec3(color);
      gl_FragColor = vec4(finalColor, mask);
    }
    `
);

extend({ TextMaterial });

export function AnimatedText({ text }) {
    const groupRef = useRef();
    const titleRef = useRef();
    const mainIndex = useGeneralState((state) => state.index);
    const maskTexture = useLoader(THREE.TextureLoader, "/mask.jpg");

    useFrame(({ viewport }) => {
        if (titleRef.current) {
            // Calculate the position based on the viewport size
            const leftEdge = -viewport.width / 2;
            titleRef.current.position.x = leftEdge + 2; // Position 3 units to the left of the left edge

            // Scale the text based on the viewport height
            const scale = viewport.height / 3; // Adjust this divisor to change the relative size of the text
            titleRef.current.scale.set(scale, scale, scale);
        }
    });

    useEffect(() => {
        if (titleRef.current) {
            const timeline = gsap.timeline();

            timeline.fromTo(
                titleRef.current.material,
                { time: 0 },
                { time: 50, duration: 3, ease: "power1.out" }
            );

            titleRef.current.material.color = new THREE.Color("#ffffff");
            titleRef.current.material.direction = -2 + Math.random() * 4;
        }
    }, [mainIndex]);

    return (
        <Text
            ref={titleRef}
            font="/fonts/Dirtyline-36daysoftype.otf"
            fontSize={0.5}
            // position={[-3, 0, 0]}
            color="#ffffff"
        >
            {text}
            <textMaterial
                ref={titleRef}
                iChannel0={maskTexture}
                attach="material"
            />
        </Text>
    );
}

export function TextCarousel() {
    const scrollDistance = useGeneralState((state) => state.scrollDistance);
    const index = useGeneralState((state) => state.index);
    const texts = [
        "TraVel",
        "aNImaLS",
        "NaTurE",
        "StReeT",
        "CoNceRtS",
        "WeddINgs",
        "TraveL2",
    ];
    const reversedIndex = texts.length - 1 - index;
    return (
        <group>
            <AnimatedText
                text={texts[reversedIndex]}
                // scrollDistance={scrollDistance}
            />
        </group>
    );
}

// ChromaticAberrationEffect
// font: "/fonts/SixCaps-Regular.ttf",
// font: "/fonts/DMSans-Light.ttf",
// Clamp color rgb value so it doesn't go over 1.0
