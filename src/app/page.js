'use client';

import { Suspense } from "react";
import dynamic from "next/dynamic";
import LoadingScreen from "../components/LoadingScreen";

// Dynamically import LandingPage with delay
const LandingPage = dynamic(
    () => new Promise((resolve) => {
        setTimeout(() => {
            import("../components/LandingPage").then(resolve);
        }, 2000);
    }),
    {
        ssr: false
    }
);

export default function Home() {
    return (
        <main className="min-h-screen">
            <Suspense fallback={null}>
                <LandingPage />
            </Suspense>
            <LoadingScreen />
        </main>
    );
}
