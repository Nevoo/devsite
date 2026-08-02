import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import { WebGLImage } from '@/components/WebGLImage'
import { TransitionLink } from '@/components/TransitionLink'
import { categories } from '@/content/categories'

export function Work() {
  const rootRef = useRef<HTMLElement>(null)
  // hold the entrance until the wipe (or initial loader) starts revealing
  const revealed = useUI((s) => s.revealed)

  useGSAP(
    () => {
      if (!revealed || prefersReducedMotion()) return

      /* The heading develops rather than rises: the same left→right front the
         plate's grade wipe runs, at the plate's ease (power2.inOut), with the
         accent hairline riding the edge. The hairline lives OUTSIDE the clipped
         span on purpose — inside it, it would sit exactly on the clip boundary
         and be cut away by the thing it is supposed to be leading. */
      gsap
        .timeline({ delay: 0.1 })
        .fromTo(
          '.work-heading-inner',
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power2.inOut' },
          0
        )
        .fromTo(
          '.work-heading-front',
          { left: '0%', opacity: 1 },
          { left: '100%', duration: 1.1, ease: 'power2.inOut' },
          0
        )
        // out before it reaches the edge, so the front is never seen stopping
        .to('.work-heading-front', { opacity: 0, duration: 0.3, ease: 'none' }, 0.85)

      // the sub-line arrives on the tail of the wipe, not alongside it
      gsap.from('.page-heading-sub', {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.9,
      })

      gsap.utils.toArray<HTMLElement>('.work-card').forEach((card) => {
        gsap.from(card.querySelector('.work-card-text'), {
          opacity: 0,
          y: 24,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 80%' },
        })
      })
    },
    { scope: rootRef, dependencies: [revealed] }
  )

  return (
    <section ref={rootRef} className="work container">
      <header className="page-heading">
        <h1 className="display-xl">
          {/* shrink-wraps the word so the hairline's 0→100% travel is measured
              against the type, not the container */}
          <span className="work-heading">
            <span className="work-heading-inner">
              work<span className="accent">.</span>
            </span>
            <span className="work-heading-front" aria-hidden />
          </span>
        </h1>
        <p className="page-heading-sub">
          six things i keep pointing a camera at.{' '}
          {categories.reduce((n, c) => n + c.photos.length, 0)} frames i'd stand behind.
        </p>
      </header>
      <div className="work-grid">
        {categories.map((category, i) => (
          <TransitionLink
            key={category.slug}
            to={`/work/${category.slug}`}
            className="work-card"
            aria-label={`${category.title} gallery`}
          >
            <span data-cursor="view" className="work-card-media">
              <span className="work-card-num outline-accent" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <WebGLImage
                photo={category.cover}
                alt={`${category.title} cover photo`}
                className="work-card-image"
                style={{
                  aspectRatio: `${category.cover.width} / ${category.cover.height}`,
                }}
              />
            </span>
            <span className="work-card-text">
              <h2 className="display-md">{category.title}</h2>
              <span className="work-card-meta">
                <span className="chip">{category.photos.length} photos</span>
                <span className="work-card-tagline">{category.tagline}</span>
              </span>
            </span>
          </TransitionLink>
        ))}
      </div>
    </section>
  )
}
