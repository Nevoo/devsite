"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import styles from "./ExploreButton.module.css";

export default function GlowingOutlineButton({
  handleExplore,
  handleReset,
  isExploring,
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen translate-y-[30vh]">
      <motion.button
        className="relative px-6 py-3 text-lg font-medium text-white bg-purple-600 rounded-full overflow-hidden"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={!isExploring ? handleExplore : handleReset}
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          className="relative z-10 flex items-center justify-center"
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {!isExploring ? "Explore My Work" : "Back To Home"}
        </motion.span>
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3 }}
          style={{
            background: "linear-gradient(45deg, #ff00ff, #00ffff)",
            filter: "blur(8px)",
          }}
        />
        <motion.div
          className={`${styles.glow} absolute -inset-2 rounded-ull opacity-0`}
          animate={{
            opacity: isHovered ? 0.5 : 0,
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>
    </div>
  );
}
