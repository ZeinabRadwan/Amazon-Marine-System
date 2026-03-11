import { Link } from 'react-router-dom'
import './PageHeader.css'

/**
 * PageHeader – SaaS-style page header below Navbar, above page content.
 *
 * Props:
 *   - title: string (page title)
 *   - breadcrumbs: Array<{ label: string, href?: string }> (last item = current, no href)
 *   - actions: ReactNode (optional; buttons or fragment)
 */
export default function PageHeader({ title, breadcrumbs = [], actions }) {
  return (
    <header className="page-header" role="banner">
      <div className="page-header__inner">
        <div className="page-header__left">
          {breadcrumbs.length > 0 && (
            <nav className="page-header__breadcrumb" aria-label="Breadcrumb">
              <ol className="page-header__breadcrumb-list">
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <li key={index} className="page-header__breadcrumb-item">
                      {index > 0 && (
                        <span className="page-header__breadcrumb-sep" aria-hidden>
                          /
                        </span>
                      )}
                      {isLast || !item.href ? (
                        <span
                          className="page-header__breadcrumb-current"
                          aria-current={isLast ? 'page' : undefined}
                        >
                          {item.label}
                        </span>
                      ) : (
                        <Link to={item.href} className="page-header__breadcrumb-link">
                          {item.label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ol>
            </nav>
          )}
          <h1 className="page-header__title">{title}</h1>
        </div>
        {actions != null && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  )
}
