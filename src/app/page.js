"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadingScreen from "../components/LoadingScreen";
import HeroSection from "../components/HeroSection";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Observer } from "gsap/Observer";
import ScrollTrigger from "gsap/ScrollTrigger";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gsap.registerPlugin(Observer, ScrollTrigger, useGSAP);
  }, []);

  return (
    <main className="relative h-screen w-screen">
      {!isLoading && <HeroSection />}
      <Suspense fallback={<LoadingScreen isVisible={true} />}>
        <Scene onLoadingComplete={() => setIsLoading(false)} />
      </Suspense>
    </main>
  );
}
