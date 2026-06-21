import { useRef, useState, useEffect, useCallback } from 'react'

function fisherYates(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildShuffleQueue(length, currentIdx) {
  const others = Array.from({ length }, (_, i) => i).filter((i) => i !== currentIdx)
  const shuffled = fisherYates(others)
  return currentIdx !== null && currentIdx !== undefined
    ? [currentIdx, ...shuffled]
    : shuffled
}

export function useAudioPlayer() {
  const audioRef = useRef(new Audio())
  const tracksRef = useRef([])
  const currentIndexRef = useRef(null)
  const shuffleRef = useRef(false)
  const repeatRef = useRef('off')
  const shuffleQueueRef = useRef([])
  const shufflePosRef = useRef(0)

  const [tracks, setTracks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [error, setError] = useState(null)
  const [shuffle, setShuffleState] = useState(false)
  const [repeat, setRepeatState] = useState('off') // 'off' | 'one' | 'all'

  const audio = audioRef.current

  // Keep ref in sync with state for use in callbacks
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  // `wrap` is set by the manual next/prev buttons so they loop around the ends
  // regardless of repeat mode (auto-advance on song-end leaves it unset).
  function getNextIndex(current, wrap = false) {
    const len = tracksRef.current.length
    if (len === 0) return null
    const rep = repeatRef.current
    if (rep === 'one' && !wrap) return current
    if (shuffleRef.current) {
      const pos = shufflePosRef.current
      const q = shuffleQueueRef.current
      const nextPos = pos + 1
      if (nextPos >= q.length) {
        if (rep === 'all' || wrap) {
          // rebuild and start over
          const newQ = buildShuffleQueue(len, null)
          shuffleQueueRef.current = newQ
          shufflePosRef.current = 0
          return newQ[0] ?? null
        }
        return null
      }
      shufflePosRef.current = nextPos
      return q[nextPos]
    }
    const next = (current ?? -1) + 1
    if (next >= len) return rep === 'all' || wrap ? 0 : null
    return next
  }

  function getPrevIndex(current, wrap = false) {
    const len = tracksRef.current.length
    if (len === 0) return null
    if (shuffleRef.current) {
      const pos = shufflePosRef.current
      const q = shuffleQueueRef.current
      const prevPos = pos - 1
      if (prevPos < 0) {
        if (wrap && q.length > 0) {
          shufflePosRef.current = q.length - 1
          return q[q.length - 1]
        }
        return q[0] ?? 0
      }
      shufflePosRef.current = prevPos
      return q[prevPos]
    }
    const prev = (current ?? 0) - 1
    if (prev < 0) return wrap ? len - 1 : 0
    return prev
  }

  function computeNextTrack() {
    const ci = currentIndexRef.current
    if (ci === null) return null
    const len = tracksRef.current.length
    if (len === 0) return null
    const rep = repeatRef.current
    if (rep === 'one') return tracksRef.current[ci] ?? null
    if (shuffleRef.current) {
      const pos = shufflePosRef.current
      const q = shuffleQueueRef.current
      const nextIdx = q[pos + 1]
      return nextIdx !== undefined ? (tracksRef.current[nextIdx] ?? null) : null
    }
    const nextIdx = ci + 1
    if (nextIdx >= len) return rep === 'all' ? (tracksRef.current[0] ?? null) : null
    return tracksRef.current[nextIdx] ?? null
  }

  // Derive nextTrack from current state for display
  const nextTrack = computeNextTrack()

  useEffect(() => {
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      // Repeat-one: replay the same track. Re-setting the same index won't
      // re-run the load effect, so restart the element directly.
      if (repeatRef.current === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      setIsPlaying(false)
      setCurrentIndex((i) => {
        if (i === null) return null
        const next = getNextIndex(i)
        return next
      })
    }
    const onError = () => {
      setError(`Failed to load track: ${audio.error?.message ?? 'unknown error'}`)
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [audio])

  // Load and play whenever currentIndex changes
  useEffect(() => {
    if (currentIndex === null) return
    if (currentIndex >= tracksRef.current.length) {
      setCurrentIndex(null)
      audio.src = ''
      setCurrentTime(0)
      setDuration(0)
      return
    }
    const track = tracksRef.current[currentIndex]
    setError(null)
    setCurrentTime(0)
    setDuration(0)
    audio.src = track.url
    audio.load()
    audio.play().catch(() => {})
  }, [currentIndex, audio])

  const loadTracks = useCallback((newTracks) => {
    const wasEmpty = tracksRef.current.length === 0
    tracksRef.current = [...tracksRef.current, ...newTracks]
    setTracks(tracksRef.current)
    if (wasEmpty && newTracks.length > 0) {
      setCurrentIndex(0)
    }
    setError(null)
  }, [])

  const play = useCallback(() => {
    if (currentIndexRef.current === null && tracksRef.current.length > 0) {
      setCurrentIndex(0)
      return
    }
    audio.play().catch(() => {})
  }, [audio])

  const pause = useCallback(() => {
    audio.pause()
  }, [audio])

  const togglePlay = useCallback(() => {
    if (audio.paused) play()
    else pause()
  }, [audio, play, pause])

  const seek = useCallback(
    (time) => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.max(0, Math.min(time, audio.duration))
      }
    },
    [audio]
  )

  const setVolume = useCallback(
    (v) => {
      const clamped = Math.max(0, Math.min(1, v))
      audio.volume = clamped
      setVolumeState(clamped)
    },
    [audio]
  )

  const selectTrack = useCallback(
    (index) => {
      if (index === currentIndexRef.current) {
        togglePlay()
      } else {
        if (shuffleRef.current) {
          // place selected track at current shuffle position
          const q = shuffleQueueRef.current
          const existingPos = q.indexOf(index)
          if (existingPos >= 0) {
            shufflePosRef.current = existingPos
          } else {
            shuffleQueueRef.current = [index, ...q.filter((i) => i !== index)]
            shufflePosRef.current = 0
          }
        }
        setCurrentIndex(index)
      }
    },
    [togglePlay]
  )

  const skipNext = useCallback(() => {
    const ci = currentIndexRef.current
    if (ci === null) return
    const next = getNextIndex(ci, true)
    if (next !== null) setCurrentIndex(next)
  }, [])

  const skipPrev = useCallback(() => {
    const ci = currentIndexRef.current
    if (ci === null) return
    // If more than 3s in, restart track
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const prev = getPrevIndex(ci, true)
    if (prev !== null) setCurrentIndex(prev)
  }, [audio])

  // Unconditionally move to the previous track (no restart heuristic).
  const prevTrack = useCallback(() => {
    const ci = currentIndexRef.current
    if (ci === null) return
    const prev = getPrevIndex(ci, true)
    if (prev !== null) setCurrentIndex(prev)
  }, [])

  const clearTracks = useCallback(() => {
    audio.pause()
    audio.src = ''
    tracksRef.current = []
    setTracks([])
    setCurrentIndex(null)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setError(null)
    shuffleQueueRef.current = []
    shufflePosRef.current = 0
  }, [audio])

  const loadAndPlayAt = useCallback(
    (newTracks, startIndex = 0) => {
      audio.pause()
      audio.src = ''
      tracksRef.current = newTracks
      setTracks(newTracks)
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      setError(null)
      if (shuffleRef.current) {
        const q = buildShuffleQueue(newTracks.length, startIndex)
        shuffleQueueRef.current = q
        shufflePosRef.current = 0
      }
      setCurrentIndex(startIndex)
    },
    [audio]
  )

  const toggleShuffle = useCallback(() => {
    const next = !shuffleRef.current
    shuffleRef.current = next
    setShuffleState(next)
    if (next && tracksRef.current.length > 0) {
      const q = buildShuffleQueue(tracksRef.current.length, currentIndexRef.current)
      shuffleQueueRef.current = q
      shufflePosRef.current = 0
    }
  }, [])

  const toggleRepeat = useCallback(() => {
    const next = repeatRef.current === 'off' ? 'all' : repeatRef.current === 'all' ? 'one' : 'off'
    repeatRef.current = next
    setRepeatState(next)
  }, [])

  const currentTrack = currentIndex !== null ? (tracksRef.current[currentIndex] ?? null) : null

  return {
    tracks,
    currentTrack,
    nextTrack,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    error,
    shuffle,
    repeat,
    loadTracks,
    loadAndPlayAt,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    selectTrack,
    skipNext,
    skipPrev,
    prevTrack,
    clearTracks,
    toggleShuffle,
    toggleRepeat,
  }
}
