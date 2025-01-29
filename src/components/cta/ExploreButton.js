"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import styles from "./ExploreButton.module.css";

export default function ExploreButton({
  handleExplore,
  handleReset,
  isExploring,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);

  return (
    <div className="inline-block relative">
      <motion.button
        ref={buttonRef}
        className="px-6 py-3 text-lg font-bold text-white bg-purple-600 rounded-full"
        onMouseEnter={(e) => {
          e.preventDefault();
          setIsHovered(true);
        }}
        onMouseLeave={() => setIsHovered(false)}
        onClick={!isExploring ? handleExplore : handleReset}
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={`absolute inset-0 rounded-full ${styles.gradientBg}`}
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3 }}
          style={{
            willChange: "transform, opacity",
          }}
        />
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
          className={`${styles.glow} absolute -inset-2 rounded-full opacity-0`}
          animate={{
            opacity: isHovered ? 0.5 : 0,
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{
            duration: 0.3,
            x: { duration: 0 },
            y: { duration: 0 },
          }}
        />
        <motion.svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          initial="hidden"
          animate={isHovered ? "visible" : "hidden"}
        >
          <motion.circle
            className={styles.outline}
            cx="50%"
            cy="50%"
            r="48%"
            fill="none"
            strokeWidth="1"
            stroke="white"
            variants={{
              hidden: {
                opacity: 0,
                pathLength: 0,
                rotate: 0,
              },
              visible: {
                opacity: [0, 1, 0],
                pathLength: 0.2,
                rotate: 360,
                transition: {
                  pathLength: { duration: 2, repeat: Infinity },
                  opacity: { duration: 2, repeat: Infinity },
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                },
              },
            }}
          />
        </motion.svg>
      </motion.button>
    </div>
  );
}
