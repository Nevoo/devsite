import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/motion/gsap'
import { webglAvailable } from '@/lib/webgl'
import { useUI } from '@/stores/ui'
import type { Photo } from '@/content/categories'

const GLView = lazy(() => import('./GLView'))

interface WebGLImageProps {
  photo: Photo
  /** explicit context-specific alt wins; category photos fall back to photo.alt */
  alt?: string
  className?: string
  style?: CSSProperties
  /** reveal immediately on mount instead of waiting for scroll-into-view */
  eager?: boolean
  /** fraction of the plane height that dissolves at the bottom edge (0 = off) */
  edgeFade?: number
  /** drift the picture inside a frame that stays welded to the grid, in uv
   *  units (0.05 ≈ 5% of the source height each way). Replaces translating the
   *  frame: the frame is what every caption and index number is aligned to. */
  parallax?: number
  /** arrive via the grade wipe (log → graded) instead of the reveal wipe */
  develop?: boolean
  /** fired when the develop actually starts (texture on the GPU), so DOM-side
   *  motion can hang off the print rather than off a parallel timeline */
  onDevelopStart?: () => void
  /** hand the grade wipe to the visitor: grab anywhere on the print and the
   *  hairline follows the pointer, log on one side, rec.709 on the other.
   *  Deliberately additive — the entrance still plays itself on load, so a
   *  visitor who never drags loses nothing. Fine pointers only. */
  gradable?: boolean
  /** the live 0..1 wipe position during a drag, for DOM that has to change
   *  state on the same beat (the hollow word in the hero) */
  onGrade?: (value: number) => void
}

const RESPONSIVE_WIDTHS = [640, 1024, 1600] as const

const derivativeSrc = (src: string, width: number) =>
  src.replace(/\.(jpe?g)$/i, `-${width}.webp`)

const responsiveWidths = (photo: Photo) =>
  /\.(jpe?g)$/i.test(photo.src)
    ? RESPONSIVE_WIDTHS.filter((width) => width <= photo.width)
    : []

const responsiveSrcSet = (photo: Photo) => {
  const widths = responsiveWidths(photo)
  if (widths.length === 0) return undefined
  const candidates = widths.map((width) => `${derivativeSrc(photo.src, width)} ${width}w`)
  if (!widths.includes(photo.width as (typeof RESPONSIVE_WIDTHS)[number])) {
    candidates.push(`${photo.src} ${photo.width}w`)
  }
  return candidates.join(', ')
}

const responsiveSizes = (className: string | undefined) => {
  if (className?.includes('hero-plate')) return '(max-width: 1152px) calc(100vw - 4rem), 1088px'
  if (className?.includes('about-portrait')) return '(max-width: 760px) calc(100vw - 2rem), 635px'
  if (className?.includes('work-card-image')) return '(max-width: 640px) calc(100vw - 2rem), 500px'
  return '(max-width: 640px) calc(100vw - 2rem), 730px'
}

/**
 * Layer 2 half of a 3D photo: a plain DOM frame that owns layout, scrolling
 * and events, with a drei <View> scissoring the shared canvas onto it.
 * Falls back to the real <img> when WebGL is unavailable (body.no-webgl).
 */
