import React, { Suspense, useRef, useEffect } from "react";
import "./App.css";
import { Canvas, useThree } from "@react-three/fiber";
import { animated } from "@react-spring/web";

import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ViewProvider } from "./routing-test/view-context";
import { Views } from "./routing-test/views";
import useRigState from "./global-state/rig-state";

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

    return (
        <>
            <div className={"nav"}>
                <div
                    onClick={() => {
                        navigate("/about");
                        setRig(false);
                    }}
                >
                    about
                </div>
                <div>contact</div>
            </div>
            <div
                className={"logo"}
                onClick={() => {
                    navigate("/");
                    setRig(true);
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
