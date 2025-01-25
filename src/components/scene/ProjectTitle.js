import { Text } from "@react-three/drei";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Scroll } from "@react-three/drei";

export default function ProjectTitle({ projects, currentIndex, isExploring }) {
  const textRefs = useRef([]);

  useEffect(() => {
    textRefs.current.forEach((ref, index) => {
      if (!ref) return;

      const isEven = index % 2 === 0;

      // Reset position and opacity
      gsap.set(ref.position, {
        x: isEven ? -3 : 3,
        y: 0,
      });

      gsap.set(ref.material, {
        opacity: index === currentIndex && isExploring ? 1 : 0,
      });

      // Animate current title
      if (index === currentIndex && isExploring) {
        gsap.fromTo(
          ref.position,
          {
            x: isEven ? -10 : 10,
          },
          {
            x: isEven ? -3 : 3,
            duration: 1,
            ease: "power2.out",
          }
        );

        gsap.to(ref.material, {
          duration: 1,
          ease: "power2.out",
        });
      }
    });
  }, [currentIndex, isExploring]);

  if (!isExploring) return null;

  return (
    <Scroll html style={{ width: "100vw" }}>
      <div className="absolute top-0 left-0 w-full">
        {projects.map((project, index) => (
          <section
            key={project.title}
            className="h-screen w-full flex items-center justify-center"
            style={{
              transition: "opacity 0.5s ease-in-out",
            }}
          >
            <div
              className={`absolute ${
                index % 2 === 0 ? "left-64" : "right-64"
              } text-white max-w-xl`}
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
