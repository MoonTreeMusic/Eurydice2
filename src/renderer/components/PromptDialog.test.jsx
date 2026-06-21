import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptDialog } from './PromptDialog'

describe('PromptDialog', () => {
  it('submits the trimmed value', () => {
    const onSubmit = vi.fn()
    render(<PromptDialog title="Name" defaultValue="" onSubmit={onSubmit} onCancel={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '  My Mix  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onSubmit).toHaveBeenCalledWith('My Mix')
  })

  it('prefills the default value and submits on Enter', () => {
    const onSubmit = vi.fn()
    render(<PromptDialog title="Name" defaultValue="Preset" onSubmit={onSubmit} onCancel={vi.fn()} />)
    expect(screen.getByRole('textbox').value).toBe('Preset')
    fireEvent.submit(screen.getByRole('textbox').closest('form'))
    expect(onSubmit).toHaveBeenCalledWith('Preset')
  })

  it('cancels via the Cancel button and Escape', () => {
    const onCancel = vi.fn()
    render(<PromptDialog title="Name" onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
