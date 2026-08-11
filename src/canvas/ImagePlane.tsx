import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import type { Photo } from '@/content/categories'
import { imagePlaneVertex, imagePlaneFragment } from './shaders/imagePlane'

interface ImagePlaneProps {
  photo: Photo
  /** pixel size of the tracked DOM element */
  planeSize: [number, number]
  /** latches true once the frame scrolled into view → triggers the reveal */
  visible: boolean
  /** tracks whether the frame is on screen right now → gates clip playback */
  onscreen?: boolean
  hovered: boolean
  /** fraction of the plane height that dissolves at the bottom edge (0 = off) */
  edgeFade?: number
  /** mutable scroll progress 0..1 driving the dissolve front (written by the DOM half) */
  dissolveRef?: { current: number }
  /** uv-space amplitude of the in-frame picture drift (0 = off) */
  parallax?: number
  /** mutable -1..1 travel through the viewport (written by the DOM half) */
  parallaxRef?: { current: number }
  /** arrive via the grade wipe (log → graded, split-screen) instead of the
   *  reveal wipe */
  develop?: boolean
  /** mutable 0..1 wipe position written by a pointer drag, or null when nobody
   *  has taken hold of it. The first non-null value kills the entrance tween:
   *  once the visitor has the handle, the animation must not keep pulling
   *  against them. Read here rather than passed as a prop so a drag costs zero
   *  React renders — it has to track the pointer 1:1 to feel like a tool. */
  gradeRef?: { current: number | null }
  /** fired when the develop tween actually begins — i.e. when the texture is
   *  on the GPU, not when the page decided it was ready. The DOM half hangs
   *  the ink registration off this so the two can't drift apart. */
  onDevelopStart?: () => void
}

const TEXTURE_WIDTHS = [640, 1024, 1600]
const MAX_DPR = 1.75
const RESIZE_SETTLE_MS = 180

const derivativeSrc = (src: string, width: number) =>
  src.replace(/\.(jpe?g)$/i, `-${width}.webp`)

/** Smallest generated texture that covers the rendered pixels. The original
 * remains the last resort when the source is narrower than 640px or the plane
 * genuinely needs more pixels than the largest non-upscaled derivative. */
function textureSource(photo: Photo, planeWidth: number) {
  if (!/\.(jpe?g)$/i.test(photo.src)) return photo.src
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const requested = Math.ceil(Math.max(planeWidth, 1) * dpr)
  const width = TEXTURE_WIDTHS.find(
    (candidate) => candidate >= requested && candidate <= photo.width
  )
  return width ? derivativeSrc(photo.src, width) : photo.src
}

const disposeTexture = (texture: THREE.Texture | null) => {
  if (!texture) return
  texture.dispose()
  const image = texture.image as { close?: () => void } | undefined
  image?.close?.()
}

async function decodeTexture(src: string, signal: AbortSignal) {
  if ('createImageBitmap' in window) {
    const response = await fetch(src, { signal })
    if (!response.ok) throw new Error(`image request failed: ${response.status}`)
    const bitmap = await createImageBitmap(await response.blob(), {
      imageOrientation: 'flipY',
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    })
    const texture = new THREE.Texture(bitmap)
    texture.flipY = false
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    texture.needsUpdate = true
    return texture
  }

  return await new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      src,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 4
        resolve(texture)
      },
      undefined,
      reject
    )
  })
}

/** Per-plane ownership avoids drei/useLoader's permanent URL cache. Decoding
 * goes through createImageBitmap off the main thread where the browser supports
 * it; old textures stay live until their replacement is ready, then are closed
 * and disposed explicitly. */
function useDecodedTexture(src: string, fallbackSrc: string) {
  const activeRef = useRef<THREE.Texture | null>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let stale = false

    const load = async () => {
      let next: THREE.Texture
      try {
        next = await decodeTexture(src, controller.signal)
      } catch {
        if (controller.signal.aborted || src === fallbackSrc) return
        try {
          next = await decodeTexture(fallbackSrc, controller.signal)
        } catch {
          return
        }
      }

      if (stale) {
        disposeTexture(next)
        return
      }
      const previous = activeRef.current
      activeRef.current = next
      setTexture(next)
      disposeTexture(previous)
    }

    void load()
    return () => {
      stale = true
      controller.abort()
    }
  }, [src, fallbackSrc])

  useEffect(
    () => () => {
      disposeTexture(activeRef.current)
      activeRef.current = null
    },
    []
  )

  return texture
}


