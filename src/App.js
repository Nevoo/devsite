import React, { Suspense, useRef, useEffect } from "react";
import "./App.css";
import { Canvas, useThree } from "@react-three/fiber";
import { animated } from "@react-spring/web";

import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ViewProvider } from "./routing-test/view-context";
import { Views } from "./routing-test/views";
import useRigState from "./global-state/rig-state";
import useCameraTransitionState from "./global-state/model-state";
import useImageState from "./landing-page/state/image-state";
import { useControls } from "leva";

function App() {
    return (
        // <ReactLenis>
        <div>
            {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
            <animated.div className="App">
                <Router>
                    <div className={"blur"}>
                        <Canvas shadows camera={{ fov: 50 }}>
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

// TODO: listen to navigation changes to adjust position there -> fixes bug when manually navigating to /camera2
// TODO: implement gallery for images
// TODO: fix scrolling categories on mobile
// TODO: use smaller image of me to improve about page performance

const Header = () => {
    const navigate = useNavigate();

    const setPosition = useCameraTransitionState((state) => state.setPosition);
    const setScale = useCameraTransitionState((state) => state.setScale);

    return (
        <>
            <div className={"nav"}>
                <div
                    onClick={() => {
                        // navigate("/about");
                        // setRig(false);
                        // setActiveRoute(routes[0].to);
                        setPosition([19, 8, 0]);
                        setScale(20);
                        navigate("/about");
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
                        setPosition([19, 8, 0]);
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
