import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ArtistsView } from './ArtistsView'

const TRACKS = [
  { id: 1, artist: 'Artist', album: 'Album', title: 'One', trackNumber: 1, duration: 100, path: '/a/1.mp3' },
  { id: 2, artist: 'Artist', album: 'Album', title: 'Two', trackNumber: 2, duration: 100, path: '/a/2.mp3' },
  { id: 3, artist: 'Artist', album: 'Album', title: 'Three', trackNumber: 3, duration: 100, path: '/a/3.mp3' },
]

function renderArtists(props = {}) {
  return render(
    <ArtistsView
      tracks={TRACKS}
      query=""
      currentTrack={null}
      onPlayTrack={props.onPlayTrack || vi.fn()}
      menuProps={props.menuProps || {}}
    />
  )
}

function renderedTitles() {
  return screen.getAllByRole('row').map((row) => within(row).getAllByRole('cell')[1].textContent)
}

function openMenuOn(title) {
  fireEvent.contextMenu(screen.getByText(title))
}

describe('ArtistsView', () => {
  it('renders album tracks in track-number order by default', () => {
    renderArtists()
    expect(renderedTitles()).toEqual(['One', 'Two', 'Three'])
  })

  it('moves a track down and up via the context menu', () => {
    renderArtists()
    openMenuOn('One')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move Down' }))
    expect(renderedTitles()).toEqual(['Two', 'One', 'Three'])
    openMenuOn('One')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move Up' }))
    expect(renderedTitles()).toEqual(['One', 'Two', 'Three'])
  })

  it('removes a track from the list', () => {
    renderArtists()
    openMenuOn('Two')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from list' }))
    expect(renderedTitles()).toEqual(['One', 'Three'])
  })

  it('filters tracks by query', () => {
    render(
      <ArtistsView tracks={TRACKS} query="three" currentTrack={null} onPlayTrack={vi.fn()} menuProps={{}} />
    )
    expect(renderedTitles()).toEqual(['Three'])
  })

  it('exposes "Remove from library" when the callback is provided', () => {
    const onRemoveFromLibrary = vi.fn()
    renderArtists({ menuProps: { onRemoveFromLibrary } })
    openMenuOn('One')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove from library' }))
    expect(onRemoveFromLibrary.mock.calls[0][0].title).toBe('One')
  })

  it('plays the (reordered) album list', () => {
    const onPlayTrack = vi.fn()
    renderArtists({ onPlayTrack })
    fireEvent.click(screen.getByText('One'))
    const [track, queue] = onPlayTrack.mock.calls[0]
    expect(track.title).toBe('One')
    expect(queue.map((t) => t.title)).toEqual(['One', 'Two', 'Three'])
  })
})
