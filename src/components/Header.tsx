import { TransitionLink } from './TransitionLink'

export function Header() {
  return (
    <header className="site-header">
      <TransitionLink to="/" className="site-header-logo" aria-label="home">
        rouvens.work
      </TransitionLink>
      <nav className="site-header-nav" aria-label="main">
        <TransitionLink to="/work">work</TransitionLink>
        <TransitionLink to="/about">about</TransitionLink>
        <TransitionLink to="/contact">contact</TransitionLink>
      </nav>
    </header>
  )
}
