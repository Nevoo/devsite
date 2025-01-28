import { useRef, useState } from "react";
import { Image, useScroll } from "@react-three/drei";
import { useProjectState } from "../../state/general";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function ProjectPortals() {
  const { projects } = useProjectState();
  const scroll = useScroll();
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const portalRef = useRef();

  // Update current project based on scroll position every frame
  useFrame(() => {
    const offset = scroll.offset; // 0 to 1
    const totalProjects = projects.length;
    const newIndex = Math.min(
      Math.floor(offset * totalProjects),
      totalProjects - 1
    );

    if (newIndex !== currentProjectIndex) {
      setCurrentProjectIndex(newIndex);
    }
  });

  const currentProject = projects[currentProjectIndex] || { images: [] };

  return (
    <group rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
      {/* <ambientLight intensity={1} /> */}
      {/* <pointLight position={[10, 10, 10]} intensity={0.5} /> */}

      {currentProject.images[0] && (
        <Image
          ref={portalRef}
          transparent
          url={currentProject.images[0].url}
          side={THREE.DoubleSide}
          scale={0.12}
          position={[-0.025, 0.045, 0]}
          renderOrder={1000}
          depthTest={false}
          depthWrite={false}
          onClick={(e) => {
            e.stopPropagation();
            console.log("clicked image:", currentProject.images[0].url);
          }}
        >
          <planeGeometry args={[1, 1, 10, 10]} />
        </Image>
      )}
    </group>
  );
}
