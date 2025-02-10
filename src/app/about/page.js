"use client";

import React from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function About() {
  const { scrollYProgress } = useScroll();

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

  return (
    <>
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
          <div className="relative h-screen flex items-center justify-center">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute top-32"
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
