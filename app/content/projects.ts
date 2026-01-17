export interface GalleryImage {
  id: string
  src: string
  alt: string
  width: number
  height: number
  caption?: string
}

export interface Project {
  id: string
  title: string
  slug: string
  description: string
  coverImage: string
  images: GalleryImage[]
  featured: boolean
  order: number
}

export const projects: Project[] = [
  {
    id: 'animals',
    title: 'Animals',
    slug: 'animals',
    description: 'Wildlife photography capturing the beauty and raw emotion of animals in their natural habitat.',
    coverImage: '/images/categories/animals/cover.jpeg',
    featured: true,
    order: 1,
    images: [
      {
        id: 'animals-1',
        src: '/images/categories/animals/gallery/DSC00880.jpeg',
        alt: 'Wildlife photograph',
        width: 2,
        height: 3,
      },
      {
        id: 'animals-2',
        src: '/images/categories/animals/gallery/DSC8270.jpeg',
        alt: 'Wildlife photograph',
        width: 2,
        height: 3,
      },
    ],
  },
  {
    id: 'nature',
    title: 'Nature',
    slug: 'nature',
    description: 'Landscapes and natural wonders from around the world.',
    coverImage: '/images/categories/nature/cover.jpeg',
    featured: true,
    order: 2,
    images: [
      {
        id: 'nature-1',
        src: '/images/categories/nature/gallery/DSC03588.jpeg',
        alt: 'Nature landscape',
        width: 3,
        height: 2,
      },
      {
        id: 'nature-2',
        src: '/images/categories/nature/gallery/DSC03694.jpeg',
        alt: 'Nature landscape',
        width: 3,
        height: 2,
      },
      {
        id: 'nature-3',
        src: '/images/categories/nature/gallery/DSC03828.jpeg',
        alt: 'Nature landscape',
        width: 3,
        height: 2,
      },
      {
        id: 'nature-4',
        src: '/images/categories/nature/gallery/DSC03830.jpeg',
        alt: 'Nature landscape',
        width: 3,
        height: 2,
      },
      {
        id: 'nature-5',
        src: '/images/categories/nature/gallery/DSC03855.jpeg',
        alt: 'Nature landscape',
        width: 3,
        height: 2,
      },
      {
        id: 'nature-6',
        src: '/images/categories/nature/gallery/DSC8162.jpeg',
        alt: 'Nature landscape',
        width: 3,
        height: 2,
      },
    ],
  },
  {
    id: 'street',
    title: 'Street',
    slug: 'street',
    description: 'Urban life and street photography capturing candid moments.',
    coverImage: '/images/categories/street/cover.jpeg',
    featured: true,
    order: 3,
    images: [
      {
        id: 'street-1',
        src: '/images/categories/street/gallery/DSC03647.jpeg',
        alt: 'Street photography',
        width: 2,
        height: 3,
      },
      {
        id: 'street-2',
        src: '/images/categories/street/gallery/DSC05299.jpeg',
        alt: 'Street photography',
        width: 2,
        height: 3,
      },
      {
        id: 'street-3',
        src: '/images/categories/street/gallery/DSC05320.jpeg',
        alt: 'Street photography',
        width: 2,
        height: 3,
      },
    ],
  },
  {
    id: 'travel',
    title: 'Travel',
    slug: 'travel',
    description: 'Documenting journeys and adventures across the globe.',
    coverImage: '/images/categories/travel/cover.jpeg',
    featured: true,
    order: 4,
    images: [
      {
        id: 'travel-1',
        src: '/images/categories/travel/gallery/DSC03700.jpeg',
        alt: 'Travel photography',
        width: 3,
        height: 2,
      },
    ],
  },
  {
    id: 'concerts',
    title: 'Concerts',
    slug: 'concerts',
    description: 'Live music photography capturing the energy and emotion of performances.',
    coverImage: '/images/categories/concerts/cover.jpeg',
    featured: false,
    order: 5,
    images: [
      {
        id: 'concerts-1',
        src: '/images/categories/concerts/gallery/DSC04137.jpeg',
        alt: 'Concert photography',
        width: 2,
        height: 3,
      },
      {
        id: 'concerts-2',
        src: '/images/categories/concerts/gallery/DSC04159.jpeg',
        alt: 'Concert photography',
        width: 2,
        height: 3,
      },
      {
        id: 'concerts-3',
        src: '/images/categories/concerts/gallery/DSC04230.jpeg',
        alt: 'Concert photography',
        width: 2,
        height: 3,
      },
      {
        id: 'concerts-4',
        src: '/images/categories/concerts/gallery/DSC04248.jpeg',
        alt: 'Concert photography',
        width: 2,
        height: 3,
      },
      {
        id: 'concerts-5',
        src: '/images/categories/concerts/gallery/DSC04330.jpeg',
        alt: 'Concert photography',
        width: 2,
        height: 3,
      },
      {
        id: 'concerts-6',
        src: '/images/categories/concerts/gallery/DSC04360.jpeg',
        alt: 'Concert photography',
        width: 2,
        height: 3,
      },
    ],
  },
  {
    id: 'weddings',
    title: 'Weddings',
    slug: 'weddings',
    description: 'Capturing the most special moments of celebration and love.',
    coverImage: '/images/categories/weddings/cover.jpeg',
    featured: false,
    order: 6,
    images: [],
  },
  {
    id: 'events',
    title: 'Events',
    slug: 'events',
    description: 'Corporate and private event photography.',
    coverImage: '/images/categories/events/gallery/DSC09296.jpeg',
    featured: false,
    order: 7,
    images: [
      {
        id: 'events-1',
        src: '/images/categories/events/gallery/DSC09296.jpeg',
        alt: 'Event photography',
        width: 3,
        height: 2,
      },
    ],
  },
]

// Helper functions
export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured).sort((a, b) => a.order - b.order)
}

export function getAllProjects(): Project[] {
  return [...projects].sort((a, b) => a.order - b.order)
}
