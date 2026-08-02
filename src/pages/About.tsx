import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'
import { WebGLImage } from '@/components/WebGLImage'
import { TransitionLink } from '@/components/TransitionLink'

/* Another still off a timeline, so it gets the same treatment the hero plate
   does: shown whole at 16:9 rather than cropped to a portrait slot. A 4:5 crop
   of this frame throws away 55% of it, and what it throws away is the bridge
   and the air — which is the picture. */
const portrait = { src: '/images/portrait.jpg', width: 1920, height: 1080 }

export function About() {
  const rootRef = useRef<HTMLElement>(null)
  // hold the entrance until the wipe (or initial loader) starts revealing
  const revealed = useUI((s) => s.revealed)

  useGSAP(
    () => {
      if (!revealed || prefersReducedMotion()) return
      gsap.from('.about-heading-inner', {
        yPercent: 110,
        duration: 1,
        ease: 'power4.out',
        delay: 0.1,
      })
      gsap.from('.about-copy p', {
        opacity: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.3,
      })
    },
    { scope: rootRef, dependencies: [revealed] }
  )

  return (
    <section ref={rootRef} className="about container">
      <header className="page-heading">
        <h1 className="display-xl">
          <span className="about-heading-inner">
            about me<span className="accent">.</span>
          </span>
        </h1>
      </header>
      <div className="about-body">
        <div className="about-copy">
          <p>
            i'm rouven. i like filmmaking about as much as i like coding, which has made
            planning a week difficult for years.
          </p>
          <p>
            eight years a developer, most of them at a startup, building apps and products
            until i was the one leading the teams building them.
          </p>
          <p>
            for the past year it's been just me.{' '}
            <a
              className="about-link"
              href="https://arlou.dev"
              target="_blank"
              rel="noreferrer"
            >
              arlou
            </a>{' '}
            is my one-person studio: ai agents, apps, and pages like this one.
          </p>
          <p>
            the camera turned up somewhere in the middle of all that and never left. i
            shoot to remember what a place actually looked like, not to prove i was there.
          </p>
          <TransitionLink to="/contact" className="arrow-link">
            get in touch
          </TransitionLink>
        </div>
        {/* the develop wipe, not the ordinary sweep: the portrait arrives log
            and gets graded, same mechanic as the plate on home. Not `gradable`
            — `the grade.` stays the one operable object on the site. */}
        <WebGLImage
          photo={portrait}
          alt="rouven on the harbour front in sydney, the bridge behind him"
          className="about-portrait"
          develop
        />
      </div>
    </section>
  )
}
