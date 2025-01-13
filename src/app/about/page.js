"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-8">About Me</h1>

        <div className="space-y-6">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg"
          >
            I'm a passionate developer focused on creating immersive web
            experiences and pushing the boundaries of what's possible on the
            web.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex space-x-6"
          >
            <Link
              href="https://linkedin.com/in/yourprofile"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              LinkedIn
            </Link>
            <Link
              href="https://github.com/yourusername"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              GitHub
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-semibold mb-4">Skills</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                Frontend Development
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">3D Web Graphics</div>
              <div className="p-4 bg-gray-900 rounded-lg">UI/UX Design</div>
              <div className="p-4 bg-gray-900 rounded-lg">React & Next.js</div>
              <div className="p-4 bg-gray-900 rounded-lg">Three.js</div>
              <div className="p-4 bg-gray-900 rounded-lg">WebGL</div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
