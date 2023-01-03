import React, {Suspense} from 'react';
import './App.css';
import { Canvas } from '@react-three/fiber';
import Donut from './compontents/donut';
import { OrbitControls } from '@react-three/drei/core';

function App() {
  return (
    <div className="App">
      <Canvas>
        <ambientLight intensity={0.3}/>
        <spotLight  position={[10,10,10]} angle={0.15} penumbar={1}/>
        <pointLight position={[-10,-10,-10]}/>
        <Suspense fallback={null}>
          <Donut />
          <OrbitControls />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
