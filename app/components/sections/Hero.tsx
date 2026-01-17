import { useRef } from 'react'
import { useGSAP, gsap, ScrollTrigger } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './Hero.module.css'

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return

    const tl = gsap.timeline({ delay: 0.3 })

    // Animate title characters
    if (titleRef.current) {
      const chars = titleRef.current.querySelectorAll('.char')
      tl.from(chars, {
        yPercent: 100,
        opacity: 0,
        duration: 1,
        stagger: 0.03,
        ease: 'power4.out',
      })
    }

    // Animate subtitle
    if (subtitleRef.current) {
      tl.from(
        subtitleRef.current,
        {
          opacity: 0,
          y: 20,
          duration: 0.8,
          ease: 'power3.out',
        },
        '-=0.5'
      )
    }

    // Animate scroll indicator
    if (scrollIndicatorRef.current) {
      tl.from(
        scrollIndicatorRef.current,
        {
          opacity: 0,
          duration: 0.6,
        },
        '-=0.3'
      )

      // Bounce animation
      gsap.to(scrollIndicatorRef.current.querySelector(`.${styles.scrollLine}`), {
        scaleY: 1.5,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      })
    }

    // Parallax on scroll
    gsap.to(titleRef.current, {
      yPercent: 50,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })

    // Fade out scroll indicator
    gsap.to(scrollIndicatorRef.current, {
      opacity: 0,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '20% top',
        scrub: true,
      },
    })
  }, { scope: sectionRef })

  // Split text into characters for animation
  const splitText = (text: string) => {
    return text.split('').map((char, i) => (
      <span key={i} className="char" style={{ display: 'inline-block' }}>
        {char === ' ' ? '\u00A0' : char}
      </span>
    ))
  }

  return (
    <section ref={sectionRef} className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.titleWrapper}>
          <h1 ref={titleRef} className={styles.title}>
            {splitText('Rouvens')}
          </h1>
        </div>
        <p ref={subtitleRef} className={styles.subtitle}>
          Photo & Film
        </p>
      </div>

      <div ref={scrollIndicatorRef} className={styles.scrollIndicator}>
        <span className={styles.scrollText}>Scroll</span>
        <div className={styles.scrollLine} />
      </div>
    </section>
  )
}
