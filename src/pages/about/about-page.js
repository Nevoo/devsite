import { Html, Scroll, ScrollControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { animated, config, useSpring } from "@react-spring/web";

export const AboutPage = () => {
    const { width } = useThree((state) => state.size);

    const { opacity } = useSpring({
        config: config.stiff,
        from: { opacity: 0 },
        to: { opacity: 1 },
    });

    return (
        <group>
            <MobileScrollWrapper width={width}>
                <Html fullscreen position={[0, -2.2, 0]}>
                    <animated.div
                        className="body"
                        style={{
                            display: "flex",
                            opacity,
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
                                    fontSize: width > 1000 ? "7em" : "4em",
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
                                style={{
                                    maxWidth: "100%",
                                    maxHeight: "100%",
                                }}
                            />
                        </div>
                    </animated.div>
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
