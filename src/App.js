import React, { useEffect, useState } from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { animated, config, useSpring } from "@react-spring/web";
import { Html, Loader, Preload } from "@react-three/drei";

import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ViewProvider } from "./routing/view-context";
import { Views } from "./routing/views";
import { routes } from "./routing/routes";
import useCameraTransitionState from "./global-state/model-state";
import useImageState from "./ui/views/landing-view/state/image-state";
import { SmartSuspense } from "./ui/shared/fake-loader";
import { LoadingScreen } from "./ui/views/landing-view/components/loading/loading-screen";

function App() {
    const [showOverlay, setShowOverlay] = useState(false);

    return (
        <div>
            <animated.div className="App">
                <Router>
                    <Canvas camera={{ position: [0, 0, 15], fov: 15 }}>
                        <Preload all />
                        <SmartSuspense
                            fallback={null}
                            onLoaded={() => setShowOverlay(true)}
                        >
                            <ViewProvider>
                                <Views />
                            </ViewProvider>
                        </SmartSuspense>
                    </Canvas>
                    {showOverlay && <Overlay />}
                </Router>
                <LoadingScreen />
            </animated.div>
        </div>
    );
}

// TODO: fix scrolling categories on mobile
// TODO: implement portal on camera display for gallery instead
// TODO: implement full screen view of images
// TODO: maybe implement small camera shake on camera tap

// TODO: add loading animation
// TODO: add vercel blob storage to store and read images

const Overlay = () => {
    const navigate = useNavigate();

    const displayHeadlines = useCameraTransitionState(
        (state) => state.displayHeadlines
    );

    return (
        <>
            <div className="header">
                <div className="nav">
                    <div
                        onClick={() => {
                            navigate(routes.about);
                        }}
                    >
                        about
                    </div>
                    <div
                        onClick={() => {
                            navigate(routes.contact);
                        }}
                    >
                        contact
                    </div>
                </div>
                <div
                    className="logo"
                    onClick={() => {
                        navigate(routes.home);
                    }}
                >
                    nevo
                </div>
            </div>
            {displayHeadlines ? <Headlines /> : null}
            <div className="footer">
                web developer - mobile developer - photographer
            </div>
            <div
                className="footer-privacy"
                onClick={() => {
                    navigate(routes.privacy);
                }}
            >
                Privacy Policy
            </div>
        </>
    );
};

export const Headlines = () => {
    const galleryOpened = useImageState((state) => state.galleryOpened);

    const { innerWidth: width, innerHeight: height } = window;

    const isDesktop = width > 1000 && height > 1000;

    const left = useSpring({
        from: { left: "-1400px" },
        to: {
            left: isDesktop ? "100px" : "20px",
        },
        config: config.gentle,
        reverse: galleryOpened,
    });

    const right = useSpring({
        from: { right: "-1000px" },
        to: {
            right: isDesktop ? "200px" : "80px",
        },
        config: config.gentle,
        reverse: galleryOpened,
    });

    return (
        <>
            <animated.div className="headline top-left" style={left}>
                <h1>rouvens</h1>
            </animated.div>
            <animated.div className="headline bottom-right" style={right}>
                <h1>work</h1>
            </animated.div>
        </>
    );
};

export default App;
