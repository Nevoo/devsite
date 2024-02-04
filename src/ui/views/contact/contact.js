import { Html } from "@react-three/drei";
import { CameraView } from "../../../routing/camera-view";
import { animated, config, useSpring } from "@react-spring/web";
import { useThree } from "@react-three/fiber";
import { MobileScrollWrapper } from "../about/about-page";

export function ContactPage() {
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
                        flexDirection: "row",
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
                                        : "-6px",
                            }}
                        >
                            get in touch
                        </h1>
                        <div
                            style={{
                                fontFamily: "GilroyExtraBold",
                                fontSize:
                                    width > 1200
                                        ? "2em"
                                        : width < 700
                                        ? "1em"
                                        : "1.5em",
                                fontWeight: "bold",
                            }}
                        >
                            <p>
                                <a
                                    href="mailto:rouven@luehrs.dev"
                                    style={{
                                        color: "#232323",
                                        fontFamily: "GilroyLight",
                                        fontSize: "1.5em",
                                    }}
                                >
                                    Write me a message, I'd love to hear from
                                    you.
                                </a>
                            </p>
                            <h2
                                style={{
                                    fontSize:
                                        width > 1200
                                            ? "4em"
                                            : width < 700
                                            ? "1.8em"
                                            : "2.2em",
                                    letterSpacing:
                                        width > 1200
                                            ? "-5px"
                                            : width < 700
                                            ? "-1px"
                                            : "-3px",
                                }}
                            >
                                follow my socials:
                            </h2>
                            <ul
                                style={{
                                    color: "#232323",
                                    fontSize:
                                        width > 1200
                                            ? "2em"
                                            : width < 700
                                            ? "1.8em"
                                            : "2.2em",
                                }}
                            >
                                <li>
                                    <a
                                        style={{ color: "#232323" }}
                                        target="_blank"
                                        href="https://www.youtube.com/@codewithnevo"
                                    >
                                        youtube
                                    </a>
                                </li>
                                <li>
                                    <a
                                        style={{ color: "#232323" }}
                                        target="_blank"
                                        href="https://github.com/Nevoo"
                                    >
                                        github
                                    </a>
                                </li>
                                <li>
                                    <a
                                        style={{ color: "#232323" }}
                                        target="_blank"
                                        href="https://twitter.com/truenevo"
                                    >
                                        twitter
                                    </a>
                                </li>
                                <li>
                                    <a
                                        style={{ color: "#232323" }}
                                        target="_blank"
                                        href="https://www.instagram.com/truenevo/"
                                    >
                                        instagram
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </animated.div>
            </MobileScrollWrapper>
        </CameraView>
    );
}
