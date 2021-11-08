import { Box, Heading } from "@chakra-ui/react";
import styles from "./root_ui.module.scss";
import Link from "next/link";
import { useRouter } from "next/router";

const RootUI = () => {
    const router = useRouter();

    const onClick = () => { router.push("/portfolio/photos") }

    return (
        <Box>
            {/* <Heading className={styles.headline_text}>Photography</Heading> */}

            {/* <Heading onClick={onClick} className={styles.headline_text}>Software</Heading> */}
        </Box>
    );
}

export default RootUI;