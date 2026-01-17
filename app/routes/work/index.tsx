import { createFileRoute } from '@tanstack/react-router'
import { CategoryGrid } from '@/components/sections/CategoryGrid'
import { getAllProjects } from '@/content/projects'

export const Route = createFileRoute('/work/')({
  component: WorkPage,
  loader: () => {
    return {
      projects: getAllProjects(),
    }
  },
  head: () => ({
    meta: [
      { title: 'Work — Rouvens' },
      { name: 'description', content: 'Browse all photography and film work by Rouven.' },
    ],
  }),
})

function WorkPage() {
  const { projects } = Route.useLoaderData()

  return <CategoryGrid projects={projects} />
}
