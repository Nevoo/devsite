# Rouvens Portfolio

Personal portfolio website showcasing photo and film work.

## Tech Stack

- **Framework:** TanStack Start + TanStack Router
- **Animations:** GSAP (ScrollTrigger, useGSAP)
- **State:** Zustand (UI state)
- **Styling:** CSS Modules + CSS Variables
- **Deployment:** Cloudflare Pages

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck
```

## Project Structure

```
app/
├── routes/           # TanStack Router file-based routes
├── components/       # React components
│   ├── layout/       # Header, Footer, Cursor, etc.
│   ├── sections/     # Page sections (Hero, FeaturedWork, etc.)
│   ├── gallery/      # Gallery components
│   └── ui/           # Reusable UI components
├── hooks/            # Custom React hooks
├── stores/           # Zustand stores
├── lib/              # Utilities and GSAP setup
├── styles/           # Global CSS and variables
└── content/          # Project data
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Coding guidelines and patterns
- [TECH_SPEC.md](./TECH_SPEC.md) - Technical specification
- [PORTFOLIO_REDESIGN_PLAN.md](./PORTFOLIO_REDESIGN_PLAN.md) - Design documentation
