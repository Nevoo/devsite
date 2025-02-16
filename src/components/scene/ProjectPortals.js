import { useRef, useState, useEffect } from "react";
import {
  Image,
  useScroll,
  shaderMaterial,
  useVideoTexture,
} from "@react-three/drei";
import { useProjectState } from "../../state/general";
import * as THREE from "three";
import { useFrame, extend, useLoader } from "@react-three/fiber";
import gsap from "gsap";

const VideoPortal = ({ url, meshRef }) => {
  const videoTexture = useVideoTexture(url);

  useEffect(() => {
    if (videoTexture) {
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.generateMipmaps = false;
      videoTexture.needsUpdate = true;
      videoTexture.encoding = THREE.sRGBEncoding;
    }
  }, [videoTexture]);

  return (
    <mesh ref={meshRef} position={[-0.025, 0.045, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={videoTexture} transparent toneMapped={false} />
    </mesh>
  );
};

const ImagePortal = ({
  currentProject,
  meshRef,
  materialRef,
  currentTexture,
  nextTexture,
}) => {
  return (
    <mesh ref={meshRef} position={[-0.025, 0.045, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={currentTexture}
        transparent
        toneMapped={false}
        encoding={THREE.sRGBEncoding}
      />
    </mesh>
  );
};

export function ProjectPortals() {
  const { projects } = useProjectState();
  const scroll = useScroll();
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const materialRef = useRef();
  const [currentTexture, setCurrentTexture] = useState(null);
  const [nextTexture, setNextTexture] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const meshRef = useRef();
  const [showVideo, setShowVideo] = useState(false);

  // Update current project based on scroll position every frame
  useFrame(({ viewport }) => {
    const offset = scroll.offset;
    const totalProjects = projects.length;
    const newIndex = Math.min(
      Math.floor(offset * totalProjects),
      totalProjects - 1
    );

    // Adjust mesh scale to maintain aspect ratio
    if (meshRef.current) {
      let aspect = 16 / 9; // Default aspect ratio for videos
      if (currentTexture) {
        aspect = currentTexture.image.width / currentTexture.image.height;
      }
      const targetWidth = 0.13 * aspect;
      const targetHeight = 0.13;
      meshRef.current.scale.set(targetWidth, targetHeight, 1);
    }

    if (newIndex !== currentProjectIndex && !isTransitioning) {
      const nextProject = projects[newIndex];
      const currentProject = projects[currentProjectIndex];

      setIsTransitioning(true);

      // Handle transition between different content types
      if (nextProject.type !== currentProject?.type) {
        if (nextProject.type === "video") {
          // Transitioning to video
          const tl = gsap.timeline({
            onComplete: () => {
              setCurrentProjectIndex(newIndex);
              setShowVideo(true);
              setIsTransitioning(false);
              setCurrentTexture(null);
              setNextTexture(null);
            },
          });

          if (materialRef.current) {
            tl.to(materialRef.current, {
              opacity: 0,
              duration: 0.5,
              ease: "power2.inOut",
            });
          } else {
            setCurrentProjectIndex(newIndex);
            setShowVideo(true);
            setIsTransitioning(false);
          }
        } else {
          // Transitioning to gallery
          setShowVideo(false);

          // Load the first image of the gallery
          const texture = new THREE.TextureLoader().load(
            nextProject.images[0].url,
            (loadedTexture) => {
              loadedTexture.minFilter = THREE.LinearFilter;
              loadedTexture.magFilter = THREE.LinearFilter;
              loadedTexture.generateMipmaps = false;
              loadedTexture.needsUpdate = true;
              loadedTexture.encoding = THREE.sRGBEncoding;

              // Reset progress before setting new textures
              if (materialRef.current) {
                materialRef.current.uniforms.progress.value = 0;
              }

              setCurrentTexture(loadedTexture);
              setNextTexture(null);
              setCurrentProjectIndex(newIndex);
              setIsTransitioning(false);
            }
          );
        }
      } else {
        // Handle transitions within the same content type
        if (nextProject.type === "gallery" && nextProject.images[0]) {
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
        } else if (nextProject.type === "video") {
          setCurrentProjectIndex(newIndex);
          setIsTransitioning(false);
        }
      }
    }
  });

  const animateTransition = (newIndex) => {
    if (!materialRef.current) {
      setCurrentProjectIndex(newIndex);
      setCurrentTexture(nextTexture);
      setNextTexture(null);
      setIsTransitioning(false);
      return;
    }

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

  // Initial content setup
  useEffect(() => {
    const currentProject = projects[currentProjectIndex];
    if (!currentProject) return;

    setShowVideo(currentProject.type === "video");

    if (
      currentProject.type === "gallery" &&
      currentProject.images[0] &&
      !currentTexture
    ) {
      const texture = new THREE.TextureLoader().load(
        currentProject.images[0].url,
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
  }, [currentProjectIndex]);

  // Update material when texture changes
  useEffect(() => {
    if (materialRef.current && !showVideo) {
      materialRef.current.map = currentTexture;
    }
  }, [currentTexture, showVideo]);

  const currentProject = projects[currentProjectIndex] || { images: [] };

  return (
    <group rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
      {showVideo ? (
        <VideoPortal url={currentProject.videoUrl} meshRef={meshRef} />
      ) : (
        currentProject.type === "gallery" &&
        currentProject.images[0] && (
          <ImagePortal
            currentProject={currentProject}
            meshRef={meshRef}
            materialRef={materialRef}
            currentTexture={currentTexture}
            nextTexture={nextTexture}
          />
        )
      )}
    </group>
  );
}
