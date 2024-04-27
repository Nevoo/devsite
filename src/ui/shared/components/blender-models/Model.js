import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

export function CameraNew(props) {
    const { nodes, materials } = useGLTF("/cam-final-smooth1.glb");
    return (
        <group {...props} dispose={null}>
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Cam.geometry}
                material={materials["matte plastic "]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Iso_Button.geometry}
                material={materials.Plastic}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_2.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_3.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Mode_Button.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_4.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_5.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_6.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_7.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_8.geometry}
                material={materials.Plastic}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor.geometry}
                material={materials["Sensor Mat"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Display.geometry}
                material={materials["Black Plastic"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Display_Frame.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.sensor_circle.geometry}
                material={materials["Black Plastic"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Circle.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Inner_Circle.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Frame.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Camera_Handle_Missing.geometry}
                material={materials["Rubber Matt"]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Viewfinder.geometry}
                material={materials["Car plastic dark"]}
            />
        </group>
    );
}

useGLTF.preload("/cam-final-smooth1.glb");
