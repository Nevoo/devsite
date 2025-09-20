"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  useScroll,
  Image,
  Scroll,
  Preload,
  ScrollControls,
} from "@react-three/drei";
import { TextureLoader } from "three/src/loaders/TextureLoader";

// Custom component that automatically scales images and positions them in a grid
function AspectRatioImage({ url, targetWidth, index, ...props }) {
  const texture = useLoader(TextureLoader, url);
  const [scale, setScale] = useState([targetWidth, targetWidth, 1]);

  // Calculate aspect ratio when texture loads
  useEffect(() => {
    if (texture && texture.image) {
      const aspectRatio = texture.image.width / texture.image.height;
      const targetHeight = targetWidth / aspectRatio;
      setScale([targetWidth, targetHeight, 1]);
    }
  }, [texture, targetWidth]);

  // Position each image to take up roughly one full screen height
  const yPosition = -index * 8; // Larger spacing for full-screen approach

  return (
    <Image
      position={[0, yPosition, 0]}
      scale={scale}
      url={url}
      transparent={false}
      toneMapped={false}
      {...props}
    />
  );
}


const images = [
  {
    url: "/images/nature/gallery/DSC03828.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/weddings/gallery/DSC02847.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/concerts/gallery/DSC04248.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/concerts/gallery/DSC04137.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/concerts/gallery/DSC04360.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/travel/gallery/DSC03862.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/nature/gallery/DSC03694.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/nature/gallery/DSC8162.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/nature/gallery/DSC03830.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/street/gallery/DSC05320.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/weddings/gallery/DSC02640.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/weddings/gallery/DSC02936.jpeg",
    targetWidth: 3,
  },
  {
    url: "/images/nature/gallery/DSC03588.jpeg",
    targetWidth: 4,
  },
];

export function Gallery() {
  // One page per image for full-screen viewing experience
  const pagesNeeded = images.length;

  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }}>
        <color attach="background" args={["black"]} />
        <ScrollControls damping={0.2} pages={pagesNeeded} distance={1}>
          <Scroll>
            <Images />
          </Scroll>
          <Preload />
        </ScrollControls>
      </Canvas>
    </div>
  );
}


function Images() {
  const group = useRef();
  const data = useScroll();

  useFrame(() => {
    // Subtle zoom effects distributed across the new layout
    const totalImages = group.current.children.length;
    group.current.children.forEach((child, i) => {
      // Distribute zoom effects evenly across all images
      const scrollRangeSize = 1 / Math.ceil(totalImages / 3);
      const startRange = (Math.floor(i / 3)) * scrollRangeSize;

      child.material.zoom = 1 + data.range(startRange, scrollRangeSize) / 8; // Even more subtle zoom
    });
  });

  return (
    <group ref={group}>
      {images.map((img, i) => (
        <AspectRatioImage
          key={i}
          index={i}
          targetWidth={img.targetWidth}
          url={img.url}
        />
      ))}
    </group>
  );
}
