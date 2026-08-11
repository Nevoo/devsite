import { useLocation } from 'react-router-dom'
import { TransitionLink } from './TransitionLink'
import { Star } from './Star'
import { StatusRail } from './StatusRail'

export function Footer() {
  // /contact makes the site's one direct request; repeating it in the same
  // scroll would turn an invitation into a pitch. The CTA stands down there —
  // the rail and the socials carry the ending's rhythm on their own.
  const onContact = useLocation().pathname === '/contact'

  return (
    <footer className="site-footer">
      <StatusRail />
      {!onContact && (
        <div className="site-footer-cta container">
          <Star className="site-footer-star" size="2.4rem" />
          <a href="mailto:rouven@luehrs.dev" className="site-footer-cta-link">
            <span className="display-xl">let's make</span>
            <span className="display-xl outline-ink">something</span>
          </a>
          <span className="site-footer-mail">rouven@luehrs.dev ↗</span>
        </div>
      )}
      <div className="site-footer-bottom container">
        <span>i build web apps · i build mobile apps · i photograph things</span>
        <div className="site-footer-links">
          <a href="https://www.youtube.com/@codewithnevo" target="_blank" rel="noreferrer">
            youtube
          </a>
          <a href="https://github.com/Nevoo" target="_blank" rel="noreferrer">
            github
          </a>
          <a href="https://twitter.com/truenevo" target="_blank" rel="noreferrer">
            twitter
          </a>
          <TransitionLink to="/privacy">privacy</TransitionLink>
        </div>
        <span>© {new Date().getFullYear()} rouven lührs</span>
      </div>
    </footer>
  )
}
