import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewTabs, VIEWS } from './ViewTabs'

describe('ViewTabs', () => {
  it('renders a tab for each view', () => {
    render(<ViewTabs view="library" onChange={vi.fn()} />)
    for (const v of VIEWS) {
      expect(screen.getByRole('tab', { name: v.label })).toBeTruthy()
    }
  })

  it('marks the active view', () => {
    render(<ViewTabs view="albums" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Albums' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'Library' }).getAttribute('aria-selected')).toBe('false')
  })

  it('calls onChange with the tab id when clicked', () => {
    const onChange = vi.fn()
    render(<ViewTabs view="library" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Playlists' }))
    expect(onChange).toHaveBeenCalledWith('playlists')
  })
})
