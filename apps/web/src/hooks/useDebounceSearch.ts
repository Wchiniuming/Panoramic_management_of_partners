import { useState, useCallback, useRef, useEffect } from 'react'

export function useDebounceSearch<T>(
  searchFn: (params: T) => Promise<void>,
  debounceMs: number = 300
) {
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const searchFnRef = useRef(searchFn)
  searchFnRef.current = searchFn

  const debouncedSearch = useCallback((params: T) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        await searchFnRef.current(params)
      } finally {
        setLoading(false)
      }
    }, debounceMs)
  }, [debounceMs])

  const immediateSearch = useCallback(async (params: T) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    setLoading(true)
    try {
      await searchFnRef.current(params)
    } finally {
      setLoading(false)
    }
  }, [debounceMs])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return { debouncedSearch, immediateSearch, loading }
}
