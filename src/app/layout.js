"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import NavigationMenu from "../components/NavigationMenu";
import { useExploreState } from "../state/explore";

export default function RootLayout({ children }) {
  const setIsExploring = useExploreState((state) => state.setIsExploring);

  return (
    <html lang="en">
      <body>
        <div className="absolute z-10">
          <header className="fixed top-0 left-0 right-0 p-6">
            <button onClick={() => setIsExploring(false)}>
              <h1 className="text-2xl font-bold text-white">rouven</h1>
            </button>
            <NavigationMenu />
          </header>
        </div>
        {children}
      </body>
    </html>
  );
}
