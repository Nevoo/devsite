import { useRef } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useGSAP, gsap } from '@/lib/gsap'
import { useSetCursor, useResetCursor } from '@/stores/ui'
import styles from './Header.module.css'

export function Header() {
  const headerRef = useRef<HTMLElement>(null)
  const setCursor = useSetCursor()
  const resetCursor = useResetCursor()
  const routerState = useRouterState()
  const isHome = routerState.location.pathname === '/'

  useGSAP(() => {
    // Animate header in on mount
    gsap.from(headerRef.current, {
      y: -100,
      opacity: 0,
      duration: 1,
      delay: 0.5,
      ease: 'power3.out',
    })
  }, { scope: headerRef })

  const handleMouseEnter = () => {
    setCursor({ isHovered: true, size: 'large' })
  }

  const handleMouseLeave = () => {
    resetCursor()
  }

  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.container}>
        <Link
          to="/"
          className={styles.logo}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          Rouvens
        </Link>

        <nav className={styles.nav}>
          <Link
            to="/work"
            className={styles.navLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-active={routerState.location.pathname.startsWith('/work')}
          >
            Work
          </Link>
          <Link
            to="/about"
            className={styles.navLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-active={routerState.location.pathname === '/about'}
          >
            About
          </Link>
          <Link
            to="/contact"
            className={styles.navLink}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-active={routerState.location.pathname === '/contact'}
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  )
}
