import {
    Html,
    Text,
    Image,
    Scroll,
    ScrollControls,
    useTrail,
    Environment,
    Lightformer,
} from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Rig } from "../../components/rig";
import { useEffect } from "react";
import useRigState from "../../global-state/rig-state";
import { Camera } from "../../components/blender-models/camera_glb";

export const AboutPage = () => {
    // const view = useView();
    const { width } = useThree((state) => state.size);

    return (
        <group>
            <Environment preset="city">
                <Lightformer
                    intensity={8}
                    position={[10, 5, 0]}
                    scale={[10, 50, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
            </Environment>
            <Camera scale={50} rotation={[0, -1.3, 0]} position={[1, 4, 0]} />
            <MobileScrollWrapper width={width}>
                <Html fullscreen position={[0, -2.2, 0]}>
                    <div
                        className="body"
                        style={{
                            display: "flex",
                            flexDirection: width > 1000 ? "row" : "column",
                            justifyContent: "space-between",
                            textAlign: "left",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                width: width > 1000 ? "50%" : "100%",
                            }}
                        >
                            <h1
                                style={{
                                    fontFamily: "Gilroy",
                                    fontSize: "7em",
                                    fontWeight: "bold",
                                }}
                            >
                                ABOUT ME
                            </h1>

                            <div
                                style={{
                                    fontFamily: "Gilroy",
                                    fontSize: "1.8em",
                                    fontWeight: "bold",
                                }}
                            >
                                <p>
                                    I'm a creative developer working on apps and
                                    web projects all the time. I started this
                                    journey when I was 16 years old and have
                                    been working full time as a developer since
                                    2018.
                                </p>
                                <p>
                                    Besides that, for almost the same amount of
                                    time, I've been a photographer. Starting
                                    with just my phone in 2019 I worked my way
                                    up to a professional camera and now even
                                    doing paid work for clients sometimes.
                                </p>
                            </div>
                        </div>
                        <div
                            style={{
                                paddingTop: "5em",
                                width: "40%",
                                height: "40%",
                            }}
                        >
                            <img
                                src="KPK07115.jpg"
                                style={{ maxWidth: "100%", maxHeight: "100%" }}
                            />
                        </div>
                    </div>
                </Html>
            </MobileScrollWrapper>
        </group>
    );
};

const MobileScrollWrapper = ({ children, width }) => {
    return width > 1000 ? (
        <>{children}</>
    ) : (
        <ScrollControls pages="2">
            <Scroll>
                <>{children}</>
            </Scroll>
        </ScrollControls>
    );
};
