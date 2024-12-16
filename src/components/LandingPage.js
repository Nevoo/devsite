"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import SplitText from "./SplitText";
import '../styles/animations.css';

export default function LandingPage() {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const videoContainerRef = useRef(null);
    const newPageRef = useRef(null);
    const portalRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        gsap.registerPlugin(ScrollTrigger);

        // Set initial portal state immediately
        if (portalRef.current) {
            gsap.set(portalRef.current, {
                scale: 0.05,
                rotation: 5,
                opacity: 1,
                width: "30%",
                height: "30%",
                top: "50%",
                left: "50%",
                xPercent: -50,
                yPercent: -50,
                borderRadius: "20px",
                backgroundColor: '#fff' // Start with white background
            });
        }

        // Create master timeline
        const masterTl = gsap.timeline();

        // Portal animation
        masterTl.to(portalRef.current, {
            scale: 0.6,
            rotation: 45,
            duration: 0.5,
            ease: "power2.inOut",
        })
        .to(portalRef.current, {
            scale: 1,
            width: "100%",
            height: "100%",
            borderRadius: 0,
            rotation: 0,
            backgroundColor: '#000', // Transition to black
            duration: 0.8,
            ease: "power2.inOut",
            onComplete: () => setIsLoaded(true)
        });

        return () => {
            masterTl.kill();
        };
    }, []);

    useEffect(() => {
        if (!isLoaded) return;

        // Scroll animation
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

        return () => {
            ctx.revert();
        };
    }, [isLoaded]);

    const handleExplore = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);

        gsap.to(newPageRef.current, {
            scale: 1,
            duration: 0.8,
            ease: "power2.inOut",
            onComplete: () => {
                console.log("Transition complete");
            },
        });
    };

    return (
        <>
            {/* Portal/Main content */}
            <div 
                ref={portalRef} 
                className="fixed inset-0 overflow-hidden"
                style={{ 
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                    transformOrigin: "center center",
                    zIndex: 1
                }}
            >
                <div ref={containerRef} className="relative min-h-screen">
                    <div
                        ref={videoContainerRef}
                        className="fixed inset-0 w-full h-full"
                    >
                        <div className="absolute inset-0 bg-black/50" />
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

                    <div className="relative min-h-screen flex items-center justify-center">
                        <main className="flex flex-col items-center justify-center px-4 text-center">
                            <SplitText 
                                as="p"
                                className="mb-6 text-lg font-semibold text-white/90"
                                delay={2}
                                duration={0.8}
                                stagger={0.02}
                                x={-20}
                            >
                                Software Development & Visual Creation
                            </SplitText>
                            <SplitText 
                                as="h2"
                                className="mb-12 text-4xl font-semibold text-white sm:text-6xl md:text-9xl"
                                delay={1.8}
                                duration={1}
                                stagger={0.03}
                                x={-30}
                            >
                                Code <span> • </span>
                                <span style={{ fontFamily: "PottaOne" }}>
                                    Capture
                                </span>
                                <span className="font-light"> • </span>
                                <span
                                    className="font-serif italic"
                                    style={{ fontFamily: "Dirtyline" }}
                                >
                                    Create
                                </span>
                            </SplitText>
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
            </div>

            {/* New Page that scales up */}
            <div
                ref={newPageRef}
                className="fixed inset-0 bg-white z-[100] origin-center pointer-events-none"
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
