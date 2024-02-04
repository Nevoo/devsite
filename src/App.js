import React, { Suspense, useEffect } from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { animated, config, useSpring } from "@react-spring/web";
import { Html } from "@react-three/drei";

import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ViewProvider } from "./routing/view-context";
import { Views } from "./routing/views";
import { routes } from "./routing/routes";
import useCameraTransitionState from "./global-state/model-state";

function App() {
    return (
        <div>
            {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
            <animated.div className="App">
                <Router>
                    <Canvas camera={{ position: [0, 0, 15], fov: 15 }}>
                        <Suspense
                            fallback={
                                <Html
                                    center
                                    className="loading"
                                    children="Loading..."
                                />
                            }
                        >
                            <ViewProvider>
                                <Views />
                            </ViewProvider>
                        </Suspense>
                    </Canvas>
                    <Overlay />
                </Router>
            </animated.div>
        </div>
    );
}

// TODO: fix scrolling categories on mobile
// TODO: use smaller images for gallery instead of 30 mb iamges and add rest of images
// TODO: still adjust model materials a little and subdivide to make it look smoother
// TODO: implement portal on camera display for gallery instead
// TODO: implement full screen view of images
// TODO: maybe implement small camera shake on camera tap

const Overlay = () => {
    const navigate = useNavigate();

    const displayHeadlines = useCameraTransitionState(
        (state) => state.displayHeadlines
    );

    return (
        <>
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
            {displayHeadlines ? <Headlines /> : null}
            <div className="footer">
                web developer - mobile developer - photographer
            </div>
        </>
    );
};

const Headlines = () => {
    const left = useSpring({
        from: { left: "-1000px" },
        to: { left: "200px" },
        leave: { left: "-1000px" },
        config: config.gentle,
    });

    const right = useSpring({
        from: { right: "-1000px" },
        to: { right: "200px" },
        leave: { right: "-1000px" },
        config: config.gentle,
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