/**
 * Footage on the plane, layered over the still rather than replacing it.
 *
 * The still is already loaded by the time this resolves, so `uMap` paints the
 * poster from the first frame and swaps to the video only once it can actually
 * play. That removes the two failure modes a video hero normally ships with: an
 * empty box while the file buffers, and a visible pop when it arrives.
 *
 * Nothing is fetched at all under reduced motion. Returning the poster is not
 * only the correct behaviour, it also means a visitor who has asked the OS for
 * less movement is not charged several megabytes to be shown a still.
 *
 * Autoplay policy is the reason `muted` and `playsInline` are set before any
 * play() call rather than as attributes afterwards: an unmuted play() is
 * rejected by every current browser, and on iOS a video without playsInline
 * takes over the whole screen.
 */
function useClipTexture(src: string | undefined, load: boolean, play: boolean) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    /* Nothing is requested until the surface has actually been scrolled to.
       The plane mounts on page load — GLView is not itself gated on scroll — so
       without this the hero's clip downloaded in full while the visitor was
       still five thousand pixels above it, which on a phone is somebody's data
       spent on a section they may never reach. */
    if (!src || !load || prefersReducedMotion()) return

    const video = document.createElement('video')
    video.muted = true
    video.defaultMuted = true
    video.playsInline = true
    video.loop = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    video.src = src
    /* Mounted, not detached. A detached <video> decodes happily in Chrome and
       is unreliable in Safari, which has historically refused to start playback
       for an element that is not in the document. It is kept out of the layout
       and out of the accessibility tree rather than hidden with display:none,
       because display:none is itself a documented way to stop a video
       decoding. */
    video.setAttribute('aria-hidden', 'true')
    video.tabIndex = -1
    Object.assign(video.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '-1',
    })
    document.body.appendChild(video)
    videoRef.current = video

    let made: THREE.VideoTexture | null = null
    const onReady = () => {
      if (made) return
      made = new THREE.VideoTexture(video)
      made.colorSpace = THREE.SRGBColorSpace
      setTexture(made)
    }
    video.addEventListener('canplay', onReady)
    video.load()

    return () => {
      video.removeEventListener('canplay', onReady)
      video.pause()
      // dropping the src is what actually cancels an in-flight download; simply
      // discarding the element leaves the request running
      video.removeAttribute('src')
      video.load()
      video.remove()
      made?.dispose()
      videoRef.current = null
      setTexture(null)
    }
  }, [src, load])

  // Playback follows the same visibility flag the reveal does, so a clip below
  // the fold costs no decode and no battery until it is actually on screen.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !texture) return
    if (play) void video.play().catch(() => {})
    else video.pause()
  }, [play, texture])

  return texture
}

/**
 * The in-canvas half of WebGLImage: a unit plane behind a normalized
 * orthographic camera, so it always fills the tracked DOM frame exactly.
 */
