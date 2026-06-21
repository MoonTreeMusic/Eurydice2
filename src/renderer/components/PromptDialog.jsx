import { useState, useEffect, useRef } from 'react'

// A small modal text-input dialog. Electron doesn't support window.prompt(),
// so this replaces it. onSubmit receives the trimmed value; onCancel is called
// for Cancel / Escape / clicking the backdrop.
export function PromptDialog({ title, defaultValue = '', confirmLabel = 'Create', onSubmit, onCancel }) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function submit(e) {
    e.preventDefault()
    onSubmit(value.trim())
  }

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <label className="modal-title">{title}</label>
        <input
          ref={inputRef}
          className="modal-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
          }}
        />
        <div className="modal-actions">
          <button type="button" className="btn-icon" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-icon btn-primary">
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
