import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useGSAP, gsap } from '@/lib/gsap'
import { useSetCursor, useResetCursor } from '@/stores/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './contact.module.css'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: 'Contact — Rouvens' },
      { name: 'description', content: 'Get in touch for photography and film projects.' },
    ],
  }),
})

function ContactPage() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const setCursor = useSetCursor()
  const resetCursor = useResetCursor()
  const prefersReducedMotion = useReducedMotion()

  const email = 'hello@rouvens.work'

  useGSAP(() => {
    if (prefersReducedMotion) return

    gsap.from(contentRef.current?.querySelectorAll('.animate-in') ?? [], {
      opacity: 0,
      y: 50,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out',
      delay: 0.2,
    })
  }, { scope: sectionRef })

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const handleMouseEnter = () => {
    setCursor({ isHovered: true, size: 'large' })
  }

  const handleMouseLeave = () => {
    resetCursor()
  }

  return (
    <section ref={sectionRef} className={styles.section}>
      <div ref={contentRef} className={styles.content}>
        <h1 className={`${styles.title} animate-in`}>
          Let's Create<br />
          Something Together
        </h1>

        <p className={`${styles.intro} animate-in`}>
          Have a project in mind? I'd love to hear about it.
          Whether it's a commercial shoot, event coverage, or a creative collaboration,
          let's make it happen.
        </p>

        <div className={`${styles.emailSection} animate-in`}>
          <a
            href={`mailto:${email}`}
            className={styles.emailLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {email}
          </a>
          <button
            onClick={handleCopyEmail}
            className={styles.copyButton}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className={`${styles.socials} animate-in`}>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            Instagram
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            Twitter
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            LinkedIn
          </a>
        </div>

        <div className={`${styles.location} animate-in`}>
          <span className={styles.locationLabel}>Based in</span>
          <span className={styles.locationValue}>Germany</span>
          <span className={styles.availability}>Available worldwide</span>
        </div>
      </div>
    </section>
  )
}
