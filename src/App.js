import React, {Suspense} from 'react';
import './App.css';
import { Canvas } from '@react-three/fiber';
import DonutGLTF from './compontents/donut-gltf';
import { OrbitControls } from '@react-three/drei/core';
import { PerspectiveCamera, GradientTexture, MeshReflectorMaterial, MeshWobbleMaterial } from "@react-three/drei";

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
          rotation={[0, 0, 0]}
        />
        <ambientLight intensity={0.3}/>
        <spotLight  position={[10, 10, 10]} angle={0.30} />
        <pointLight position={[-10,-10, -10]}/>
        <Suspense fallback={null}>
          <DonutGLTF />
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, -0.07, 0]}>
            <planeGeometry />
            <MeshReflectorMaterial
              blur={[300, 100]}
              resolution={2048}
              mixBlur={1}
              mixStrength={50}
              roughness={1}
              depthScale={1.2}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color = "#050505"
              metalness={0.5}
            > 
                    <GradientTexture stops={[0, 0.46, 1]} colors={['#12c2e9', '#c471ed', '#f64f59']} size={100} />
            </MeshReflectorMaterial>
          </mesh>
          {/* <Plane receiveShadow={true} position={[0, -0.07, 0]} rotation={[Math.PI * -0.5, 0, 0]}/>
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={2048}
            mixBlur={1}
            mixStrength={50}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#050505"
            metalness={0.5}
          /> */}
          {/* <OrbitControls /> */}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;

