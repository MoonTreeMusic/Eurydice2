import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SeekBar } from './SeekBar'

// jsdom returns zeroed rects; give the track a real geometry: 200px wide at x=0.
function mockTrackGeometry() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 200,
    left: 0,
    top: 0,
    right: 200,
    bottom: 4,
    height: 4,
    x: 0,
    y: 0,
    toJSON: () => {},
  })
}

describe('SeekBar', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockTrackGeometry()
    // jsdom lacks pointer-capture methods.
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  })

  it('seeks to the clicked position (pointer down + up at the same spot)', () => {
    const onSeek = vi.fn()
    render(<SeekBar currentTime={0} duration={100} onSeek={onSeek} />)
    const track = screen.getByRole('slider')
    fireEvent.pointerDown(track, { clientX: 50, pointerId: 1 }) // 25% of 200px
    fireEvent.pointerUp(track, { clientX: 50, pointerId: 1 })
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(25) // 25% of 100s
  })

  it('commits the released position after dragging', () => {
    const onSeek = vi.fn()
    render(<SeekBar currentTime={0} duration={100} onSeek={onSeek} />)
    const track = screen.getByRole('slider')
    fireEvent.pointerDown(track, { clientX: 20, pointerId: 1 })
    fireEvent.pointerMove(track, { clientX: 120, pointerId: 1 }) // preview only
    fireEvent.pointerMove(track, { clientX: 160, pointerId: 1 }) // 80%
    expect(onSeek).not.toHaveBeenCalled() // nothing committed mid-drag
    fireEvent.pointerUp(track, { clientX: 160, pointerId: 1 })
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(80)
  })

  it('clamps positions to the [0, duration] range', () => {
    const onSeek = vi.fn()
    render(<SeekBar currentTime={0} duration={100} onSeek={onSeek} />)
    const track = screen.getByRole('slider')
    fireEvent.pointerDown(track, { clientX: 500, pointerId: 1 }) // past the right edge
    fireEvent.pointerUp(track, { clientX: 500, pointerId: 1 })
    expect(onSeek).toHaveBeenCalledWith(100)
  })

  it('does not seek when duration is unknown', () => {
    const onSeek = vi.fn()
    render(<SeekBar currentTime={0} duration={0} onSeek={onSeek} />)
    const track = screen.getByRole('slider')
    fireEvent.pointerDown(track, { clientX: 50, pointerId: 1 })
    fireEvent.pointerUp(track, { clientX: 50, pointerId: 1 })
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('supports keyboard seeking', () => {
    const onSeek = vi.fn()
    render(<SeekBar currentTime={30} duration={100} onSeek={onSeek} />)
    const track = screen.getByRole('slider')
    fireEvent.keyDown(track, { key: 'ArrowRight' })
    expect(onSeek).toHaveBeenLastCalledWith(35)
    fireEvent.keyDown(track, { key: 'ArrowLeft' })
    expect(onSeek).toHaveBeenLastCalledWith(25)
    fireEvent.keyDown(track, { key: 'End' })
    expect(onSeek).toHaveBeenLastCalledWith(100)
    fireEvent.keyDown(track, { key: 'Home' })
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })
})
