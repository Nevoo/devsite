import { createFileRoute, notFound } from '@tanstack/react-router'
import { Gallery } from '@/components/gallery/Gallery'
import { getProjectBySlug } from '@/content/projects'

export const Route = createFileRoute('/work/$category')({
  component: GalleryPage,
  loader: ({ params }) => {
    const project = getProjectBySlug(params.category)

    if (!project) {
      throw notFound()
    }

    return { project }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.project?.title ?? 'Gallery'} — Rouvens` },
      { name: 'description', content: loaderData?.project?.description ?? '' },
    ],
  }),
})

function GalleryPage() {
  const { project } = Route.useLoaderData()

  return <Gallery project={project} />
}
