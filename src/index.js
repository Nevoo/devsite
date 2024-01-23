import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Leva } from "leva";
import { Analytics } from "@vercel/analytics/react";
import "./fonts/Gilroy/Gilroy-ExtraBold.otf";
import "./fonts/Gilroy/Gilroy-Light.otf";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <App />
        {/* <Leva collapsed /> */}
        {/* <Analytics /> */}
    </React.StrictMode>
);
