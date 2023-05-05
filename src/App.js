import React from "react";
import "./App.css";
import { Canvas, useThree } from "@react-three/fiber";
import { useSpring, animated, config } from "@react-spring/web";
import DonutScene from "./scenes/donut_scene";
import GalleryScene from "./scenes/gallery_scene";
import LandingPageScene from "./scenes/landingpage_scene";
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
  const [{ background }] = useSpring(
    () => ({
      from: { background: "var(--step0)" },
      to: [
        { background: "var(--step1)" },
        { background: "var(--step2)" },
        { background: "var(--step3)" },
        { background: "var(--step4)" },
      ],
      config: config.molasses,
      loop: {
        reverse: true,
      },
    }),
    []
  );

  return (
    <div>
      {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
      <animated.div className="App">
        <Canvas>
          <Router>
            <ViewProvider>
              <Views />
            </ViewProvider>
          </Router>
        </Canvas>
      </animated.div>
    </div>
  );
}

export default App;
