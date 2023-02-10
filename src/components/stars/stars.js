import React, { useState, useRef } from "react";
import { inSphere } from "maath/random";
import { Points, PointMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const Stars = ({ config, ...props }) => {
  const ref = useRef();
  const [sphere] = useState(() =>
    inSphere(new Float32Array(5000), { radius: 1 })
  );

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / config.starRotationSpeedX;
    ref.current.rotation.y -= delta / config.starRotationSpeedY;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points
        ref={ref}
        positions={sphere}
        stride={3}
        frustumCulled={false}
        {...props}
      >
        <PointMaterial
          transparent
          color={config.starColor}
          size={0.01}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
};

export default Stars;
