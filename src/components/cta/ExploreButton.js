"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import styles from "./ExploreButton.module.css";

export default function ExploreButton({
  handleExplore,
  handleReset,
  isExploring,
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={styles.buttonWrapper}>
      <motion.button
        className={`${styles.button} ${isHovered ? styles.active : ""}`}
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
        <span className={styles.spark}></span>
        <span className={styles.backdrop}></span>
        <motion.span
          className={`${styles.text} font-['PPMori'] font-bold`}
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {!isExploring ? "Explore My Work" : "Back To Home"}
        </motion.span>
      </motion.button>
    </div>
  );
}
