import { useRef, useState } from "react";
import { Image } from "@react-three/drei";
import { useProjectState } from "../../state/general";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function ProjectPortals() {
  const { projects } = useProjectState();
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollSpeed = 0.001;
  const maxScroll =
    Math.max(0, Math.floor(projects[0]?.images.length / 2) - 2) * 0.12;

  const GRID_SIZE = 2;
  const SPACING = 0.06;
  const IMAGE_SCALE = 0.05;

  useFrame((state) => {
    if (state.mouse.y !== 0) {
      setScrollPosition((prev) => {
        const newPos = prev + state.mouse.y * scrollSpeed;
        return THREE.MathUtils.clamp(newPos, 0, maxScroll);
      });
    }
  });

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {projects.map((project) =>
        project.images.map((image, imageIndex) => {
          const x = (imageIndex % GRID_SIZE) * SPACING;
          const y = Math.floor(imageIndex / GRID_SIZE) * SPACING * 2;

          return (
            <Image
              url={image.url}
              scale={IMAGE_SCALE}
              key={image.url}
              position={[
                x - (GRID_SIZE * SPACING) / 2 + 0.0,
                -y +
                  Math.floor(project.images.length / GRID_SIZE) * SPACING +
                  scrollPosition,
                0,
              ]}
              onClick={(e) => {
                e.stopPropagation();
                console.log("clicked image:", image.url);
              }}
            />
          );
        })
      )}
    </group>
  );
}
