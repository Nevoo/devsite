import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The canvas is lazy by design, but the browser should already be pulling its
 * chunks while the DOM shell paints — modulepreload, not a static import.
 */
function preloadCanvasChunks(): Plugin {
  let files: string[] = []

  return {
    name: 'preload-canvas-chunks',
    apply: 'build',
    generateBundle(_options, bundle) {
      files = []
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        const isCanvasRoot = chunk.facadeModuleId?.endsWith('src/canvas/CanvasRoot.tsx')
        const isThree =
          chunk.name.startsWith('View') ||
          chunk.moduleIds.some((id) => id.includes('/three/'))
        if (isCanvasRoot || isThree) files.push(chunk.fileName)
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler: () =>
        files.map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
          injectTo: 'head' as const,
        })),
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadCanvasChunks()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