export function WebGLImage({
  photo,
  alt,
  className,
  style,
  eager = false,
  edgeFade,
  parallax,
  develop = false,
  onDevelopStart,
  gradable = false,
  onGrade,
}: WebGLImageProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  // mutable, read by the plane's useFrame — never triggers React renders
  const dissolveRef = useRef(0)
  const parallaxRef = useRef(0)
  const gradeRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const [visible, setVisible] = useState(eager)
  /* Two signals off one observer, because they answer different questions.
     `visible` LATCHES: it means "has been revealed", so the entrance wipe fires
     exactly once and scrolling back up does not replay it. `onscreen` TRACKS:
     it means "is on the screen right now", which is what playback needs. With
     only the latching one, a clip that had been seen kept decoding for the rest
     of the session. */
  const [onscreen, setOnscreen] = useState(eager)
  const [hovered, setHovered] = useState(false)
  // develop-wipe waits for the curtain (loader or page wipe) to start lifting,
  // otherwise it plays behind the overlay and the photo is just *there*
  const revealed = useUI((s) => s.revealed)
  const [planeSize, setPlaneSize] = useState<[number, number]>([0, 0])

  // scroll progress for the edge dissolve. Measured on the parent section,
  // NOT the frame: the frame overshoots the section for parallax bleed, so
  // measuring it would report nonzero progress while still at rest — which
  // is exactly a dissolve firing on an unscrolled page.
  useEffect(() => {
    const el = frameRef.current
    if (!el || !edgeFade || prefersReducedMotion()) return
    const trigger = ScrollTrigger.create({
      trigger: el.parentElement ?? el,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        dissolveRef.current = self.progress
      },
    })
    return () => trigger.kill()
  }, [edgeFade])

  // -1 as the frame enters the viewport → +1 as it leaves. The plane damps it
  // and pans the crop; nothing in the DOM moves, so the module stays on grid.
  useEffect(() => {
    const el = frameRef.current
    if (!el || !parallax || prefersReducedMotion()) return
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        parallaxRef.current = self.progress * 2 - 1
      },
    })
    return () => trigger.kill()
  }, [parallax])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setPlaneSize([Math.max(width, 1), Math.max(height, 1)])
    })
    resize.observe(el)

    let intersection: IntersectionObserver | undefined
    if (!eager) {
      intersection = new IntersectionObserver(
        ([entry]) => {
          // deliberately NOT disconnected on first hit any more: onscreen has to
          // keep tracking for the lifetime of the element
          if (entry.isIntersecting) setVisible(true)
          setOnscreen(entry.isIntersecting)
        },
        { threshold: 0.2 }
      )
      intersection.observe(el)
    }

    return () => {
      resize.disconnect()
      intersection?.disconnect()
    }
  }, [eager])

  // A drag is a mouse gesture. On touch the same movement is a scroll, and
  // stealing it to grade a photograph would be a straight downgrade, so coarse
  // pointers get the autoplaying entrance and nothing else.
  const [canGrade] = useState(
    () =>
      gradable &&
      webglAvailable() &&
      window.matchMedia('(pointer: fine)').matches &&
      !prefersReducedMotion()
  )

  const gradeFromPointer = (clientX: number) => {
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const value = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    gradeRef.current = value
    onGrade?.(value)
  }

  const gradeHandlers = canGrade
    ? {
        onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
          if (e.button !== 0) return
          // stops the fallback <img> starting a native drag and stops the
          // gesture turning into a text selection across the hero
          e.preventDefault()
          draggingRef.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          gradeFromPointer(e.clientX)
        },
        onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
          if (draggingRef.current) gradeFromPointer(e.clientX)
        },
        onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
          draggingRef.current = false
          e.currentTarget.releasePointerCapture(e.pointerId)
        },
        onPointerCancel: () => {
          draggingRef.current = false
        },
      }
    : null

  const resolvedAlt = alt ?? photo.alt ?? ''
  const canMountView =
    webglAvailable() && (eager || visible) && planeSize[0] > 1 && planeSize[1] > 1

  return (
    <div
      ref={frameRef}
      className={className ? `gl-frame ${className}` : 'gl-frame'}
      style={style}
      data-cursor={canGrade ? 'grade' : undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      {...gradeHandlers}
    >
      <img
        className="gl-frame-fallback"
        src={photo.src}
        srcSet={responsiveSrcSet(photo)}
        sizes={responsiveSizes(className)}
        width={photo.width}
        height={photo.height}
        alt={resolvedAlt}
        loading="lazy"
        decoding="async"
      />
      {canMountView && (
        <Suspense fallback={null}>
          <GLView
            photo={photo}
            planeSize={planeSize}
            visible={visible && revealed}
            onscreen={onscreen && revealed}
            hovered={hovered}
            edgeFade={edgeFade}
            dissolveRef={dissolveRef}
            parallax={parallax}
            parallaxRef={parallaxRef}
            develop={develop}
            onDevelopStart={onDevelopStart}
            gradeRef={canGrade ? gradeRef : undefined}
          />
        </Suspense>
      )}
    </div>
  )
}
