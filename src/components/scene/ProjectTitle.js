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
      transformOrigin: "center top",
    },
    notExploringProps: {
      opacity: 0,
      scale: 0.8,
      transformOrigin: "center top",
    },
  });

  const gotoSection = (index, direction) => {
    if (isAnimating.current) return;

    // Wrap index to stay within bounds
    const wrap = gsap.utils.wrap(0, projects.length);
    index = wrap(index);

    isAnimating.current = true;
    const fromTop = direction === -1;
    const dFactor = fromTop ? -1 : 1;

    const tl = gsap.timeline({
      defaults: { duration: 1, ease: "power2.inOut" },
      onComplete: () => {
        isAnimating.current = false;
        setCurrentIndex(index);
      },
    });

    if (currentIndex >= 0) {
      // Animate out current section
      const currentSection = sectionsRef.current[currentIndex];
      const currentSelect = gsap.utils.selector(currentSection);

      tl.to(
        currentSection,
        {
          yPercent: -15 * dFactor,
          autoAlpha: 0,
        },
        0
      );

      tl.to(
        currentSelect(".title"),
        {
          yPercent: -50 * dFactor,
          autoAlpha: 0,
        },
        0
      );
    }

    // Calculate center position for the target section
    const targetY = index * window.innerHeight;

    // Scroll to new section
    tl.to(
      scroll.el,
      {
        scrollTop: targetY,
        duration: 1,
        ease: "power2.inOut",
      },
      0
    );

    // Animate in new section
    const newSection = sectionsRef.current[index];
    const newSelect = gsap.utils.selector(newSection);

    tl.fromTo(
      newSection,
      {
        yPercent: 15 * dFactor,
        autoAlpha: 0,
      },
      {
        yPercent: 0,
        autoAlpha: 1,
      },
      0.2
    );

    // Animate title
    tl.fromTo(
      newSelect(".title"),
      {
        autoAlpha: 0,
        yPercent: 50 * dFactor,
      },
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      0.4
    );
  };

  useGSAP(
    () => {
      // Set up Observer for wheel and touch events
      Observer.create({
        type: "wheel,touch,pointer",
        wheelSpeed: -1,
        onDown: () => !isAnimating.current && gotoSection(currentIndex - 1, -1),
        onUp: () => !isAnimating.current && gotoSection(currentIndex + 1, 1),
        tolerance: 10,
        preventDefault: true,
        lockAxis: true,
      });

      // Initialize sections
      sectionsRef.current = gsap.utils.toArray(".project-title");

      // Set initial visibility
      gsap.set(sectionsRef.current, { autoAlpha: 0 });

      // Go to first section on mount
      if (currentIndex === -1) {
        gotoSection(0, 1);
      }

      return () => {
        Observer.getAll().forEach((obs) => obs.kill());
      };
    },
    { scope: titleRef, dependencies: [] }
  );

  return (
    <Scroll html style={{ width: "100vw" }}>
      <div
        className="absolute top-0 left-0 w-full"
        ref={containerRef}
        style={{ opacity: 0 }}
      >
        <div ref={titleRef}>
          {projects.map((project, index) => (
            <section
              key={project.title}
              className="h-screen w-full flex items-center justify-center project-title"
            >
              <div
                className={`absolute left-64 text-white max-w-xl`}
                style={{
                  transform: `translateY(${index % 2 === 0 ? "-25%" : "25%"})`,
                }}
              >
                <h2 className="text-7xl font-['Dirtyline'] leading-tight title">
                  {project.title}
                </h2>
              </div>
            </section>
          ))}
        </div>
      </div>
    </Scroll>
  );
}
