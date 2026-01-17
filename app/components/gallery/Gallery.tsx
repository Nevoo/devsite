import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useGSAP, gsap, ScrollTrigger } from '@/lib/gsap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Project, GalleryImage } from '@/content/projects'
import styles from './Gallery.module.css'

interface GalleryProps {
  project: Project
}

export function Gallery({ project }: GalleryProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(() => {
    if (prefersReducedMotion) return

    // Animate header
    gsap.from(headerRef.current, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.2,
    })

    // Animate each image on scroll
    const images = sectionRef.current?.querySelectorAll(`.${styles.imageWrapper}`)
    images?.forEach((image) => {
      gsap.from(image, {
        opacity: 0,
        y: 60,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: image,
          start: 'top 85%',
        },
      })

      // Parallax effect on image
      gsap.to(image.querySelector('img'), {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: image,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className={styles.section}>
      <div ref={headerRef} className={styles.header}>
        <Link to="/work" className={styles.backLink}>
          ← Back to Work
        </Link>
        <h1 className={styles.title}>{project.title}</h1>
        <p className={styles.description}>{project.description}</p>
        <span className={styles.count}>
          {project.images.length} {project.images.length === 1 ? 'image' : 'images'}
        </span>
      </div>

      <div className={styles.gallery}>
        {project.images.map((image, index) => (
          <GalleryImageItem key={image.id} image={image} index={index} />
        ))}
      </div>

      {project.images.length === 0 && (
        <div className={styles.empty}>
          <p>No images in this gallery yet.</p>
        </div>
      )}
    </section>
  )
}

interface GalleryImageItemProps {
  image: GalleryImage
  index: number
}

function GalleryImageItem({ image, index }: GalleryImageItemProps) {
  // Determine layout variant based on image aspect ratio and index
  const isWide = image.width > image.height
  const layoutVariants = ['full', 'left', 'right', 'center'] as const
  const variant = isWide && index % 3 === 0 ? 'full' : layoutVariants[(index % 3) + 1]

  return (
    <div className={styles.imageWrapper} data-variant={variant}>
      <div className={styles.imageContainer}>
        <img
          src={image.src}
          alt={image.alt}
          className={styles.image}
          loading="lazy"
        />
      </div>
      {image.caption && (
        <p className={styles.caption}>{image.caption}</p>
      )}
    </div>
  )
}
