import { Suspense } from "react";
import { Gallery } from "@/src/components/gallery/Gallery";

export const metadata = {
  title: "Gallery | Rouven Bühlmann",
  description: "A collection of my best photography work",
};

export default function GalleryPage() {
  return (
    <main className="w-full h-screen bg-[#d8d7d7]">
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    </main>
  );
}
