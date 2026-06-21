import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Library } from './Library'

const TRACKS = [
  { id: 1, artist: 'Artist', album: 'Album', title: 'One', trackNumber: 1, duration: 100, path: '/a/1.mp3' },
  { id: 2, artist: 'Artist', album: 'Album', title: 'Two', trackNumber: 2, duration: 100, path: '/a/2.mp3' },
  { id: 3, artist: 'Artist', album: 'Album', title: 'Three', trackNumber: 3, duration: 100, path: '/a/3.mp3' },
]

function renderedTitles() {
  return screen.getAllByRole('row').map((row) => within(row).getAllByRole('cell')[1].textContent)
}

function openMenuOn(title) {
  fireEvent.contextMenu(screen.getByText(title))
}

describe('Library reorder/remove context menu', () => {
  it('renders album tracks in track-number order by default', () => {
    render(<Library tracks={TRACKS} currentTrack={null} onPlayTrack={vi.fn()} />)
    expect(renderedTitles()).toEqual(['One', 'Two', 'Three'])
  })

  it('moves a track down via the context menu', () => {
    render(<Library tracks={TRACKS} currentTrack={null} onPlayTrack={vi.fn()} />)
    openMenuOn('One')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move Down' }))
    expect(renderedTitles()).toEqual(['Two', 'One', 'Three'])
  })

  it('moves a track up via the context menu', () => {
    render(<Library tracks={TRACKS} currentTrack={null} onPlayTrack={vi.fn()} />)
    openMenuOn('Three')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move Up' }))
    expect(renderedTitles()).toEqual(['One', 'Three', 'Two'])
  })

  it('disables Move Up on the first track and Move Down on the last', () => {
    render(<Library tracks={TRACKS} currentTrack={null} onPlayTrack={vi.fn()} />)
    openMenuOn('One')
    expect(screen.getByRole('menuitem', { name: 'Move Up' }).disabled).toBe(true)
    expect(screen.getByRole('menuitem', { name: 'Move Down' }).disabled).toBe(false)
    fireEvent.keyDown(document, { key: 'Escape' })
    openMenuOn('Three')
    expect(screen.getByRole('menuitem', { name: 'Move Down' }).disabled).toBe(true)
  })

  it('removes a track from the list', () => {
    render(<Library tracks={TRACKS} currentTrack={null} onPlayTrack={vi.fn()} />)
    openMenuOn('Two')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from list' }))
    expect(renderedTitles()).toEqual(['One', 'Three'])
  })

  it('invokes onRemoveFromLibrary with the track when "Remove from library" is clicked', () => {
    const onRemoveFromLibrary = vi.fn()
    render(
      <Library
        tracks={TRACKS}
        currentTrack={null}
        onPlayTrack={vi.fn()}
        onRemoveFromLibrary={onRemoveFromLibrary}
      />
    )
    openMenuOn('Two')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from library' }))
    expect(onRemoveFromLibrary).toHaveBeenCalledTimes(1)
    expect(onRemoveFromLibrary.mock.calls[0][0].title).toBe('Two')
  })

  it('does not trigger playback when opening the context menu', () => {
    const onPlay = vi.fn()
    render(<Library tracks={TRACKS} currentTrack={null} onPlayTrack={onPlay} />)
    openMenuOn('One')
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('plays the reordered list (custom order is passed to onPlayTrack)', () => {
    const onPlay = vi.fn()
    render(<Library tracks={TRACKS} currentTrack={null} onPlayTrack={onPlay} />)
    openMenuOn('One')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move Down' }))
    fireEvent.click(screen.getByText('One'))
    expect(onPlay).toHaveBeenCalledTimes(1)
    const [clickedTrack, queue] = onPlay.mock.calls[0]
    expect(clickedTrack.title).toBe('One')
    expect(queue.map((t) => t.title)).toEqual(['Two', 'One', 'Three'])
  })
})
