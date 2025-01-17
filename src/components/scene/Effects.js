import {
  EffectComposer,
  Bloom,
  DepthOfField,
} from "@react-three/postprocessing";

export default function Effects() {
  return (
    <EffectComposer disableNormalPass>
      <Bloom
        luminanceThreshold={0}
        mipmapBlur
        luminanceSmoothing={0.0}
        intensity={1}
      />
      <DepthOfField
        target={[0, 0, 0]}
        focalLength={5}
        bokehScale={15}
        height={700}
      />
    </EffectComposer>
  );
}
