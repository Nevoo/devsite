"use client";

import { motion } from "framer-motion";
import ExploreButton from "./cta/ExploreButton";
import { useExploreState } from "../state/explore";
import useExplore from "@/src/hooks/useExplore";
import { useRef } from "react";

export default function HeroSection() {
  const containerRef = useRef();
  const isExploring = useExploreState((state) => state.isExploring);
  const setIsExploring = useExploreState((state) => state.setIsExploring);

  useExplore(containerRef, {
    exploringProps: {
      x: "-100%",
      opacity: 0,
    },
    notExploringProps: {
      x: "0%",
      opacity: 1,
    },
  });

  const handleExplore = () => {
    setIsExploring(true);
  };

  const handleReset = () => {
    setIsExploring(false);
  };

  return (
    <motion.div
      ref={containerRef}
      className="absolute left-0 top-0 z-10 flex h-screen w-3/5 flex-col justify-center px-64"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.h1
        className="mb-4 font-['PPMori'] text-6xl font-bold tracking-tight text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        Hi, I'm Rouven
      </motion.h1>
      <motion.p
        className="mb-8 font-['PPMori'] text-xl text-gray-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      >
        Photo- / Videographer and Software Engineer
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
      >
        <ExploreButton
          handleExplore={handleExplore}
          handleReset={handleReset}
          isExploring={isExploring}
        />
      </motion.div>
    </motion.div>
  );
}
