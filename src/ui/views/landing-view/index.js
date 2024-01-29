import React, { Suspense } from "react";
import "./index.css";
import {
    Float,
    Lightformer,
    ContactShadows,
    Environment,
} from "@react-three/drei";
import { Camera } from "../components/blender-models/camera_glb";
import { OrbitImages } from "./components/orbit-images";
import useImageState from "./state/image-state";
import { View } from "../routing/view-context";
import { Rig } from "../components/rig";
import { CameraNew } from "../../shared/components/blender-models/Model";

export const CameraLandingPage = (props) => {
    const categories = useImageState((state) => state.categories);
    const cameraTapped = useImageState((state) => state.cameraTapped);
    const tapCamera = useImageState((state) => state.tapCamera);

    return (
        <View>
            <spotLight
                position={[20, 20, 10]}
                penumbra={1}
                castShadow
                angle={0.2}
            />
            <Float floatIntensity={1}>
                <CameraNew
                    scale={150}
                    rotation={[0, -2, 0]}
                    position={[-0.02, -0.01, 0.02]}
                    // position={[1, 4, 0]}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        tapCamera(true);
                    }}
                />
                <OrbitImages radius={10} images={categories} />
            </Float>
            <ContactShadows
                scale={200}
                position={[0, -10, 0]}
                blur={1}
                far={100}
                opacity={0.85}
            />
            <Environment preset="city">
                <Lightformer
                    intensity={8}
                    position={[10, 5, 0]}
                    scale={[10, 50, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
            </Environment>
            <Rig />
        </View>
    );
};
