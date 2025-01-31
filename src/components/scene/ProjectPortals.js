import { useRef, useState, useEffect } from "react";
import { Image, useScroll, shaderMaterial } from "@react-three/drei";
import { useProjectState } from "../../state/general";
import * as THREE from "three";
import { useFrame, extend, useLoader } from "@react-three/fiber";
import gsap from "gsap";

const LiquidMaskMaterial = shaderMaterial(
  {
    currentTexture: new THREE.Texture(),
    nextTexture: new THREE.Texture(),
    progress: 0,
    resolution: new THREE.Vector2(1, 1),
  },
  // vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  `
    uniform sampler2D currentTexture;
    uniform sampler2D nextTexture;
    uniform float progress;
    uniform vec2 resolution;
    varying vec2 vUv;

    void main() {
      vec4 currentColor = texture2D(currentTexture, vUv);
      vec4 nextColor = texture2D(nextTexture, vUv);
      
      float transition = smoothstep(vUv.y - 0.1, vUv.y + 0.1, progress);
      vec4 finalColor = mix(currentColor, nextColor, transition);
      
      gl_FragColor = finalColor;
    }
  `
);

extend({ LiquidMaskMaterial });

export function ProjectPortals() {
  const { projects } = useProjectState();
  const scroll = useScroll();
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const materialRef = useRef();
  const [currentTexture, setCurrentTexture] = useState(null);
  const [nextTexture, setNextTexture] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const meshRef = useRef();

  // Update current project based on scroll position every frame
  useFrame(({ viewport }) => {
    const offset = scroll.offset;
    const totalProjects = projects.length;
    const newIndex = Math.min(
      Math.floor(offset * totalProjects),
      totalProjects - 1
    );

    // Adjust mesh scale to maintain aspect ratio
    if (meshRef.current && currentTexture) {
      const imageAspect =
        currentTexture.image.width / currentTexture.image.height;
      const targetWidth = 0.13 * imageAspect;
      const targetHeight = 0.13;
      meshRef.current.scale.set(targetWidth, targetHeight, 1);
    }

    if (newIndex !== currentProjectIndex && !isTransitioning) {
      const nextProject = projects[newIndex];
      if (nextProject?.images[0]) {
        setIsTransitioning(true);
        // Load next texture
        const texture = new THREE.TextureLoader().load(
          nextProject.images[0].url,
          (loadedTexture) => {
            loadedTexture.minFilter = THREE.LinearFilter;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.generateMipmaps = false;
            loadedTexture.needsUpdate = true;
            loadedTexture.encoding = THREE.sRGBEncoding;
            setNextTexture(loadedTexture);
            animateTransition(newIndex);
          }
        );
      }
    }
  });

  const animateTransition = (newIndex) => {
    if (!materialRef.current) return;

    // Reset progress
    materialRef.current.uniforms.progress.value = 0;

    const tl = gsap.timeline({
      onComplete: () => {
        setCurrentProjectIndex(newIndex);
        setCurrentTexture(nextTexture);
        setNextTexture(null);
        setIsTransitioning(false);
      },
    });

    tl.to(materialRef.current.uniforms.progress, {
      value: 1,
      duration: 1,
      ease: "power2.inOut",
    });
  };

  // Initial texture load
  useEffect(() => {
    if (projects[currentProjectIndex]?.images[0] && !currentTexture) {
      const texture = new THREE.TextureLoader().load(
        projects[currentProjectIndex].images[0].url,
        (loadedTexture) => {
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = false;
          loadedTexture.needsUpdate = true;
          loadedTexture.encoding = THREE.sRGBEncoding;
          setCurrentTexture(loadedTexture);
        }
      );
    }
  }, [currentProjectIndex, currentTexture]);

  // Update material uniforms when textures change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.currentTexture.value = currentTexture;
      materialRef.current.uniforms.nextTexture.value =
        nextTexture || currentTexture;

      if (currentTexture) {
        materialRef.current.uniforms.resolution.value.set(
          currentTexture.image.width,
          currentTexture.image.height
        );
      }
    }
  }, [currentTexture, nextTexture]);

  const currentProject = projects[currentProjectIndex] || { images: [] };

  return (
    <group rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
      {currentProject.images[0] && (
        <mesh ref={meshRef} position={[-0.025, 0.045, 0]}>
          <planeGeometry args={[1, 1]} />
          <liquidMaskMaterial
            ref={materialRef}
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
