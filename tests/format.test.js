import { formatDuration } from '../src/shared/format'

describe('formatDuration', () => {
  it('formats seconds into mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05')
  })

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('handles whole minutes', () => {
    expect(formatDuration(120)).toBe('2:00')
  })

  it('pads single-digit seconds', () => {
    expect(formatDuration(9)).toBe('0:09')
  })

  it('handles NaN gracefully', () => {
    expect(formatDuration(NaN)).toBe('0:00')
  })

  it('handles negative values gracefully', () => {
    expect(formatDuration(-1)).toBe('0:00')
  })

  it('handles large values', () => {
    expect(formatDuration(3661)).toBe('61:01')
  })
})
