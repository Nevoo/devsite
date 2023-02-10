import React from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { useSpring, animated, config } from "@react-spring/web";
import DonutSzene from "./szenes/donut_szene";

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
          <DonutSzene></DonutSzene>
        </Canvas>
      </animated.div>
    </div>
  );
}

export default App;
