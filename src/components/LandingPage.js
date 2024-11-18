"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function LandingPage() {
    const [scrollY, setScrollY] = useState(0);
    const overlayRef = useRef(null);
    const videoRef = useRef(null);

    const { scrollYProgress } = useScroll({
        target: overlayRef,
        offset: ["start end", "end start"],
    });

    const overlayY = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        ["100%", "0%", "0%"]
    );
    const overlayRadius = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        ["2rem 2rem 0 0", "2rem 2rem 0 0", "0rem"]
    );
    const overlayScale = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        [0.8, 0.8, 1]
    );

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Auto-play video when component mounts
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch((error) => {
                console.log("Video autoplay failed:", error);
            });
        }
    }, []);

    const handleExplore = () => {
        overlayRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="relative min-h-[200vh] bg-black">
            {/* Video Background */}
            <div className="fixed inset-0 w-full h-full">
                <div className="absolute inset-0 bg-black/50 z-[1]" />{" "}
                {/* Overlay for better text visibility */}
                <div
                    className="relative w-full h-screen overflow-hidden"
                    style={{
                        transform: `translateY(${scrollY * 0.5}px)`,
                    }}
                >
                    <video
                        ref={videoRef}
                        className="absolute min-w-full min-h-full object-cover object-center w-full h-full"
                        autoPlay
                        muted
                        loop
                        playsInline
                        // poster="/placeholder.svg" // Optional: Add a placeholder image while video loads
                    >
                        <source src="/video/landing.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>

            <div className="relative z-10">
                {/* Main Content */}
                <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
                    <p className="mb-6 text-lg font-semibold text-white/90">
                        Software Development & Visual Creation
                    </p>

                    <h2 className="mb-12 text-4xl font-semibold text-white sm:text-6xl md:text-9xl">
                        Code <span>•</span>{" "}
                        <span style={{ fontFamily: "PottaOne" }}>Capture</span>
                        <span className="font-light">•</span>{" "}
                        <span
                            className="font-serif italic"
                            style={{ fontFamily: "Dirtyline" }}
                        >
                            CrEaTE
                        </span>
                    </h2>

                    <button
                        onClick={handleExplore}
                        className="rounded-full bg-yellow-400 px-8 py-3 text-lg font-semibold text-black 
                                 transition-all duration-300 hover:scale-105 hover:bg-yellow-300 active:scale-95"
                    >
                        Explore My Work
                    </button>
                </main>

                {/* Animated Overlay */}
                <motion.div
                    ref={overlayRef}
                    style={{
                        y: overlayY,
                        borderRadius: overlayRadius,
                        scale: overlayScale,
                    }}
                    className="bottom-0 left-0 right-0 z-20 min-h-screen bg-white"
                >
                    <div className="flex min-h-screen items-center justify-center">
                        <div
                            className="max-w-2xl space-y-6 p-6 text-center"
                            style={{
                                transform: `translateY(${-scrollY * 0.3}px)`,
                            }}
                        >
                            <h3 className="text-4xl font-bold">My Work</h3>
                            <p className="text-lg text-gray-600">
                                Scroll to explore my projects and creations. The
                                content moves with a subtle parallax effect as
                                you scroll.
                            </p>
                            <button
                                onClick={() =>
                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    })
                                }
                                className="rounded-full border border-black px-6 py-2 text-sm font-medium 
                                         transition-all duration-300 hover:bg-black hover:text-white"
                            >
                                Back to Top
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
