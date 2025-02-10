"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import NavigationMenu from "../components/NavigationMenu";
import { useExploreState } from "../state/explore";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RootLayout({ children }) {
  const setIsExploring = useExploreState((state) => state.setIsExploring);

  return (
    <html lang="en">
      <body>
        <header className="header-nav p-6">
          <Link href="/" onClick={() => setIsExploring(false)}>
            <motion.h1 className="text-2xl font-bold">rouven</motion.h1>
          </Link>
        </header>
        <NavigationMenu />
        {children}
      </body>
    </html>
  );
}
