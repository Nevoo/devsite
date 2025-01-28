import { useShallow } from "zustand/react/shallow";
import { useExploreState } from "../state/explore";
import { useEffect } from "react";
import gsap from "gsap";

const defaultExploringProps = {
  duration: 1.2,
  ease: "power2.inOut",
};

const defaultNotExploringProps = {
  duration: 1.2,
  ease: "power2.inOut",
};

/**
 * Custom hook for handling explore animations
 * @param {Object} ref - Reference to the element to animate
 * @param {Object} props - Animation properties
 * @param {Object} props.exploringProps - Properties for the exploring state animation
 * @param {Object} props.notExploringProps - Properties for the not exploring state animation
 * @param {Object} props.target - Optional target property on the ref (e.g., 'position', 'rotation')
 */
const useExplore = (ref, props = {}) => {
  const isExploring = useExploreState((state) => state.isExploring);

  useEffect(() => {
    if (!ref.current) return;

    const exploringProps = {
      ...defaultExploringProps,
      ...props.exploringProps,
    };

    const notExploringProps = {
      ...defaultNotExploringProps,
      ...props.notExploringProps,
    };

    // If a target is specified (e.g., 'position' or 'rotation'), animate that property
    const target = props.target ? ref.current[props.target] : ref.current;

    gsap.to(target, {
      ...(isExploring ? exploringProps : notExploringProps),
    });
  }, [isExploring, ref, props]);
};

export default useExplore;
