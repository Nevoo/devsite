"use client";

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function LoadingScreen() {
    const [counter, setCounter] = useState(0);
    const [showBlocks, setShowBlocks] = useState(false);
    const animationRef = useRef(null);
    const counterRef = useRef(null);
    const blocksRef = useRef([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Clear any existing animation
        if (animationRef.current) {
            animationRef.current.kill();
        }

        const tl = gsap.timeline();

        // Counter animation
        tl.to({}, {
            duration: 2,
            onUpdate: () => {
                const progress = Math.round(tl.progress() * 100);
                setCounter(progress);
            },
            onComplete: () => {
                setShowBlocks(true);
                // Fade out counter
                gsap.to(counterRef.current, {
                    opacity: 0,
                    duration: 0.3,
                    delay: 0.2
                });
                // Block reveal animation
                gsap.to(blocksRef.current, {
                    height: "0%",
                    duration: 0.8,
                    ease: "power1.inOut",
                    stagger: {
                        amount: 0.3,
                        from: "center"
                    },
                    onComplete: () => {
                        // Fade out the entire loading screen
                        gsap.to(".loading-screen", {
                            opacity: 0,
                            duration: 0.5,
                            onComplete: () => {
                                gsap.set(".loading-screen", { display: "none" });
                            }
                        });
                    }
                });
            }
        });

        animationRef.current = tl;

        return () => {
            if (animationRef.current) {
                animationRef.current.kill();
            }
        };
    }, []);

    return (
        <div 
            className="loading-screen"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 9999,
                pointerEvents: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#000',
                opacity: 1
            }}
        >
            <span 
                ref={counterRef}
                style={{
                    color: '#DCFF7C',
                    fontSize: '4rem',
                    fontWeight: 'bold',
                    position: 'absolute',
                    zIndex: 10
                }}
            >{counter}</span>

            {showBlocks && (
                <div className="overlay" style={{ width: '100%', height: '100vh', backgroundColor: '#DCFF7C'}}>
                    {Array.from({ length: 11 }, (_, i) => (
                        <div
                            key={i}
                            ref={el => blocksRef.current[i] = el}
                            style={{
                                position: 'fixed',
                                width: '10%',
                                height: '100vh',
                                backgroundColor: '#000',
                                left: `${i * 10}%`,
                                top: 0
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
