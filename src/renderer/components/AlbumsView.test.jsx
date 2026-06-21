import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlbumsView } from './AlbumsView'

const TRACKS = [
  { id: 1, title: 'A1', artist: 'Artist1', album: 'Alpha', trackNumber: 1, duration: 100 },
  { id: 2, title: 'A2', artist: 'Artist1', album: 'Alpha', trackNumber: 2, duration: 100 },
  { id: 3, title: 'B1', artist: 'Artist2', album: 'Beta', trackNumber: 1, duration: 100 },
]

const shared = { currentTrack: null, onPlayTrack: vi.fn(), menuProps: {} }

describe('AlbumsView', () => {
  it('groups tracks into albums', () => {
    render(<AlbumsView tracks={TRACKS} query="" {...shared} />)
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Beta')).toBeTruthy()
    expect(screen.getByText('A1')).toBeTruthy()
  })

  it('filters by query (matches album name)', () => {
    render(<AlbumsView tracks={TRACKS} query="beta" {...shared} />)
    expect(screen.queryByText('Alpha')).toBeNull()
    expect(screen.getByText('Beta')).toBeTruthy()
  })

  it('plays the album the clicked track belongs to', () => {
    const onPlayTrack = vi.fn()
    render(<AlbumsView tracks={TRACKS} query="" currentTrack={null} onPlayTrack={onPlayTrack} menuProps={{}} />)
    fireEvent.click(screen.getByText('A2'))
    const [track, queue] = onPlayTrack.mock.calls[0]
    expect(track.title).toBe('A2')
    expect(queue.map((t) => t.title)).toEqual(['A1', 'A2']) // only the Alpha album
  })

  it('shows an empty message when nothing matches', () => {
    render(<AlbumsView tracks={TRACKS} query="zzzz" {...shared} />)
    expect(screen.getByText(/No albums match/)).toBeTruthy()
  })
})
