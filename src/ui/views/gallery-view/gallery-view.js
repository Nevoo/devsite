import { ScrollControls } from "@react-three/drei";

export const GalleryView = () => {
    return (
        <ScrollControls damping={0.2} pages={3} distance={0.5}>
            <Lens>
                <Scroll>
                    <Typography />
                    <Images />
                </Scroll>
                <Scroll html>
                    <div style={{ transform: "translate3d(65vw, 192vh, 0)" }}>
                        PMNDRS Pendant lamp
                        <br />
                        bronze, 38 cm
                        <br />
                        CHF 59.95
                        <br />
                    </div>
                </Scroll>
                <Preload />
            </Lens>
        </ScrollControls>
    );
};
