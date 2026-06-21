import { describe, it, expect } from 'vitest'
import { trackMatchesQuery } from './search'

const track = { title: 'Blue in Green', artist: 'Miles Davis', album: 'Kind of Blue' }

describe('trackMatchesQuery', () => {
  it('matches everything for an empty/blank query', () => {
    expect(trackMatchesQuery(track, '')).toBe(true)
    expect(trackMatchesQuery(track, '   ')).toBe(true)
    expect(trackMatchesQuery(track, undefined)).toBe(true)
  })

  it('matches on title, artist, or album, case-insensitively', () => {
    expect(trackMatchesQuery(track, 'green')).toBe(true)
    expect(trackMatchesQuery(track, 'MILES')).toBe(true)
    expect(trackMatchesQuery(track, 'kind of')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(trackMatchesQuery(track, 'coltrane')).toBe(false)
  })

  it('tolerates missing fields', () => {
    expect(trackMatchesQuery({ title: 'x' }, 'x')).toBe(true)
    expect(trackMatchesQuery({}, 'x')).toBe(false)
  })
})
