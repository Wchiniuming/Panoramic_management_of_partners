# useDebounceSearch

Debounced/immediate search with stable function references.

```typescript
export function useDebounceSearch<T>(
  searchFn: (params: T) => Promise<void>,
  debounceMs: number = 300
) {
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const searchFnRef = useRef(searchFn)
  searchFnRef.current = searchFn

  const debouncedSearch = useCallback((params: T) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try { await searchFnRef.current(params) }
      finally { setLoading(false) }
    }, debounceMs)
  }, [debounceMs])

  const immediateSearch = useCallback(async (params: T) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setLoading(true)
    try { await searchFnRef.current(params) }
    finally { setLoading(false) }
  }, [debounceMs])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return { debouncedSearch, immediateSearch, loading }
}
```

**Why searchFnRef:** `searchFnRef.current` always points to latest function. Abandoned timers use new version when deps change.

**Usage:**
```tsx
const fetchTasks = useCallback(async (f?: typeof filters) => {
  const filters = f ?? filtersRef.current
  const res = await api.getTasks(filters)
  setTasks(res.data)
}, [])  // EMPTY deps

const { debouncedSearch, immediateSearch } = useDebounceSearch(fetchTasks, 300)

// Debounced: onChange={e => { const nf={...filters,k:e.target.value}; debouncedSearch(nf); }}
// Immediate: onChange={v => { const nf={...filters,status:v}; immediateSearch(nf); }}
```