import { Text } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { Scroll, useScroll } from "@react-three/drei";
import useExplore from "@/src/hooks/useExplore";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";

export default function ProjectTitle({ projects }) {
  const titleRef = useRef();
  const containerRef = useRef();
  const scroll = useScroll();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isAnimating = useRef(false);
  const sectionsRef = useRef([]);

  useExplore(containerRef, {
    exploringProps: {
      opacity: 1,
      scale: 1,
    },
    notExploringProps: {
      opacity: 0,
      scale: 0.95,
    },
  });

  return (
    <Scroll html style={{ width: "100vw" }}>
      <div
        className="absolute left-0 w-full h-screen flex items-center"
        ref={containerRef}
        style={{ opacity: 0 }}
      >
        <div ref={titleRef} className="relative w-full">
          {projects.map((project, index) => (
            <section
              key={project.title}
              className="relative w-full flex items-center justify-center project-title"
              style={{
                top: `${index * 100}vh`,
              }}
            >
              <div className={`absolute left-64 text-white max-w-xl`}>
                <div className="relative overflow-hidden rounded-3xl bg-white/5">
                  <div
                    className="absolute inset-0 blur-3xl"
                    style={{
                      background:
                        "radial-gradient(circle at center, rgba(255,255,255,0.15), transparent)",
                      transform: "scale(1.5)",
                    }}
                  />
                  <div className="relative p-12 backdrop-blur-md">
                    <h2 className="text-7xl font-['Dirtyline'] leading-tight title mb-6">
                      {project.title}
                    </h2>
                    <p className="text-lg text-gray-300 mb-8 max-w-lg">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Sed vitae justo vel metus tincidunt eleifend.
                    </p>
                    <button
                      className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-300 backdrop-blur-sm font-medium"
                      onClick={() =>
                        console.log("Navigate to project:", project.title)
                      }
                    >
                      See More
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </Scroll>
  );
}
