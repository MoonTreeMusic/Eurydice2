import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrackTable } from './TrackTable'

const TRACKS = [
  { id: 1, title: 'One', artist: 'A', album: 'X', trackNumber: 1, duration: 100 },
  { id: 2, title: 'Two', artist: 'A', album: 'X', trackNumber: 2, duration: 120 },
]

function rightClick(title) {
  fireEvent.contextMenu(screen.getByText(title))
}

describe('TrackTable', () => {
  it('plays a track on row click', () => {
    const onPlay = vi.fn()
    render(<TrackTable tracks={TRACKS} currentTrack={null} onPlay={onPlay} />)
    fireEvent.click(screen.getByText('One'))
    expect(onPlay).toHaveBeenCalledWith(TRACKS[0])
  })

  it('highlights the current track', () => {
    render(<TrackTable tracks={TRACKS} currentTrack={{ id: 2 }} onPlay={vi.fn()} />)
    const activeRow = screen.getByText('Two').closest('tr')
    expect(activeRow.className).toContain('active')
  })

  it('offers "Add to <playlist>" and calls onAddToPlaylist', () => {
    const onAddToPlaylist = vi.fn()
    render(
      <TrackTable
        tracks={TRACKS}
        currentTrack={null}
        onPlay={vi.fn()}
        playlists={[{ id: 9, name: 'Chill' }]}
        onAddToPlaylist={onAddToPlaylist}
      />
    )
    rightClick('One')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add to "Chill"' }))
    expect(onAddToPlaylist).toHaveBeenCalledWith(TRACKS[0], 9)
  })

  it('offers "Remove from library" and calls onRemoveFromLibrary', () => {
    const onRemoveFromLibrary = vi.fn()
    render(
      <TrackTable
        tracks={TRACKS}
        currentTrack={null}
        onPlay={vi.fn()}
        onRemoveFromLibrary={onRemoveFromLibrary}
      />
    )
    rightClick('Two')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from library' }))
    expect(onRemoveFromLibrary).toHaveBeenCalledWith(TRACKS[1])
  })

  it('shows reorder items when reorder is provided, with edge items disabled', () => {
    const onMove = vi.fn()
    render(
      <TrackTable
        tracks={TRACKS}
        currentTrack={null}
        onPlay={vi.fn()}
        reorder={{ onMove }}
      />
    )
    rightClick('One')
    expect(screen.getByRole('menuitem', { name: 'Move Up' }).disabled).toBe(true)
    const down = screen.getByRole('menuitem', { name: 'Move Down' })
    expect(down.disabled).toBe(false)
    fireEvent.click(down)
    expect(onMove).toHaveBeenCalledWith(TRACKS[0], 1)
  })

  it('shows no menu when no actions are configured', () => {
    render(<TrackTable tracks={TRACKS} currentTrack={null} onPlay={vi.fn()} />)
    rightClick('One')
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
