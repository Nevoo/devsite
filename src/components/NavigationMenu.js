import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
    { id: "01", label: "Home" },
    { id: "02", label: "Work" },
    { id: "03", label: "Company" },
    { id: "04", label: "Careers" },
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            when: "beforeChildren",
        },
    },
};

const item = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 },
};

const MenuIcon = ({ isOpen }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" className="w-6 h-6">
            <motion.line
                x1="4"
                y1="6"
                x2="20"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{
                    transform: isOpen
                        ? "rotate(45deg) translate(4px, 4px)"
                        : "none",
                }}
                transition={{ duration: 0.3 }}
                style={{ transformOrigin: "center" }}
            />
            <motion.line
                x1="4"
                y1="12"
                x2="20"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{
                    opacity: isOpen ? 0 : 1,
                }}
                transition={{ duration: 0.3 }}
            />
            <motion.line
                x1="4"
                y1="18"
                x2="20"
                y2="18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{
                    transform: isOpen
                        ? "rotate(-45deg) translate(4px, -4px)"
                        : "none",
                }}
                transition={{ duration: 0.3 }}
                style={{ transformOrigin: "center" }}
            />
        </svg>
    );
};

const NavigationMenu = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="overflow-hidden">
            {/* Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-6 right-6 p-2 text-green-400 hover:text-green-300 transition-colors z-[100]"
            >
                <MenuIcon isOpen={isOpen} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu Panel */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{
                                type: "tween",
                                duration: 0.3,
                                ease: "easeInOut",
                            }}
                            className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0a1f0a] p-6 z-50"
                        >
                            {/* Header */}
                            <div className="flex justify-start mb-12">
                                <motion.button
                                    className="bg-green-400 text-black px-4 py-2 rounded-full font-medium"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    CONTACT US
                                </motion.button>
                            </div>

                            {/* Navigation Items */}
                            <motion.nav
                                variants={container}
                                initial="hidden"
                                animate="show"
                                className="space-y-8"
                            >
                                {menuItems.map(({ id, label }) => (
                                    <motion.div
                                        key={id}
                                        variants={item}
                                        className="border-b border-green-400/20"
                                    >
                                        <motion.a
                                            href={`#${label.toLowerCase()}`}
                                            className="group flex items-center justify-end space-x-4 pb-4"
                                            whileHover={{ x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <span className="text-green-400 opacity-60 text-sm">
                                                {id}
                                            </span>
                                            <span className="text-green-400 text-4xl font-light tracking-wide group-hover:tracking-wider transition-all duration-300">
                                                {label}
                                            </span>
                                        </motion.a>
                                    </motion.div>
                                ))}
                            </motion.nav>

                            {/* Footer */}
                            <motion.div
                                className="mt-16 text-right"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.2 }}
                            >
                                <span className="text-green-400 text-sm">
                                    Unconventional Solutions
                                </span>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NavigationMenu;
