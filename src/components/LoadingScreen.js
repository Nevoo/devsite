"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function LoadingScreen({ isVisible = true }) {
  const [counter, setCounter] = useState(0);
  const [showBlocks, setShowBlocks] = useState(false);
  const animationRef = useRef(null);
  const counterRef = useRef(null);
  const blocksRef = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reset state when becoming visible
    if (isVisible) {
      setCounter(0);
      setShowBlocks(false);
      if (containerRef.current) {
        containerRef.current.style.display = "flex";
        containerRef.current.style.opacity = 1;
      }
      if (counterRef.current) {
        counterRef.current.style.opacity = 1;
        counterRef.current.style.scale = 1;
      }
      blocksRef.current.forEach((block) => {
        if (block) {
          block.style.height = "100%";
        }
      });
    }

    // Clear any existing animation
    if (animationRef.current) {
      animationRef.current.kill();
    }

    if (!isVisible) return;

    const tl = gsap.timeline();

    // Initial setup
    gsap.set(blocksRef.current, {
      height: "100%",
      backgroundColor: "#000000",
    });

    // Counter animation with easing
    tl.to(
      {},
      {
        duration: 2.5,
        ease: "power2.inOut",
        onUpdate: () => {
          const progress = Math.round(tl.progress() * 100);
          setCounter(progress);
        },
        onComplete: () => {
          setShowBlocks(true);
          // Scale and fade effect for counter
          gsap.to(counterRef.current, {
            scale: 1.2,
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut",
          });
          // Reveal animation with blocks
          gsap.to(blocksRef.current, {
            height: "0%",
            duration: 1,
            ease: "power2.inOut",
            stagger: {
              amount: 0.5,
              from: "center",
            },
            onComplete: () => {
              gsap.to(containerRef.current, {
                opacity: 0,
                duration: 0.5,
                onComplete: () => {
                  if (containerRef.current) {
                    containerRef.current.style.display = "none";
                  }
                },
              });
            },
          });
        },
      }
    );

    animationRef.current = tl;
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="loading-screen"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        zIndex: 1000,
      }}
    >
      {/* Percentage counter */}
      <div
        ref={counterRef}
        style={{
          color: "#ffffff",
          fontSize: "8vw",
          fontWeight: "600",
          position: "absolute",
          zIndex: 2,
          opacity: 1,
          fontFamily: "monospace",
          letterSpacing: "-0.05em",
          mixBlendMode: "difference",
        }}
      >
        {counter}%
      </div>

      {/* Reveal blocks */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "2px",
        }}
      >
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            ref={(el) => (blocksRef.current[index] = el)}
            style={{
              flex: 1,
              backgroundColor: "#ffffff",
              height: "100%",
              transform: "scaleY(1)",
              transformOrigin: index % 2 === 0 ? "top" : "bottom",
            }}
          />
        ))}
      </div>
    </div>
  );
}
