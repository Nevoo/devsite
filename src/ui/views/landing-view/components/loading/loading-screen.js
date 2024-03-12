import React, { useEffect, useState } from "react";
import { Html, Preload, useProgress } from "@react-three/drei";
import "./loading.css";
import gsap from "gsap";
import anime from "animejs";

export const LoadingScreen = ({ props }) => {
    const { active, progress, errors, item, loaded, total } = useProgress();
    // const res = useProgress();

    const [isLoading, setLoading] = useState(true);

    const buildTitleElement = (title) => {
        return (
            <p>
                {title.split("").map((letter, i) => (
                    <span key={i} className="letter">
                        {letter}
                    </span>
                ))}
            </p>
        );
    };

    useEffect(() => {
        if (active) {
            anime
                .timeline({ loop: false })
                .add({
                    targets: ".loading-title p .letter",
                    translateY: [-100, 0],
                    easing: "easeOutExpo",
                    duration: 1000,
                    delay: (el, i) => 30 * i,
                })
                .add({
                    targets: ".loading-title p .letter",
                    translateY: [0, 100],
                    easing: "easeInExpo",
                    duration: 1000,
                    delay: (el, i) => 1000 + 30 * i,
                });
        } else {
            gsap.to(".progress", { opacity: 0, delay: 2, duration: 0.5 });
            gsap.to(".pre-loader", {
                scale: 0.5,
                ease: "power4.inOut",
                duration: 2,
                delay: 2,
            });
            gsap.to(".loader", {
                height: 0,
                ease: "power4.inOut",
                duration: 1.5,
                delay: 2.5,
            });
            gsap.to(".loader-bg", {
                height: 0,
                ease: "power4.inOut",
                duration: 1.5,
                delay: 2.75,
                onComplete: () => {
                    setLoading(false);
                },
            });
        }
    }, [active]);

    return (
        isLoading && (
            <div className="loading-html">
                <div className="pre-loader">
                    <div className="loader" />
                    <div className="loader-bg" />
                </div>
                <div className="loading-background">
                    <p className="progress">{progress.toFixed(0)}%</p>
                    <div className="loading-title">
                        {buildTitleElement("ROUVENS")}
                        {buildTitleElement("WORK")}
                    </div>
                </div>
                {/* <div className="loader-2" /> */}
            </div>
        )
    );
};
