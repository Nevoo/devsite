import { createRootRoute, Outlet, ScrollRestoration } from '@tanstack/react-router'
import { Meta, Scripts } from '@tanstack/start'
import { Header } from '@/components/layout/Header'
import { CustomCursor } from '@/components/layout/CustomCursor'
import { PageTransition } from '@/components/layout/PageTransition'

import '@/styles/global.css'

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0a0a0a' },
      { title: 'Rouvens — Photo & Film' },
      { name: 'description', content: 'Personal portfolio showcasing photo and film work by Rouven Luhrs.' },
      { property: 'og:title', content: 'Rouvens — Photo & Film' },
      { property: 'og:description', content: 'Personal portfolio showcasing photo and film work.' },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'icon', href: '/favicons/favicon-32x32.png', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
    ],
  }),
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body>
        <CustomCursor />
        <Header />
        <main>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
