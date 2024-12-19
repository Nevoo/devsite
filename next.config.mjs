/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/postprocessing',
        'postprocessing'
    ],
};

export default nextConfig;
