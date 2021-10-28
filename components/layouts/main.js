import Head from "next/head"
import { Box } from "@chakra-ui/react"

const Main = ({ children }) => {
    return (
        <Box>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="Personal Portfolio Website" />
                <meta name="author" content="Rouven Lührs" />
                <link rel="icon" href="/" type="favicon.ico" />
                <meta property="og:site_name" content="Rouven Lührs - Portfolio" />
                <meta property="og:type" content="website" />
                <title>Rouven Lührs - Portfolio</title>
            </Head>

            {/* <NavBar path={router.asPath} /> */}

            {children}

            {/* <Footer /> */}
        </Box>
    )
};

export default Main;