export function ImagePlane({
  photo,
  planeSize,
  visible,
  onscreen = true,
  hovered,
  edgeFade = 0,
  dissolveRef,
  parallax = 0,
  parallaxRef,
  develop = false,
  onDevelopStart,
  gradeRef,
}: ImagePlaneProps) {
  // held so a pointer grab can cancel it mid-flight (see the useFrame below)
  const developTween = useRef<ReturnType<typeof gsap.to> | null>(null)
  const desiredTextureSrc = useMemo(
    () => textureSource(photo, planeSize[0]),
    [photo, planeSize]
  )
  const [selectedTextureSrc, setSelectedTextureSrc] = useState(desiredTextureSrc)

  // ResizeObserver can fire several times while a grid settles. Keep the
  // current GPU resource through that burst and switch once, after 180ms.
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSelectedTextureSrc(desiredTextureSrc),
      RESIZE_SETTLE_MS
    )
    return () => window.clearTimeout(timer)
  }, [desiredTextureSrc])

  const texture = useDecodedTexture(selectedTextureSrc, photo.src)
  const textureReady = texture !== null

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.Texture | null },
      uPlaneSize: { value: new THREE.Vector2(1, 1) },
      uImageSize: { value: new THREE.Vector2(photo.width, photo.height) },
      uBg: { value: new THREE.Color('#101013') },
      uReveal: { value: 0 },
      uHover: { value: 0 },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
      uEdgeFade: { value: edgeFade },
      uDissolve: { value: 0 },
      uDevelop: { value: develop ? 0 : 1 },
      uAccent: { value: new THREE.Color('#ff2d1a') },
      uFocus: { value: new THREE.Vector2(...(photo.focus ?? [0.5, 0.5])) },
      uParallax: { value: 0 },
      uParallaxAmp: { value: parallax },
    }),
    // texture identity is stable per src; uniforms object must be created once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // CRITICAL: the material is built imperatively and attached via <primitive>.
  // Passing `uniforms` as a JSX prop lets R3F's applyProps shallow-CLONE every
  // uniform entry, detaching the GPU-side objects from the ones GSAP/useFrame
  // mutate — reveal/hover/velocity would silently freeze at their mount values.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: imagePlaneVertex,
        fragmentShader: imagePlaneFragment,
        uniforms,
        transparent: edgeFade > 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uniforms]
  )

  useEffect(() => () => material.dispose(), [material])

  /* The still, then the footage. `clip` resolves to null until the video can
     play, so this runs twice on a clip surface: once with the poster, once with
     the moving image. The cover-fit uniform is re-read from the video's own
     intrinsic size rather than from `photo.width/height`, because a still
     exported off a timeline is not guaranteed to match the delivery resolution
     of the file it came from. */
  const clip = useClipTexture(photo.clip, visible, onscreen)

  useEffect(() => {
    uniforms.uMap.value = clip ?? texture
    const video = clip?.image as HTMLVideoElement | undefined
    if (video?.videoWidth) uniforms.uImageSize.value.set(video.videoWidth, video.videoHeight)
  }, [texture, clip, uniforms])

  useEffect(() => {
    uniforms.uPlaneSize.value.set(planeSize[0] || 1, planeSize[1] || 1)
  }, [planeSize, uniforms])

  // keep the cover-fit math in sync when the photo swaps on a live plane —
  // the uniforms object itself is created only once
  useEffect(() => {
    // a live clip owns the cover-fit size; only the still's dimensions are
    // applied here, or a photo swap would reset the plane to the poster's ratio
    if (!clip) uniforms.uImageSize.value.set(photo.width, photo.height)
    uniforms.uFocus.value.set(...(photo.focus ?? [0.5, 0.5]))
  }, [photo, clip, uniforms])

  useEffect(() => {
    if (!visible || !textureReady) return
    if (prefersReducedMotion()) {
      uniforms.uReveal.value = 1
      uniforms.uDevelop.value = 1
      return
    }
    if (develop) {
      // develop mode: the grade wipe. No reveal wipe and no zoom — the frame is
      // whole from the first paint, only its look changes.
      //
      // Timing is derived, not taste. The loader curtain clears at 0.20 + 0.90
      // = 1.10s, which is 50% of this tween; power2.inOut(0.5) = 0.5, and the
      // shader's front sits at x = 0.5 there. So the curtain lifts with the
      // hairline dead centre — the wipe is caught mid-travel rather than
      // half-finished behind an opaque panel. If LoadingScreen's curtain timing
      // changes, change this too.
      uniforms.uReveal.value = 1
      onDevelopStart?.()
      const tween = gsap.to(uniforms.uDevelop, {
        value: 1,
        duration: 2.2,
        ease: 'power2.inOut',
      })
      developTween.current = tween
      return () => {
        tween.kill()
        developTween.current = null
      }
    }
    const tween = gsap.to(uniforms.uReveal, {
      value: 1,
      duration: 1.6,
      ease: 'power3.out',
    })
    return () => {
      tween.kill()
    }
    // onDevelopStart must be referentially stable, or the develop restarts
  }, [visible, develop, uniforms, onDevelopStart, textureReady])

  useEffect(() => {
    uniforms.uEdgeFade.value = edgeFade
  }, [edgeFade, uniforms])

  useEffect(() => {
    uniforms.uParallaxAmp.value = prefersReducedMotion() ? 0 : parallax
  }, [parallax, uniforms])

  useFrame((_, delta) => {
    if (!prefersReducedMotion()) uniforms.uTime.value += delta
    uniforms.uDissolve.value = dissolveRef?.current ?? 0

    // The grade, under the visitor's hand. Written straight through with no
    // damping on purpose: a colourist's wipe handle is a tool, and a tool that
    // eases toward where you put it feels broken rather than smooth. The
    // entrance tween dies on first contact so the two can never fight over the
    // same uniform.
    const grade = gradeRef?.current
    if (grade != null) {
      if (developTween.current) {
        developTween.current.kill()
        developTween.current = null
      }
      uniforms.uDevelop.value = grade
    }
    // damped so a flung scroll drifts the picture rather than snapping it
    uniforms.uParallax.value = THREE.MathUtils.damp(
      uniforms.uParallax.value,
      parallaxRef?.current ?? 0,
      9,
      delta
    )
    uniforms.uHover.value = THREE.MathUtils.damp(
      uniforms.uHover.value,
      hovered ? 1 : 0,
      5,
      delta
    )
    uniforms.uVelocity.value = THREE.MathUtils.damp(
      uniforms.uVelocity.value,
      useUI.getState().scrollVelocity,
      8,
      delta
    )
  })

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 0, 1]}
        left={-0.5}
        right={0.5}
        top={0.5}
        bottom={-0.5}
        near={0.1}
        far={10}
        manual
      />
      <mesh>
        <planeGeometry args={[1, 1, 32, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}
