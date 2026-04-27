import './ListPageToolbar.css'

/**
 * Unified horizontal toolbar: search + filters (left) and action buttons (right).
 * On viewports below `lg`, stacks vertically with a divider above actions.
 *
 * @param {string} [heading] - Optional uppercase label above the filters row
 * @param {import('react').ReactNode} left - Search input, dropdowns, clear controls
 * @param {import('react').ReactNode} [right] - Primary / export actions
 * @param {string} [className] - Extra classes on the root (e.g. margin utilities)
 */
export default function ListPageToolbar({ heading, left, right, className = '' }) {
  return (
    <div className={`list-page-toolbar ${className}`.trim()}>
      <div className="list-page-toolbar__body">
        <div className="list-page-toolbar__primary">
          {heading ? <p className="list-page-toolbar__heading">{heading}</p> : null}
          <div className="list-page-toolbar__filters-slot">{left}</div>
        </div>
        {right != null && right !== false ? <div className="list-page-toolbar__actions">{right}</div> : null}
      </div>
    </div>
  )
}
