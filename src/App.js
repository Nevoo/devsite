import React, { Suspense, useRef, useEffect } from "react";
import "./App.css";
import { Canvas, useThree } from "@react-three/fiber";
import { animated } from "@react-spring/web";

import { CameraLandingPage } from "./landing-page/index";
import { ReactLenis } from "@studio-freight/react-lenis";

function App() {
    return (
        <ReactLenis>
            <div>
                {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
                <animated.div className="App">
                    <div className={"blur"}>
                        <Canvas
                            shadows
                            camera={{ position: [0, 0, 20], fov: 50 }}
                        >
                            {/* <Router>
              <ViewProvider>
                <Views />
              </ViewProvider>
            </Router> */}
                            <Suspense>
                                <CameraLandingPage />
                            </Suspense>
                        </Canvas>
                    </div>
                    <div className={"nav"}>
                        <div>about</div>
                        <div>contact</div>
                    </div>
                    <div className={"logo"}>nevo</div>
                    <div className={"footer"}>
                        web developer - mobile developer - photographer
                    </div>
                </animated.div>
            </div>
        </ReactLenis>
    );
}

export default App;
