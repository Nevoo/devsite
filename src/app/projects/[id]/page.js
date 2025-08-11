'use client';

import { useParams } from 'next/navigation';
import { useProjectState } from '@/src/state/general';
import { useShallow } from 'zustand/react/shallow';

export default function ProjectPage() {
  const params = useParams();
  const { projects } = useProjectState(
    useShallow((state) => ({
      projects: state.projects,
    }))
  );

  const project = projects.find((p) => p.id === params.id);

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">{project.title}</h1>
        
        {project.type === 'gallery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {project.images.map((image, index) => (
              <div key={index} className="relative aspect-video">
                <img
                  src={image.url}
                  alt={`Project image ${index + 1}`}
                  className="object-cover w-full h-full rounded-lg"
                />
              </div>
            ))}
          </div>
        )}

        {project.type === 'video' && (
          <div className="relative aspect-video mb-8">
            <video
              src={project.videoUrl}
              controls
              className="w-full h-full rounded-lg"
            />
          </div>
        )}

        {project.description && (
          <div className="mt-8 prose prose-invert max-w-none">
            <p>{project.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
