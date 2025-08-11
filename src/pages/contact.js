"use client";

import React from "react";
import { motion } from "framer-motion";

const Contact = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-8 md:p-16"
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Contact Me</h1>

        <div className="space-y-8">
          <div className="bg-white/5 p-6 rounded-lg backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-gray-300 mb-6">
              Feel free to reach out to me for any inquiries or collaborations.
            </p>

            <form className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>

          <div className="bg-white/5 p-6 rounded-lg backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-4">
              Other Ways to Connect
            </h2>
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <span className="text-gray-300">Email:</span>
                <a
                  href="mailto:contact@example.com"
                  className="text-blue-400 hover:text-blue-300"
                >
                  contact@example.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-gray-300">LinkedIn:</span>
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  linkedin.com/in/yourprofile
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-gray-300">GitHub:</span>
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  github.com/yourusername
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Contact;
