import React, { Suspense, useRef, useEffect } from "react";
import "./App.css";
import { Canvas, useThree } from "@react-three/fiber";
import { animated } from "@react-spring/web";

import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ViewProvider } from "./routing-test/view-context";
import { Views } from "./routing-test/views";
import useRigState from "./global-state/rig-state";
import useCameraTransitionState from "./global-state/model-state";

function App() {
    return (
        // <ReactLenis>
        <div>
            {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
            <animated.div className="App">
                <Router>
                    <div className={"blur"}>
                        <Canvas
                            shadows
                            camera={{ position: [0, 0, 20], fov: 50 }}
                        >
                            <ViewProvider>
                                <Views />
                            </ViewProvider>
                        </Canvas>
                    </div>
                    <Header />
                </Router>
            </animated.div>
        </div>
        // </ReactLenis>
    );
}

const Header = () => {
    const navigate = useNavigate();
    const setRig = useRigState((state) => state.setRig);

    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);
    const setRotation = useCameraTransitionState((state) => state.setRotation);

    return (
        <>
            <div className={"nav"}>
                <div
                    onClick={() => {
                        // navigate("/about");
                        // setRig(false);
                        // setActiveRoute(routes[0].to);
                        setPosition([13.5, 8.3, 0]);
                        setScale(20);
                        navigate("/camera2");
                    }}
                >
                    about
                </div>
                <div
                    onClick={() => {
                        // navigate("/");
                        // setRig(true);
                        // setActiveRoute(routes[1].to);
                        // [-0.02, -0.01, 0.02]
                        setPosition([13.5, 7.5, 0]);
                        setScale(20);
                        navigate("/camera3");
                    }}
                >
                    contact
                </div>
            </div>
            <div
                className={"logo"}
                onClick={() => {
                    // navigate("/");
                    // setRig(true);
                    setPosition([-0.02, -0.01, 0.02]);
                    setScale(150);
                    navigate("/camera4");
                }}
            >
                nevo
            </div>
            <div className={"footer"}>
                web developer - mobile developer - photographer
            </div>
        </>
    );
};

export default App;
