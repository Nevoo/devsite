import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'

export function Contact() {
  const rootRef = useRef<HTMLElement>(null)
  // hold the entrance until the wipe (or initial loader) starts revealing
  const revealed = useUI((s) => s.revealed)

  // the drench has to reach past this tree — the cursor, the selection colour
  // and the seam with the footer all live outside it
  useEffect(() => {
    document.body.classList.add('drench')
    return () => document.body.classList.remove('drench')
  }, [])

  useGSAP(
    () => {
      if (!revealed || prefersReducedMotion()) return
      gsap.from('.contact-heading-inner', {
        yPercent: 110,
        duration: 1,
        ease: 'power4.out',
        delay: 0.1,
      })
      gsap.from('.contact-body > *', {
        opacity: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.3,
      })
    },
    { scope: rootRef, dependencies: [revealed] }
  )

  return (
    // the section carries the colour full-bleed and the container sits inside
    // it, the same way the footer drench is built
    <section ref={rootRef} className="contact contact-drench">
      <div className="container">
        <header className="page-heading">
          <h1 className="display-xl">
            <span className="contact-heading-inner">
              get in touch<span className="accent">.</span>
            </span>
          </h1>
        </header>
        <div className="contact-body">
          <a className="contact-mail display-lg" href="mailto:rouven@luehrs.dev">
            rouven@luehrs.dev
          </a>
          <p className="contact-note">
            tell me what you're making. that's the part i want to hear about.
          </p>
          <ul className="contact-socials">
            <li>
              <a href="https://www.youtube.com/@codewithnevo" target="_blank" rel="noreferrer">
                youtube ↗
              </a>
            </li>
            <li>
              <a href="https://github.com/Nevoo" target="_blank" rel="noreferrer">
                github ↗
              </a>
            </li>
            <li>
              <a href="https://twitter.com/truenevo" target="_blank" rel="noreferrer">
                twitter ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
