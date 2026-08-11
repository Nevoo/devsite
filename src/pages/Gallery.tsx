import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/motion/gsap'
import { Index } from '@/components/Index'
import { WebGLImage } from '@/components/WebGLImage'
import { TransitionLink } from '@/components/TransitionLink'
import { categories, getCategory } from '@/content/categories'
import { useUI } from '@/stores/ui'

/** repeating editorial layout pattern: wide / offset-left / offset-right */
const layoutClass = (i: number) => `gallery-item gallery-item-${i % 3}`

export function Gallery() {
  const { category: slug } = useParams()
  const category = getCategory(slug)
  const rootRef = useRef<HTMLElement>(null)
  const openLightbox = useUI((s) => s.openLightbox)
  // hold the entrance until the wipe (or initial loader) starts revealing
  const revealed = useUI((s) => s.revealed)

  useGSAP(
    () => {
      if (!category || !revealed || prefersReducedMotion()) return
      gsap.from('.gallery-heading-inner', {
        yPercent: 110,
        duration: 1,
        ease: 'power4.out',
        delay: 0.1,
      })
      gsap.utils.toArray<HTMLElement>('.gallery-item').forEach((item, i) => {
        gsap.fromTo(
          item,
          { y: 40 + (i % 3) * 20 },
          {
            y: -(40 + (i % 3) * 20),
            ease: 'none',
            scrollTrigger: {
              trigger: item,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        )
      })
    },
    // revertOnUpdate: gallery→gallery keeps this component mounted, so stale
    // scroll triggers from the previous category must be torn down on re-run
    { scope: rootRef, dependencies: [slug, revealed], revertOnUpdate: true }
  )

  if (!category) return <Navigate to="/work" replace />

  return (
    <section ref={rootRef} className="gallery container">
      <header className="page-heading">
        <TransitionLink to="/work" className="arrow-link arrow-link-back gallery-back">
          all work
        </TransitionLink>
        <h1 className="display-xl">
          <span className="gallery-heading-inner">
            {category.title}
            <span className="accent">.</span>
          </span>
        </h1>
        <p className="page-heading-sub">
          {category.tagline} <span className="chip">{category.photos.length} photos</span>
        </p>
      </header>

      <div className="gallery-flow">
        {category.photos.map((photo, i) => (
          <button
            key={photo.src}
            className={layoutClass(i)}
            data-cursor="view"
            onClick={() => openLightbox(category.title, category.photos, i)}
            aria-label={`open photo ${i + 1} of ${category.photos.length} fullscreen`}
          >
            <WebGLImage
              photo={photo}
              alt={photo.alt ?? `${category.title} photo ${i + 1}`}
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            />
            <span className="gallery-item-num">
              <Index n={i + 1} />
            </span>
          </button>
        ))}
      </div>

      <nav className="gallery-next">
        <NextCategoryLink current={category.slug} />
      </nav>
    </section>
  )
}

/**
 * The one photo-in-type moment on the site: the next category's cover, clipped
 * inside its own name. Two stacked layers rather than one — the stroke stays
 * lit under the fill, so the glyph edges never go soft against a busy frame.
 * The readable text is the stroke layer; the fill is a hidden duplicate.
 */
function NextCategoryLink({ current }: { current: string }) {
  const idx = categories.findIndex((c) => c.slug === current)
  const next = categories[(idx + 1) % categories.length]
  const fillRef = useRef<HTMLSpanElement>(null)

  /* Hover is the trigger wherever hover exists. Coarse pointers have none, so
     there the fill lights on scroll-into-view instead; the class only does
     anything under `(hover: none)`, so a mouse can never get both triggers. */
  useEffect(() => {
    const el = fillRef.current
    if (!el || !window.matchMedia('(hover: none)').matches) return
    // gallery→gallery keeps this element mounted: re-arm for the new cover
    el.classList.remove('is-lit')
    if (prefersReducedMotion()) {
      el.classList.add('is-lit')
      return
    }
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      onEnter: () => el.classList.add('is-lit'),
    })
    return () => trigger.kill()
  }, [next.slug])

  return (
    <TransitionLink to={`/work/${next.slug}`} className="gallery-next-link">
      <span className="gallery-next-label">next up</span>
      <span className="display-lg">
        <span className="gallery-next-title">
          <span className="outline">{next.title}</span>
          <span
            ref={fillRef}
            className="gallery-next-fill"
            style={{ backgroundImage: `url(${next.cover.src})` }}
            aria-hidden
          >
            {next.title}
          </span>
        </span>{' '}
        →
      </span>
    </TransitionLink>
  )
}
