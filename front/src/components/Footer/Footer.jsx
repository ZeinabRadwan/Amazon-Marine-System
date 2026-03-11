import { useTranslation } from 'react-i18next'
import './Footer.css'

const DEFAULT_LINKS = [
  { labelKey: 'footer.support', href: '/support' },
  { labelKey: 'footer.documentation', href: '/docs' },
  { labelKey: 'footer.systemStatus', href: '/status' },
]

/**
 * Footer – minimal SaaS dashboard footer at the bottom of the content area.
 *
 * Optional props:
 *   - version: string (e.g. "1.0")
 *   - companyName: string (e.g. "Amazon Marine System")
 *   - links: Array<{ label: string, href: string } | { labelKey: string, href: string }>
 */
export default function Footer({
  version = '1.0',
  companyName = 'Amazon Marine System',
  links = DEFAULT_LINKS,
}) {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  const resolvedLinks = links.map((link) => ({
    ...link,
    label: link.labelKey ? t(link.labelKey, link.label ?? 'Link') : (link.label ?? 'Link'),
  }))

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <div className="footer__left">
          <span className="footer__copy">
            {companyName} © {year}
          </span>
          <span className="footer__sep" aria-hidden>|</span>
          <span className="footer__version">{t('footer.version', 'Version')} {version}</span>
        </div>
        <nav className="footer__right" aria-label="Footer links">
          <ul className="footer__links">
            {resolvedLinks.map((link, index) => (
              <li key={index} className="footer__link-item">
                {index > 0 && <span className="footer__link-sep" aria-hidden>|</span>}
                <a
                  href={link.href}
                  className="footer__link"
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
