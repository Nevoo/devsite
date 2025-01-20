import { useRef } from "react";
import { MeshPortalMaterial, Image } from "@react-three/drei";
import { useProjectState } from "../../state/general";
import * as THREE from "three";

export function ProjectPortals() {
  const { projects } = useProjectState();
  const portalRefs = useRef([]);

  return (
    <group>
      {projects.map((project, projectIndex) => (
        <mesh
          key={project.title}
          position={[projectIndex * 2 - (projects.length - 1), 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[1.5, 1.5]} />
          <MeshPortalMaterial>
            <color attach="background" args={["#000000"]} />
            <ambientLight intensity={1} />
            <pointLight position={[10, 10, 10]} intensity={0.5} />
            <group>
              {project.images.map((image, imageIndex) => {
                const position = [
                  (imageIndex % 2) * 2 - 1,
                  Math.floor(imageIndex / 2) * -2 + 1,
                  -2,
                ];

                return (
                  <Image
                    key={image.url}
                    url={image.url}
                    position={position}
                    scale={[
                      1,
                      image.scale ? image.scale[0] / image.scale[1] : 1,
                      1,
                    ]}
                    transparent
                    opacity={1}
                  />
                );
              })}
            </group>
          </MeshPortalMaterial>
        </mesh>
      ))}
    </group>
  );
}
