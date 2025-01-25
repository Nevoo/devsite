import { useRef } from "react";
import { Image } from "@react-three/drei";
import { useProjectState } from "../../state/general";
import * as THREE from "three";

export function ProjectPortals() {
  const { projects } = useProjectState();
  const firstProject = projects[1] || { images: [] };
  const IMAGE_SCALE = 0.05;

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      {/* <ambientLight intensity={1} /> */}
      {/* <pointLight position={[10, 10, 10]} intensity={0.5} /> */}

      {firstProject.images[0] && (
        <Image
          transparent
          url={firstProject.images[0].url}
          side={THREE.DoubleSide}
          scale={0.2}
          position={[0, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            console.log("clicked image:", firstProject.images[0].url);
          }}
        >
          <planeGeometry args={[0.2, 0.2, 10, 10]} />
        </Image>
      )}
    </group>
  );
}
