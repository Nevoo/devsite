import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useGSAP, gsap } from '@/lib/gsap'
import { useSetCursor, useResetCursor } from '@/stores/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Project } from '@/content/projects'
import styles from './CategoryGrid.module.css'

interface CategoryGridProps {
  projects: Project[]
}

export function CategoryGrid({ projects }: CategoryGridProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return

    const cards = sectionRef.current?.querySelectorAll(`.${styles.card}`)
    if (cards) {
      gsap.from(cards, {
        opacity: 0,
        y: 60,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.2,
      })
    }
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.header}>
        <h1 className={styles.title}>Work</h1>
        <p className={styles.description}>
          Explore the complete collection of photography and film projects
        </p>
      </div>

      <div className={styles.grid}>
        {projects.map((project, index) => (
          <CategoryCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </section>
  )
}

interface CategoryCardProps {
  project: Project
  index: number
}

function CategoryCard({ project, index }: CategoryCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const setCursor = useSetCursor()
  const resetCursor = useResetCursor()

  const { contextSafe } = useGSAP({ scope: cardRef })

  const handleMouseEnter = contextSafe(() => {
    setCursor({ isHovered: true, text: 'View', size: 'text' })

    gsap.to(imageRef.current, {
      scale: 1.08,
      duration: 0.8,
      ease: 'power3.out',
    })
  })

  const handleMouseLeave = contextSafe(() => {
    resetCursor()

    gsap.to(imageRef.current, {
      scale: 1,
      duration: 0.8,
      ease: 'power3.out',
    })
  })

  // Vary aspect ratios for visual interest
  const aspectRatios = ['4/5', '3/4', '1/1', '4/5', '3/4', '4/5', '3/4']
  const aspectRatio = aspectRatios[index % aspectRatios.length]

  return (
    <Link
      ref={cardRef}
      to="/work/$category"
      params={{ category: project.slug }}
      className={styles.card}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.imageWrapper} style={{ aspectRatio }}>
        <img
          ref={imageRef}
          src={project.coverImage}
          alt={project.title}
          className={styles.image}
          loading="lazy"
        />
        <div className={styles.overlay}>
          <span className={styles.viewText}>View Project</span>
        </div>
      </div>
      <div className={styles.cardContent}>
        <h2 className={styles.cardTitle}>{project.title}</h2>
        <span className={styles.imageCount}>
          {project.images.length} {project.images.length === 1 ? 'image' : 'images'}
        </span>
      </div>
    </Link>
  )
}
