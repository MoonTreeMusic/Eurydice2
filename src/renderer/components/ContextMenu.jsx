import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// A lightweight cursor-positioned menu. `items` is an array of
// { label, onClick, disabled?, danger? }. Closes on outside click or Escape.
export function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)
  // Render hidden first so we can measure and clamp to the viewport.
  const [pos, setPos] = useState({ top: y, left: x, visibility: 'hidden' })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let left = x
    let top = y
    if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 8
    setPos({ top: Math.max(8, top), left: Math.max(8, left), visibility: 'visible' })
  }, [x, y])

  useEffect(() => {
    function onDocPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="context-menu" ref={ref} role="menu" style={{ position: 'fixed', ...pos }}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={`sep-${i}`} className="context-menu-separator" role="separator" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={`context-menu-item${item.danger ? ' danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              item.onClick()
              onClose()
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
