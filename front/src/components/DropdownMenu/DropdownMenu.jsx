import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  cloneElement,
  isValidElement,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * DropdownMenu – reusable dropdown with trigger, panel, click-outside, and keyboard nav.
 *
 * Props:
 *   - trigger: ReactNode | (({ isOpen, ... }) => ReactNode) – button or render prop
 *   - items: Array<{ id?, label, onClick, icon?, disabled?, selected? }>
 *   - align?: 'start' | 'end' – panel alignment (default 'end')
 *   - className?: string – wrapper class
 *   - portaled?: boolean – render menu in document.body with fixed position (default true: avoids clipping in overflow-x-auto tables/cards)
 *
 * Design: rounded-lg, subtle shadow, hover transitions, light/dark, accessible.
 */
export default function DropdownMenu({
  trigger,
  items = [],
  align = 'end',
  className = '',
  portaled = true,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [fixedStyle, setFixedStyle] = useState(null)
  const wrapperRef = useRef(null)
  const menuRef = useRef(null)

  const close = useCallback(() => {
    setIsOpen(false)
    setFocusedIndex(-1)
    setFixedStyle(null)
  }, [])

  const updateFixedPosition = useCallback(() => {
    if (!portaled || !wrapperRef.current) return
    const wrap = wrapperRef.current.getBoundingClientRect()
    const gap = 4
    const rowH = 44
    const estimatedH = Math.min(items.length * rowH + 16, window.innerHeight * 0.6)
    let top = wrap.bottom + gap
    if (top + estimatedH > window.innerHeight - 8 && wrap.top > estimatedH + gap) {
      top = wrap.top - estimatedH - gap
    }
    top = Math.max(8, Math.min(top, window.innerHeight - 48))

    const left =
      align === 'end'
        ? Math.min(wrap.right, window.innerWidth - 8)
        : Math.max(8, wrap.left)

    setFixedStyle({
      position: 'fixed',
      top,
      left,
      /* Above app modals (e.g. z-[11000]) and headers; below native tooltips */
      zIndex: 20000,
      transform: align === 'end' ? 'translateX(-100%)' : 'none',
      minWidth: 'min(100vw - 16px, 220px)',
      maxHeight: 'min(60vh, 320px)',
      overflowY: 'auto',
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
    })
  }, [portaled, align, items.length])

  useLayoutEffect(() => {
    if (!isOpen || !portaled) return
    updateFixedPosition()
    const raf = requestAnimationFrame(() => updateFixedPosition())
    window.addEventListener('scroll', updateFixedPosition, true)
    window.addEventListener('resize', updateFixedPosition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', updateFixedPosition, true)
      window.removeEventListener('resize', updateFixedPosition)
    }
  }, [isOpen, portaled, updateFixedPosition])

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e) {
      if (wrapperRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  useEffect(() => {
    if (!isOpen || !menuRef.current) return
    const el = menuRef.current.querySelector(`[data-item-index="${focusedIndex}"]`)
    el?.focus()
  }, [isOpen, focusedIndex])

  const enabledItems = items.filter((it) => !it.disabled)

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(enabledItems.length > 0 ? 0 : -1)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((i) => (i < enabledItems.length - 1 ? i + 1 : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((i) => (i > 0 ? i - 1 : enabledItems.length - 1))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const item = enabledItems[focusedIndex]
      if (item) {
        item.onClick?.()
        close()
      }
    }
  }

  const toggle = () => setIsOpen((o) => !o)
  const triggerProps = {
    onClick: (e) => {
      e?.preventDefault?.()
      toggle()
    },
    onKeyDown: handleKeyDown,
    'aria-expanded': isOpen,
    'aria-haspopup': 'menu',
  }

  const triggerNode =
    typeof trigger === 'function'
      ? trigger({ isOpen, getTriggerProps: () => triggerProps })
      : isValidElement(trigger)
        ? cloneElement(trigger, {
            ...trigger.props,
            'aria-expanded': isOpen,
            'aria-haspopup': 'menu',
            onClick: (e) => {
              trigger.props.onClick?.(e)
              triggerProps.onClick(e)
            },
            onKeyDown: (e) => {
              trigger.props.onKeyDown?.(e)
              triggerProps.onKeyDown(e)
            },
          })
        : trigger

  const panelAlign = align === 'end' ? 'right-0' : 'left-0'

  const menuClassName = `
    min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg transition-opacity duration-150 dark:border-gray-700 dark:bg-gray-800
    ${portaled ? '' : `absolute top-full z-50 mt-1 ${panelAlign}`}
  `.trim()

  const menuBody = (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      style={portaled ? fixedStyle ?? { position: 'fixed', left: -9999, top: 0, zIndex: 20000 } : undefined}
      className={menuClassName}
    >
      {items.map((item, index) => {
        const disabled = item.disabled
        const selected = item.selected
        const isFocused = enabledItems.indexOf(item) === focusedIndex
        return (
          <button
            key={item.id ?? index}
            type="button"
            role="menuitem"
            data-item-index={enabledItems.indexOf(item)}
            disabled={disabled}
            tabIndex={-1}
            aria-disabled={disabled}
            aria-current={selected ? 'true' : undefined}
            className={`
              flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors
              ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              ${selected ? 'font-medium text-[#0039c5] dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}
              ${!disabled && 'hover:bg-gray-100 dark:hover:bg-gray-700'}
              ${isFocused && !disabled && 'bg-gray-50 dark:bg-gray-700/80'}
            `.trim()}
            onClick={() => {
              if (disabled) return
              item.onClick?.()
              close()
            }}
          >
            {item.icon != null && <span className="shrink-0" aria-hidden>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )

  const portalTarget = typeof document !== 'undefined' ? document.body : null

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`.trim()}>
      <div className="inline-flex">{triggerNode}</div>
      {isOpen &&
        (portaled && portalTarget
          ? createPortal(menuBody, portalTarget)
          : !portaled
            ? menuBody
            : null)}
    </div>
  )
}
