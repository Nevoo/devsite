import { defineConfig } from '@tanstack/start/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    preset: 'cloudflare-pages',
    prerender: {
      routes: [
        '/',
        '/about',
        '/contact',
        '/work',
        '/work/animals',
        '/work/nature',
        '/work/street',
        '/work/travel',
        '/work/concerts',
        '/work/weddings',
        '/work/events',
      ],
    },
  },
  vite: {
    plugins: [viteTsConfigPaths()],
  },
})
