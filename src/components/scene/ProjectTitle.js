import { Text } from "@react-three/drei";
import { useRef } from "react";
import { Scroll } from "@react-three/drei";
import useExplore from "@/src/hooks/useExplore";

export default function ProjectTitle({ projects }) {
  const titleRef = useRef();

  useExplore(titleRef, {
    exploringProps: {
      opacity: 1,
      scale: 1,
      transformOrigin: "center top",
    },
    notExploringProps: {
      opacity: 0,
      scale: 0.8,
      transformOrigin: "center top",
    },
  });

  return (
    <Scroll html style={{ width: "100vw" }}>
      <div className="absolute top-0 left-0 w-full opacity-0" ref={titleRef}>
        {projects.map((project, index) => (
          <section
            key={project.title}
            className="h-screen w-full flex items-center justify-center"
            style={{
              transition: "opacity 0.5s ease-in-out",
            }}
          >
            <div
              className={`absolute left-64 text-white max-w-xl`}
              style={{
                transform: `translateY(${index % 2 === 0 ? "-25%" : "25%"})`,
              }}
            >
              <h2 className="text-7xl font-['Dirtyline'] leading-tight">
                {project.title}
              </h2>
            </div>
          </section>
        ))}
      </div>
    </Scroll>
  );
}
