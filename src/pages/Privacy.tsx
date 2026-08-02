import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/motion/gsap'
import { useUI } from '@/stores/ui'

export function Privacy() {
  const rootRef = useRef<HTMLElement>(null)
  // hold the entrance until the wipe (or initial loader) starts revealing
  const revealed = useUI((s) => s.revealed)

  useGSAP(
    () => {
      if (!revealed || prefersReducedMotion()) return
      gsap.from('.privacy-heading-inner', {
        yPercent: 110,
        duration: 1,
        ease: 'power4.out',
        delay: 0.1,
      })
      gsap.from('.privacy-body > *', {
        opacity: 0,
        y: 24,
        duration: 0.8,
        // tighter than the other pages' 0.1 — this block runs to nine children
        stagger: 0.06,
        ease: 'power3.out',
        delay: 0.3,
      })
    },
    { scope: rootRef, dependencies: [revealed] }
  )

  return (
    <section ref={rootRef} className="privacy container">
      <header className="page-heading">
        <h1 className="display-xl">
          <span className="privacy-heading-inner">
            privacy<span className="accent">.</span>
          </span>
        </h1>
        <p className="instrument-line">[ effective 01.03.2024 ]</p>
      </header>
      <div className="privacy-body">
        <p>
          Thank you for visiting rouvens work (the "Website"). Your privacy is
          important to me, and I am committed to protecting your personal
          information. This Privacy Policy outlines the types of information
          collected when you visit our Website, how I use and protect that
          information, and your rights regarding your personal data.
        </p>
        <p>
          As the owner and operator of rouvens work, I prioritize privacy and
          data compliance. I utilize Vercel Web Analytics to gather insights
          about website traffic while ensuring user privacy.
        </p>
        <h2>Data collected</h2>
        <p>
          Vercel Analytics: To enhance our website, we use Vercel Web
          Analytics. These tools collect aggregated data to provide insights
          into website usage and performance, with no individual visitor
          identification. For more information on Vercel's data practices,
          please refer to their privacy policies:{' '}
          <a href="https://vercel.com/docs/analytics/privacy-policy">
            Vercel Web Analytics Privacy and Compliance
          </a>
          .
        </p>
        <h2>Updates to the Privacy Policy</h2>
        <p>
          This Privacy Policy may be updated periodically to reflect changes in
          our privacy practices. I will notify users of any material changes by
          posting the updated Privacy Policy on our Website. Your continued use
          of the Website after the posting of changes constitutes your
          acceptance of such changes.
        </p>
        <h2>Contact Information</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or
          our privacy practices, please contact me at{' '}
          <a href="mailto:rouven@luehrs.dev">rouven@luehrs.dev</a>.
        </p>
        <p>
          By using our Website, you consent to the collection and use of
          non-personal data as described in this Privacy Policy. If you do not
          agree with the terms of this Policy, please do not use our Website.
        </p>
      </div>
    </section>
  )
}
