import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '@/components/sections/Hero'
import { FeaturedWork } from '@/components/sections/FeaturedWork'
import { getFeaturedProjects } from '@/content/projects'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => {
    return {
      featuredProjects: getFeaturedProjects(),
    }
  },
})

function HomePage() {
  const { featuredProjects } = Route.useLoaderData()

  return (
    <>
      <Hero />
      <FeaturedWork projects={featuredProjects} />
    </>
  )
}
