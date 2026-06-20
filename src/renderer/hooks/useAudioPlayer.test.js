import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioPlayer } from './useAudioPlayer'

// Mock the Audio API
class MockAudio {
  constructor() {
    this.src = ''
    this.currentTime = 0
    this.duration = NaN
    this.volume = 1
    this._listeners = {}
    this.paused = true
  }

  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
  }

  removeEventListener(event, fn) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter((f) => f !== fn)
    }
  }

  _emit(event) {
    ;(this._listeners[event] ?? []).forEach((fn) => fn())
  }

  play() {
    this.paused = false
    this._emit('play')
    return Promise.resolve()
  }

  pause() {
    this.paused = true
    this._emit('pause')
  }

  load() {
    this.currentTime = 0
  }
}

let mockAudio

beforeEach(() => {
  mockAudio = new MockAudio()
  vi.stubGlobal('Audio', vi.fn(() => mockAudio))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAudioPlayer', () => {
  it('starts with empty tracks and no current track', () => {
    const { result } = renderHook(() => useAudioPlayer())
    expect(result.current.tracks).toHaveLength(0)
    expect(result.current.currentTrack).toBeNull()
    expect(result.current.isPlaying).toBe(false)
  })

  it('loads tracks and starts playing first one', async () => {
    const { result } = renderHook(() => useAudioPlayer())
    const tracks = [
      { path: '/music/a.mp3', name: 'a.mp3', url: 'local-file:///music/a.mp3' },
      { path: '/music/b.mp3', name: 'b.mp3', url: 'local-file:///music/b.mp3' },
    ]
    await act(async () => {
      result.current.loadTracks(tracks)
    })
    expect(result.current.tracks).toHaveLength(2)
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.currentTrack?.name).toBe('a.mp3')
  })

  it('togglePlay pauses when playing', async () => {
    const { result } = renderHook(() => useAudioPlayer())
    await act(async () => {
      result.current.loadTracks([
        { path: '/music/a.mp3', name: 'a.mp3', url: 'local-file:///music/a.mp3' },
      ])
    })
    // Now playing; toggle should pause
    await act(async () => {
      result.current.togglePlay()
    })
    expect(mockAudio.paused).toBe(true)
  })

  it('setVolume clamps between 0 and 1', async () => {
    const { result } = renderHook(() => useAudioPlayer())
    await act(async () => result.current.setVolume(2))
    expect(result.current.volume).toBe(1)
    await act(async () => result.current.setVolume(-0.5))
    expect(result.current.volume).toBe(0)
  })

  it('clearTracks resets all state', async () => {
    const { result } = renderHook(() => useAudioPlayer())
    await act(async () => {
      result.current.loadTracks([
        { path: '/music/a.mp3', name: 'a.mp3', url: 'local-file:///music/a.mp3' },
      ])
    })
    await act(async () => result.current.clearTracks())
    expect(result.current.tracks).toHaveLength(0)
    expect(result.current.currentTrack).toBeNull()
    expect(result.current.isPlaying).toBe(false)
  })

  it('selectTrack changes the current track', async () => {
    const { result } = renderHook(() => useAudioPlayer())
    await act(async () => {
      result.current.loadTracks([
        { path: '/music/a.mp3', name: 'a.mp3', url: 'local-file:///music/a.mp3' },
        { path: '/music/b.mp3', name: 'b.mp3', url: 'local-file:///music/b.mp3' },
      ])
    })
    await act(async () => result.current.selectTrack(1))
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.currentTrack?.name).toBe('b.mp3')
  })
})
