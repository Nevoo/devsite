import React, {Suspense} from 'react';
import './App.css';
import { Canvas } from '@react-three/fiber';
import DonutGLTF from './compontents/donut-gltf';
import { OrbitControls } from '@react-three/drei/core';
import { PerspectiveCamera } from "@react-three/drei";

function App() {
  return (
    <div className="App">
      <Canvas>
        <PerspectiveCamera
          name="Camera"
          makeDefault={true}
          far={100}
          near={0.1}
          fov={22.9}
          position={[0, 0, 0.5]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <ambientLight intensity={0.3}/>
        <spotLight  position={[10, 10, 10]} angle={0.30} penumbar={1}/>
        <pointLight position={[-10,-10,-10]}/>
        <Suspense fallback={null}>
          <DonutGLTF />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
