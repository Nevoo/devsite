"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

export default function LandingPage() {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const videoContainerRef = useRef(null);
    const newPageRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const ctx = gsap.context(() => {
            gsap.to(videoContainerRef.current, {
                yPercent: 30,
                ease: "none",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: 1.5,
                },
            });
        });

        if (videoRef.current) {
            videoRef.current.play().catch(console.log);
        }

        return () => ctx.revert();
    }, []);

    const handleExplore = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);

        gsap.to(newPageRef.current, {
            scale: 1,
            duration: 0.8,
            ease: "power2.inOut",
            onComplete: () => {
                // Navigate or show new content
                console.log("Transition complete");
            },
        });
    };

    return (
        <>
            <div ref={containerRef} className="relative bg-black min-h-screen">
                <div
                    ref={videoContainerRef}
                    className="fixed inset-0 w-full h-full"
                >
                    <div className="absolute inset-0 bg-black/50 z-1" />
                    <video
                        ref={videoRef}
                        className="absolute min-w-full min-h-full object-cover object-center w-full h-full scale-125"
                        autoPlay
                        muted
                        loop
                        playsInline
                    >
                        <source src="/video/landing.mp4" type="video/mp4" />
                    </video>
                </div>

                <div className="relative z-1">
                    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
                        <p className="mb-6 text-lg font-semibold text-white/90">
                            Software Development & Visual Creation
                        </p>
                        <h2 className="mb-12 text-4xl font-semibold text-white sm:text-6xl md:text-9xl">
                            Code <span>•</span>{" "}
                            <span style={{ fontFamily: "PottaOne" }}>
                                Capture
                            </span>
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
                </div>
            </div>

            {/* New Page that scales up */}
            <div
                ref={newPageRef}
                className="fixed inset-0 bg-white z-50 origin-center pointer-events-none"
                style={{
                    scale: 0,
                    pointerEvents: isTransitioning ? "auto" : "none",
                }}
            >
                <div className="flex min-h-screen items-center justify-center">
                    <h2 className="text-4xl font-bold text-black">
                        New Page Content
                    </h2>
                </div>
            </div>
        </>
    );
}
