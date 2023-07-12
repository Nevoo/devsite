import React from "react";
import "./App.css";
import { Canvas, useThree } from "@react-three/fiber";
import { useSpring, animated, config } from "@react-spring/web";
import DonutScene from "./scenes/donut_scene";
import GalleryScene from "./scenes/gallery_scene";
import LandingPageScene from "./scenes/landingpage_scene";
import { CameraLandingPage } from "./landing-page/index";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Views } from "./routing-test/views";
import { ViewProvider } from "./routing-test/view-context";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";

function App() {
  return (
    <div>
      {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
      <animated.div className="App">
        <div className={"blur"}>
          <Canvas
            eventSource={document.getElementById("root")}
            eventPrefix="client"
            shadows
            camera={{ position: [0, 0, 20], fov: 50 }}
          >
            {/* <Router>
            <ViewProvider>
              <Views />
            </ViewProvider>
          </Router> */}
            <CameraLandingPage />
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
  );
}

export default App;
