"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import NavigationMenu from "../components/NavigationMenu";
import { useExploreState } from "../state/explore";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

export default function RootLayout({ children }) {
  const setIsExploring = useExploreState((state) => state.setIsExploring);
  const { scrollYProgress } = useScroll();

  // Create a color transform based on scroll position
  const textColor = useTransform(
    scrollYProgress,
    [0.4, 0.5], // adjust these values to match when the white section appears
    ["#FFFFFF", "#000000"]
  );

  return (
    <html lang="en">
      <body>
        <div className="absolute z-10">
          <header className="fixed top-0 left-0 right-0 p-6">
            <Link href="/" onClick={() => setIsExploring(false)}>
              <motion.h1 
                className="text-2xl font-bold"
                style={{ color: textColor }}
              >
                rouven
              </motion.h1>
            </Link>
            <NavigationMenu />
          </header>
        </div>
        {children}
      </body>
    </html>
  );
}
