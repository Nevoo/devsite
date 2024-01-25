import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ScrollControls, Scroll } from "@react-three/drei";
import { useRoute, useLocation } from "wouter";
import { easing } from "maath";
import Frame from "./frame";

const GOLDENRATIO = 1.61803398875;

const Frames = ({
  images,
  quaternion = new THREE.Quaternion(),
  cameraPosition = new THREE.Vector3(),
}) => {
  const w = 1;
  const ref = useRef();
  const clicked = useRef();
  const [, params] = useRoute("/item/:id");
  const [, setLocation] = useLocation();
  const { width } = useThree((state) => state.viewport);
  const xW = w + 0.5;
  const [clickedIndex, setClickedIndex] = useState();

  useEffect(() => {
    clicked.current = ref.current.getObjectByName(params?.id);
    if (clicked.current) {
      clicked.current.parent.updateWorldMatrix(true, true);
      clicked.current.parent.localToWorld(
        cameraPosition.set(0, GOLDENRATIO / 2, 2.5)
      );
      clicked.current.parent.getWorldQuaternion(quaternion);
    } else {
      cameraPosition.set(0, 0.25, 3);
      quaternion.identity();
    }
  });

  useFrame((state, deltaTime) => {
    easing.damp3(state.camera.position, cameraPosition, 0.4, deltaTime);
    easing.dampQ(state.camera.quaternion, quaternion, 0.4, deltaTime);
  });

  return (
    <ScrollControls
      horizontal
      damping={0.5}
      pages={(width - xW + images.length * xW) / width}
      style={{ overflow: "hidden" }}
    >
      <Scroll>
        <group
          ref={ref}
          onClick={(event) => {
            event.stopPropagation();
            setLocation(
              clicked.current === event.object
                ? "/"
                : "/item/" + event.object.name
            );
          }}
          onPointerMissed={() => setLocation("/")}
        >
          {images.map((props, index) => (
            <Frame
              onClick={() => {
                if (clickedIndex === index) {
                  setClickedIndex(null);
                } else {
                  setClickedIndex(index);
                }
              }}
              clickedIndex={clickedIndex}
              key={props.url}
              {...props}
              length={images.length}
              index={index}
              position={[index * xW, 0, 0]}
              scale={[1, 0, 0]}
            />
          ))}
        </group>
      </Scroll>
    </ScrollControls>
  );
};

export default Frames;
