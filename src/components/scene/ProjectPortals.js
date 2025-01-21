import { useRef } from "react";
import { Image } from "@react-three/drei";
import { useProjectState } from "../../state/general";
import * as THREE from "three";

export function ProjectPortals() {
  const { projects } = useProjectState();

  const GRID_SIZE = 4;
  const SPACING = 4.5;
  const IMAGE_SCALE = 1;

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {projects.map((project) =>
        project.images.map((image, imageIndex) => {
          const x = (imageIndex % GRID_SIZE) * SPACING;
          const y = Math.floor(imageIndex / GRID_SIZE) * SPACING;
          const width = IMAGE_SCALE;
          const height = image.scale
            ? (IMAGE_SCALE * image.scale[0]) / image.scale[1]
            : IMAGE_SCALE;

          return (
            <Image
              url={image.url}
              scale={0.1}
              key={image.url}
              position={[
                x - (GRID_SIZE * SPACING) / 2,
                -y +
                  (Math.floor(project.images.length / GRID_SIZE) * SPACING) / 2,
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
