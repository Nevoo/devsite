import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Leva } from "leva";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
    <Leva collapsed />
  </React.StrictMode>
);
