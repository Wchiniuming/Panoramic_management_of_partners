# TaskRegistration Page

**Overview**: Complex task management page with CRUD, filtering, assignment, progress tracking, delay workflow, and detail drawer.

## WHERE TO LOOK

`apps/web/src/pages/tasks/TaskRegistration.tsx` (650+ lines)

## CONVENTIONS

### filtersRef Pattern (CRITICAL)
```tsx
const [filters, setFilters] = useState({ name: '', status: '', priority: '', partner_id: undefined, dateRange: null })
const filtersRef = useRef(filters)
filtersRef.current = filters  // Update ref on every render

const fetchTasks = useCallback(async (filterOverride?: typeof filters) => {
  const f = filterOverride ?? filtersRef.current  // Prefer passed param, fallback to ref
  // ... build URL params from f
}, [])  // Empty deps - function is STABLE, never recreated
```

### nf Pattern for onChange Handlers
```tsx
// PASS new filter object explicitly:
onChange={(v) => { const nf = {...filters, status: v}; setFilters(nf); immediateSearch(nf); }}
```

### useDebounceSearch Pattern
```tsx
const { debouncedSearch, immediateSearch } = useDebounceSearch(fetchTasks, 300)
// Name input → debouncedSearch (300ms delay)
// Select filters → immediateSearch (no delay)
```

### API Response Transformation
- Backend returns camelCase: `status: 'IN_PROGRESS'`, `partner_name`
- Dates are ISO strings: `'2026-04-28T00:00:00'`
- Display format: `dayjs(date).format('YYYY-MM-DD')`

### State Structure
```tsx
tasks: Task[]           // Main list
selectedTask: Task | null
filters: FilterState    // { name, status, priority, partner_id, dateRange }
progressList: ProgressRecord[]
deliverables: Deliverable[]
assignments: Assignment[]
// 7 modalVisible booleans for create/edit/assign/delay/progress/deliverable/accept
```

### Interface Key Types
```tsx
Task: { id, name, description, type, priority, status, partner_id, partner_name, developer_id, developer_name, budget, start_date, end_date, delivery_standard, progress, created_at }
Assignment: { id, task_id, developer_id, developer_name, role, assigned_at, status }
ProgressRecord: { id, task_id, progress, content, created_at, creator_name }
Deliverable: { id, task_id, name, file_url, file_size, uploaded_at, uploaded_by }
```

### Fixed Bugs (Documented)
1. **Filter inversion bug**: Stale filters in onChange. Fixed by passing `nf` explicitly.
2. **fetchTasks recreation**: Filter in deps recreated function, abandoned pending timers. Fixed by removing deps, reading from ref.
3. **handleViewDetail**: Hardcoded `setAssignments([])`. Now fetches `GET /tasks/{id}/assignments`.
4. **handleAssignSubmit**: Only updated local state. Now calls `POST /tasks/{id}/assign-developer`.

## ANTI-PATTERNS

- DO NOT use `setFilters(prev => ({...prev, x: v})); debouncedSearchTasks(filters)` — filters is stale
- DO NOT use `useCallback(async () => {...}, [filters])` with object dep — new function every render
- DO NOT hardcode empty arrays for detail drawer data — always fetch from API
- DO NOT forget `filtersRef.current = filters` after state updates
