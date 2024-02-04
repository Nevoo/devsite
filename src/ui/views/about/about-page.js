import { Scroll, ScrollControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { animated, config, useSpring } from "@react-spring/web";
import { CameraView } from "../../../routing/camera-view";

export const AboutPage = () => {
    const { width, height } = useThree((state) => state.size);

    const { opacity } = useSpring({
        config: config.stiff,
        from: { opacity: 0 },
        to: { opacity: 1 },
    });

    return (
        <CameraView isFloating={false}>
            <MobileScrollWrapper>
                <animated.div
                    className="body"
                    style={{
                        display: "flex",
                        opacity,
                        flexDirection: width > 1200 ? "row" : "column",
                        justifyContent: "space-between",
                        textAlign: "left",
                        paddingTop: "150px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            width: width > 1200 ? "50%" : "100%",
                            marginRight:
                                width > 1200 && height > 1000 ? "0px" : "100px",
                        }}
                    >
                        <h1
                            style={{
                                fontFamily: "GilroyExtraBold",
                                fontSize:
                                    width > 1200
                                        ? "10em"
                                        : width < 700
                                        ? "4em"
                                        : "6em",
                                fontWeight: "bold",
                                lineHeight: "0.9",
                                letterSpacing:
                                    width > 1200
                                        ? "-12px"
                                        : width < 700
                                        ? "-2px"
                                        : "-10px",
                            }}
                        >
                            about me
                        </h1>

                        <div
                            style={{
                                fontFamily: "GilroyExtraBold",
                                fontSize: "2em",
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
                    <div
                        style={{
                            paddingTop: "150px",
                            height:
                                width > 1200 && height > 1000
                                    ? "800px"
                                    : "700px",
                        }}
                    >
                        <img
                            alt="portrait of me"
                            src="portrait.jpeg"
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                            }}
                        />
                    </div>
                </animated.div>
            </MobileScrollWrapper>
        </CameraView>
    );
};

export const MobileScrollWrapper = ({ children }) => {
    const { width, height } = useThree((state) => state.size);

    return (
        <ScrollControls pages={width > 1200 && height > 1000 ? "0" : "2"}>
            <Scroll html>{children}</Scroll>
        </ScrollControls>
    );
};
