"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import LoadingScreen from "../components/LoadingScreen";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Observer } from "gsap/Observer";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(Observer, ScrollTrigger, useGSAP);

// Dynamically import LandingPage with delay
// const LandingPage = dynamic(
//   () =>
//     new Promise((resolve) => {
//       setTimeout(() => {
//         import("../components/LandingPage").then(resolve);
//       }, 2000);
//     }),
//   {
//     ssr: false,
//   }
// );

const Scene = dynamic(() => import("../components/scene/Scene"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="relative">
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </main>
  );
}
