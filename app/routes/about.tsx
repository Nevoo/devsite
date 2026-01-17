import { useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useGSAP, gsap } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './about.module.css'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: 'About — Rouvens' },
      { name: 'description', content: 'Learn more about Rouven, a photographer and filmmaker.' },
    ],
  }),
})

function AboutPage() {
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return

    const tl = gsap.timeline({ delay: 0.2 })

    // Animate image
    tl.from(imageRef.current, {
      opacity: 0,
      scale: 1.1,
      duration: 1,
      ease: 'power3.out',
    })

    // Animate content
    tl.from(
      contentRef.current?.querySelectorAll('.animate-in') ?? [],
      {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      },
      '-=0.6'
    )
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.grid}>
        <div ref={imageRef} className={styles.imageWrapper}>
          <img
            src="/DSC03855-2.png"
            alt="Rouven - Portrait"
            className={styles.image}
          />
        </div>

        <div ref={contentRef} className={styles.content}>
          <h1 className={`${styles.title} animate-in`}>
            About
          </h1>

          <div className={`${styles.intro} animate-in`}>
            <p>
              I'm Rouven, a photographer and filmmaker based in Germany with a passion
              for capturing moments that tell stories.
            </p>
          </div>

          <div className={`${styles.bio} animate-in`}>
            <p>
              With a keen eye for detail and a love for natural light, I specialize in
              wildlife, nature, street, and event photography. My work aims to evoke
              emotion and transport viewers into the scene.
            </p>
            <p>
              When I'm not behind the camera, you can find me exploring new places,
              experimenting with new techniques, or working on film projects that
              push creative boundaries.
            </p>
          </div>

          <div className={`${styles.details} animate-in`}>
            <div className={styles.detailGroup}>
              <h3 className={styles.detailTitle}>Services</h3>
              <ul className={styles.detailList}>
                <li>Photography</li>
                <li>Videography</li>
                <li>Post-Production</li>
                <li>Event Coverage</li>
              </ul>
            </div>

            <div className={styles.detailGroup}>
              <h3 className={styles.detailTitle}>Expertise</h3>
              <ul className={styles.detailList}>
                <li>Wildlife & Nature</li>
                <li>Street Photography</li>
                <li>Events & Concerts</li>
                <li>Travel Documentation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
