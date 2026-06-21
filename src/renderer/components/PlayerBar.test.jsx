import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PlayerBar } from './PlayerBar'

function makePlayer(overrides = {}) {
  return {
    currentTrack: { id: 1, name: 'Song', artist: 'Artist' },
    isPlaying: false,
    currentTime: 0,
    duration: 100,
    volume: 1,
    togglePlay: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    skipNext: vi.fn(),
    skipPrev: vi.fn(),
    prevTrack: vi.fn(),
    ...overrides,
  }
}

describe('PlayerBar transport buttons', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('forward button skips to the next track', () => {
    const player = makePlayer()
    render(<PlayerBar player={player} />)
    fireEvent.click(screen.getByLabelText('Next track'))
    expect(player.skipNext).toHaveBeenCalledTimes(1)
  })

  it('single click on backward applies the 3-second rule (skipPrev)', () => {
    const player = makePlayer()
    render(<PlayerBar player={player} />)
    fireEvent.click(screen.getByLabelText(/Previous/))
    // Nothing happens until the double-click window elapses.
    expect(player.skipPrev).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(300))
    expect(player.skipPrev).toHaveBeenCalledTimes(1)
    expect(player.prevTrack).not.toHaveBeenCalled()
  })

  it('double click on backward jumps to the previous track', () => {
    const player = makePlayer()
    render(<PlayerBar player={player} />)
    const back = screen.getByLabelText(/Previous/)
    fireEvent.click(back)
    fireEvent.click(back)
    act(() => vi.advanceTimersByTime(300))
    expect(player.prevTrack).toHaveBeenCalledTimes(1)
    expect(player.skipPrev).not.toHaveBeenCalled()
  })

  it('disables transport buttons when nothing is loaded', () => {
    const player = makePlayer({ currentTrack: null })
    render(<PlayerBar player={player} />)
    expect(screen.getByLabelText('Next track').disabled).toBe(true)
    expect(screen.getByLabelText(/Previous/).disabled).toBe(true)
  })
})
