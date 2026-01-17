import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useGSAP, gsap, ScrollTrigger } from '@/lib/gsap'
import { useSetCursor, useResetCursor } from '@/stores/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Project } from '@/content/projects'
import styles from './FeaturedWork.module.css'

interface FeaturedWorkProps {
  projects: Project[]
}

export function FeaturedWork({ projects }: FeaturedWorkProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return

    // Animate section header
    gsap.from(headerRef.current, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      scrollTrigger: {
        trigger: headerRef.current,
        start: 'top 80%',
      },
    })

    // Animate each project card
    const cards = containerRef.current?.querySelectorAll(`.${styles.card}`)
    if (cards) {
      cards.forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 80,
          duration: 0.8,
          delay: i * 0.1,
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
          },
        })
      })
    }
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className={styles.section}>
      <div ref={headerRef} className={styles.header}>
        <h2 className={styles.title}>Featured Work</h2>
        <p className={styles.description}>
          Selected projects from photography and film
        </p>
      </div>

      <div ref={containerRef} className={styles.grid}>
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <div className={styles.viewAll}>
        <Link to="/work" className={styles.viewAllLink}>
          View All Work
          <span className={styles.arrow}>→</span>
        </Link>
      </div>
    </section>
  )
}

interface ProjectCardProps {
  project: Project
}

function ProjectCard({ project }: ProjectCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const setCursor = useSetCursor()
  const resetCursor = useResetCursor()

  const { contextSafe } = useGSAP({ scope: cardRef })

  const handleMouseEnter = contextSafe(() => {
    setCursor({ isHovered: true, text: 'View', size: 'text' })

    gsap.to(imageRef.current, {
      scale: 1.05,
      duration: 0.6,
      ease: 'power3.out',
    })
  })

  const handleMouseLeave = contextSafe(() => {
    resetCursor()

    gsap.to(imageRef.current, {
      scale: 1,
      duration: 0.6,
      ease: 'power3.out',
    })
  })

  return (
    <Link
      ref={cardRef}
      to="/work/$category"
      params={{ category: project.slug }}
      className={styles.card}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.imageWrapper}>
        <img
          ref={imageRef}
          src={project.coverImage}
          alt={project.title}
          className={styles.image}
          loading="lazy"
        />
        <div className={styles.overlay} />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{project.title}</h3>
        <p className={styles.cardDescription}>{project.description}</p>
      </div>
    </Link>
  )
}
