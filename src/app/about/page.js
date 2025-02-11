"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const ScrollArrow = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-12 left-1/2 -translate-x-1/2 text-white flex flex-col items-center gap-3 pointer-events-none mix-blend-difference"
        style={{ opacity }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-sm uppercase tracking-wider font-light">
            Scroll
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function About() {
  const textRef = useRef(null);
  const [dimension, setDimension] = useState({ width: 0, height: 0 });

  // Scroll progress for the entire page
  const { scrollYProgress } = useScroll();

  // Scroll progress specifically for the text section
  const { scrollYProgress: textScrollProgress } = useScroll({
    target: textRef,
    offset: ["start end", "end start"],
  });

  // Add spring physics to smooth out the scroll values
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    restDelta: 0.1,
  });

  const imageScale = useTransform(smoothProgress, [0, 0.5], [1, 1.5]);
  const imageX = useTransform(smoothProgress, [0, 0.5], [0, 300]);

  // Scale transform for the white section
  const whiteScale = useTransform(smoothProgress, [0.3, 0.8], [0.8, 1]);

  // Parallax effect for the text based on viewport height
  const { height } = dimension;
  const textY = useTransform(
    textScrollProgress,
    [0, 1],
    [-height * 0.5, height * 0.5]
  );

  useEffect(() => {
    const resize = () => {
      setDimension({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", resize);
    resize();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <ScrollArrow />
      {/* Fixed Image Container that's independent of scroll container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          scale: imageScale,
          x: imageX,
        }}
        transition={{
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="fixed w-[400px] h-[500px] z-10 inset-0 m-auto pointer-events-none"
      >
        <Image
          src="/images/aboutme.jpg"
          alt="About Me"
          fill
          sizes="400px"
          priority
          className="rounded-3xl object-cover"
        />
      </motion.div>

      {/* Scroll Content */}
      <div className="min-h-[200vh] bg-black text-white p-8 overflow-x-hidden overscroll-none">
        {/* First Page */}
        <div className="max-w-7xl mx-auto">
          <div
            ref={textRef}
            className="relative h-screen flex items-center justify-center"
          >
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                y: textY,
              }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center"
            >
              <h1 className="text-[16rem] font-[Dirtyline] text-center flex flex-col leading-none">
                <span>AbOUt</span>
                <span className="mt-[200px]">mYSeLf</span>
              </h1>
            </motion.div>
          </div>
        </div>

        {/* Second Page - White with rounded corners */}
        <motion.div
          style={{
            scale: whiteScale,
          }}
          className="h-screen bg-white rounded-t-[3rem] text-black p-16 origin-bottom"
        >
          <div className="max-w-7xl mx-auto">
            {/* Add your content for the second page here */}
          </div>
        </motion.div>
      </div>
    </>
  );
}
