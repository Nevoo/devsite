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

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-12 left-1/2 -translate-x-1/2 text-white flex flex-col items-center gap-3 mix-blend-difference z-50"
        style={{ opacity }}
        initial={{ opacity: 0, y: 5 }}
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
          className="flex flex-col items-center gap-3 cursor-pointer"
          onClick={scrollToBottom}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-sm uppercase font-PPMori tracking-wider font-light">
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const resize = () => {
      setDimension({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", resize);
    resize();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      {!isMobile && <ScrollArrow />}
      {/* Scroll Content */}
      <div
        className={`min-h-[200vh] bg-black text-white ${
          isMobile ? "p-0" : "p-8"
        } overflow-x-hidden overscroll-none`}
      >
        {/* First Page */}
        <div className="max-w-7xl mx-auto">
          <div
            ref={textRef}
            className={`relative ${
              isMobile ? "flex flex-col pb-8" : "h-screen flex items-center"
            } justify-center`}
          >
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                y: isMobile ? 0 : textY,
              }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center z-0 mix-blend-difference pt-32 md:pt-0"
            >
              <h1
                className={`${
                  isMobile ? "text-6xl" : "text-[16rem]"
                } font-[Dirtyline] text-center flex flex-col leading-none`}
              >
                <span>AbOUt</span>
                <span className={isMobile ? "mt-4" : "mt-[200px]"}>mYSeLf</span>
              </h1>
            </motion.div>

            {/* Image for mobile */}
            {isMobile && (
              <div className="w-full px-8 mt-16">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative w-full h-[300px] mx-auto max-w-[400px]"
                >
                  <Image
                    src="/images/aboutme.jpg"
                    alt="About Me"
                    fill
                    sizes="100vw"
                    priority
                    className="rounded-3xl object-cover"
                  />
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Second Page - White with rounded corners */}
        <motion.div
          style={{
            scale: whiteScale,
          }}
          className={`min-h-screen bg-white ${
            isMobile ? "rounded-t-xl mx-0" : "rounded-t-[3rem] mx-8"
          } text-black p-8 md:p-16 origin-bottom relative isolate flex items-center`}
        >
          <div className="w-full max-w-7xl mx-auto">
            <div
              className={`${
                isMobile ? "grid-cols-1 gap-8 pt-8" : "grid-cols-2 gap-16"
              } grid items-center`}
            >
              <div
                className={`space-y-6 font-light text-lg ${isMobile ? "" : ""}`}
              >
                <h2 className="text-4xl font-bold">Hi I'm Rouven!</h2>
                <p>
                  I'm a Full Stack Developer, Filmmaker, and Photographer with a
                  passion for creating digital products and visual experiences.
                  With over 6 years of experience in development, I focus on
                  bringing ideas to life in ways that make a real difference.
                </p>
                <p>
                  I love working in tech because I can blend analytical thinking
                  with creativity. Adding filmmaking and photography into the
                  mix gives me the best of both worlds - I get to combine my
                  technical expertise with creative expression while working
                  with great people on things I'm passionate about.
                </p>
                <p>
                  This blend of technical expertise and creative skills gives me
                  a unique perspective on every project I tackle. I approach
                  each challenge with both analytical thinking and creative
                  vision, whether I'm building a web application, an app or
                  crafting visual content.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">Want to collaborate?</span>
                  <a
                    href="mailto:rouven@luehrs.dev"
                    className="inline-block font-medium text-black hover:text-white bg-transparent hover:bg-black border-2 border-black rounded-full px-4 py-2 transition-colors duration-300"
                  >
                    Let's talk!
                  </a>
                </div>
              </div>
              <div className={`${isMobile ? "hidden" : "w-full h-full"}`}></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Desktop Image */}
      {!isMobile && (
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
          className="fixed w-[400px] h-[500px] z-30 inset-0 m-auto pointer-events-none"
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
      )}
    </>
  );
}
