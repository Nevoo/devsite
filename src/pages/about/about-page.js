import { Html, Text, Image, Scroll, ScrollControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Rig } from "../../components/rig";
import { useEffect } from "react";
import useRigState from "../../global-state/rig-state";

export const AboutPage = () => {
    // const view = useView();
    const { width } = useThree((state) => state.size);

    return (
        <MobileScrollWrapper width={width}>
            <Image
                url="KPK07115.jpg"
                scale={[8, 10, 0]}
                position={[
                    width > 1000 ? width / 100 / 2 - 1 : 0,
                    width > 1000 ? 0 : -10,
                    0,
                ]}
            />
            <Html fullscreen position={[0, -2.2, 0]}>
                <div
                    className="body"
                    style={{
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
                                I'm a creative developer working on apps and web
                                projects all the time. I started this journey
                                when I was 16 years old and have been working
                                full time as a developer since 2018.
                            </p>
                            <p>
                                Besides that, for almost the same amount of
                                time, I've been a photographer. Starting with
                                just my phone in 2019 I worked my way up to a
                                professional camera and now even doing paid work
                                for clients sometimes.
                            </p>
                        </div>
                    </div>
                </div>
            </Html>
        </MobileScrollWrapper>
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
