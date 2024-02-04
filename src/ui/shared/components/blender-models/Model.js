import React from "react";
import { useGLTF } from "@react-three/drei";

export function CameraNew(props) {
    const { nodes, materials } = useGLTF("/cam-final-smooth1.glb");
    return (
        <group {...props} dispose={null}>
            <mesh
                name="Cam"
                castShadow
                receiveShadow
                geometry={nodes.Cam.geometry}
                material={materials["matte plastic "]}
            />
            <mesh
                name="Iso_Button"
                castShadow
                receiveShadow
                geometry={nodes.Iso_Button.geometry}
                material={materials.Plastic}
            />
            <mesh
                name="Button"
                castShadow
                receiveShadow
                geometry={nodes.Button.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Button_2"
                castShadow
                receiveShadow
                geometry={nodes.Button_2.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Button_3"
                castShadow
                receiveShadow
                geometry={nodes.Button_3.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Mode_Button"
                castShadow
                receiveShadow
                geometry={nodes.Mode_Button.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Button_4"
                castShadow
                receiveShadow
                geometry={nodes.Button_4.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Button_5"
                castShadow
                receiveShadow
                geometry={nodes.Button_5.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Button_6"
                castShadow
                receiveShadow
                geometry={nodes.Button_6.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Button_7"
                castShadow
                receiveShadow
                geometry={nodes.Button_7.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="Button_8"
                castShadow
                receiveShadow
                geometry={nodes.Button_8.geometry}
                material={materials.Plastic}
            />
            <mesh
                name="Sensor"
                castShadow
                receiveShadow
                geometry={nodes.Sensor.geometry}
                material={materials["Sensor Mat"]}
            />
            <mesh
                name="Display"
                castShadow
                receiveShadow
                geometry={nodes.Display.geometry}
                material={materials["Black Plastic"]}
            />
            <mesh
                name="Display_Frame"
                castShadow
                receiveShadow
                geometry={nodes.Display_Frame.geometry}
                material={materials["Touched Plastic Smooth"]}
            />
            <mesh
                name="sensor_circle"
                castShadow
                receiveShadow
                geometry={nodes.sensor_circle.geometry}
                material={materials["Black Plastic"]}
            />
            <mesh
                name="Sensor_Circle"
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Circle.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                name="Sensor_Inner_Circle"
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Inner_Circle.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                name="Sensor_Frame"
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Frame.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                name="Camera_Handle_Missing"
                castShadow
                receiveShadow
                geometry={nodes.Camera_Handle_Missing.geometry}
                material={materials["Rubber Matt"]}
            />
            <mesh
                name="Viewfinder"
                castShadow
                receiveShadow
                geometry={nodes.Viewfinder.geometry}
                material={materials["Car plastic dark"]}
            />
        </group>
    );
}

useGLTF.preload("/cam-final-smooth1.glb");
