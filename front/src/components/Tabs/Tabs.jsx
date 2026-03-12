import { useRef } from 'react'
import './Tabs.css'

function getDir() {
  if (typeof document === 'undefined') return 'ltr'
  return document.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr'
}

/**
 * Tabs – pill layout with sliding glider (Upcoming / Development / Completed style).
 * Optional badge per tab (e.g. notification count).
 * Respects locale direction (RTL/LTR) for glider position and keyboard navigation.
 *
 * @param {Array<{ id: string, label: string, badge?: number }>} tabs - List of tab items
 * @param {string} activeTab - Id of the currently active tab
 * @param {(id: string) => void} onChange - Called when selection changes
 * @param {string} [className] - Optional class for the container
 */
export default function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  const listRef = useRef(null)
  const activeIndex = tabs.findIndex((t) => t.id === activeTab)
  const safeIndex = activeIndex >= 0 ? activeIndex : 0
  const n = tabs.length
  const rtl = getDir() === 'rtl'

  const handleKeyDown = (e, currentIndex) => {
    let nextIndex = currentIndex
    const goNext = rtl ? (e.key === 'ArrowLeft' || e.key === 'ArrowDown') : (e.key === 'ArrowRight' || e.key === 'ArrowDown')
    const goPrev = rtl ? (e.key === 'ArrowRight' || e.key === 'ArrowUp') : (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
    if (goNext) {
      e.preventDefault()
      nextIndex = Math.min(currentIndex + 1, tabs.length - 1)
    } else if (goPrev) {
      e.preventDefault()
      nextIndex = Math.max(currentIndex - 1, 0)
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIndex = tabs.length - 1
    }
    if (nextIndex !== currentIndex && tabs[nextIndex]) {
      onChange?.(tabs[nextIndex].id)
      listRef.current?.querySelectorAll('[role="tab"]')?.[nextIndex]?.focus()
    }
  }

  const gliderTranslate = n > 0
    ? (rtl ? -safeIndex * 100 : safeIndex * 100)
    : 0

  if (!tabs.length) return null

  return (
    <div className={className.trim()} dir={rtl ? 'rtl' : undefined}>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Tabs"
        className="tabs-pill"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange?.(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`tabs-pill__tab ${isActive ? 'tabs-pill__tab--active' : ''}`}
            >
              {tab.label}
              {tab.badge != null && (
                <span className="tabs-pill__notification" aria-hidden>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          )
        })}
        <span
          className="tabs-pill__glider"
          aria-hidden
          style={{
            width: n > 0 ? `calc((100% - 0.75rem) / ${n})` : undefined,
            transform: `translateX(${gliderTranslate}%)`,
          }}
        />
      </div>
    </div>
  )
}
