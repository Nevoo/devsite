import { Suspense } from "react";
import styles from "./page.module.css";
import dynamic from "next/dynamic";
import LandingPage from "../components/LandingPage";

// const Scene = dynamic(() => import("../components/Scene"), { ssr: false });

export default function Home() {
    return (
        <main className={styles.main}>
            <Suspense fallback={<div>Loading...</div>}>
                <LandingPage />
            </Suspense>
        </main>
    );
}
