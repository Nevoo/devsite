import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";
import "../styles/global.scss";

const config = {
    initialColorMode: "dark",
    useSystemColorMode: false,
};

const styles = {
    global: {
        // change background of chakra ui
        // body: {
        //     bg: "#010113"
        // }
    }
}

export const theme = extendTheme({
    config,
    styles,
});

function MyApp({ Component, pageProps }) {
    return (
        <ChakraProvider theme={theme}>
            <Component {...pageProps} />
        </ChakraProvider>
    )
}

export default MyApp