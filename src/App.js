import React, { useEffect } from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { animated } from "@react-spring/web";

import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ViewProvider, useView } from "./routing/view-context";
import { Views } from "./routing/views";
import useCameraTransitionState from "./global-state/model-state";
import { routes } from "./routing/routes";
import { useCustomNavigate } from "./hooks/useCustomNavigate";

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

    return (
        <>
            <div className={"nav"}>
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
                className={"logo"}
                onClick={() => {
                    navigate(routes.home);
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
