# AGENTS.md

## OVERVIEW

Monorepo: Turborepo + npm workspaces. FastAPI backend (PostgreSQL 16, Prisma, Pydantic, JWT) + React 18 frontend (TypeScript, Vite, Ant Design 5, Zustand, Chart.js). Implements a Partner Support Capability Panoramic Management Platform.

## STRUCTURE

```
./
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── src/
│   │   │   ├── main.py         # FastAPI entry
│   │   │   ├── database.py    # Prisma singleton instance
│   │   │   └── routers/       # 13 routers: auth, users, roles, developers,
│   │   │                      #   tasks, partners, assessment, improvement,
│   │   │                      #   risks, skills, dashboard, health
│   │   └── prisma/
│   │       └── schema.prisma   # DB schema (575 lines)
│   └── web/                    # React frontend
│       └── src/
│           ├── pages/          # 8 modules under pages/ (Login, Dashboard,
│           │                    #   users, developers, tasks, assessment,
│           │                    #   improvement, risks)
│           │   └── tasks/TaskRegistration.tsx  # 650+ lines, complex state
│           ├── components/Layout/  # MainLayout, Header, SideMenu
│           ├── stores/         # Zustand: authStore, skillStore
│           ├── hooks/          # useDebounceSearch (custom hook)
│           ├── api/axios.ts    # API client with 401 interceptor
│           └── routes.tsx      # React Router routes
├── diagrams/                   # HTML/Excalidraw architecture diagrams
├── scripts/setup.sh
├── docker-compose.yml
├── turbo.json
└── package.json               # Root monorepo config
```

## WHERE TO LOOK

- Backend entry: `apps/api/src/main.py`
- Frontend entry: `apps/web/src/routes.tsx`
- DB schema: `apps/api/prisma/schema.prisma`
- Largest file: `apps/web/src/pages/tasks/TaskRegistration.tsx` (650+ lines, multiple modals)
- Large routers: `tasks.py`, `developers.py`, `assessment.py` (backend)
- Large pages: `DeveloperManagement.tsx`, `VendorAssessment.tsx`, `PositiveImprovement.tsx`, `RiskLibrary.tsx`

## CODE MAP

### Frontend
- `api/axios.ts` — Axios instance with baseURL `/api`, 401 interceptor (only handles /auth redirect)
- `stores/authStore.ts` — Zustand store for auth state
- `stores/skillStore.ts` — Zustand store for skill data
- `hooks/useDebounceSearch.ts` — Debounce hook using `searchFnRef.current` pattern
- `routes.tsx` — React Router, wrap exports in `getRoutes()` to avoid Vite HMR error

### Backend
- `routers/*.py` — FastAPI APIRouter with `prefix="/api/..."`
- `_to_response(model)` — Transformer functions converting Prisma models to Pydantic schemas
- `asyncio.gather(*[...])` — Parallel DB response transformation in endpoints
- Prisma snake_case fields; API params snake_case; frontend camelCase

## CONVENTIONS

- Prisma enum fields: Prisma returns str or Enum object. **ALWAYS use safe extraction:**
  ```python
  x if isinstance(x, str) else getattr(x, 'value', str(x))
  ```
- Frontend state with closures: use `filtersRef = useRef(filters)` + `filtersRef.current = filters` then read `filtersRef.current` inside callbacks (avoids stale closures from object dep re-creation)
- Filter updates: `nf = {...filters, ...updates}; setFilters(nf); immediateSearchTasks(nf)` — pass new object to debounced search
- Prisma relations: `include={'partner': True}`
- `@` path alias configured in Vite/tsconfig for `src/` imports

## ANTI-PATTERNS

1. **Stale closure in useCallback with object deps** — `useCallback(fn, [filters])` creates new fn ref every render. FIX: use `filtersRef` pattern above.
2. **Prisma enum as string** — `t.status.value` crashes when Prisma returns str. FIX: safe extraction pattern in CONVENTIONS.
3. **Axios 401 interceptor** — only handles /auth endpoints for redirect; other 401s may silently fail.
4. **fetchTasks in useEffect with [fetchTasks] dep** — creates infinite loop. FIX: use `useCallback` for fetchTasks with proper ref pattern.

## COMMANDS

```bash
# Root (monorepo)
npm install && turbo run dev

# Backend
cd apps/api && pip install -r requirements.txt
PYTHONPATH=. python3 -m uvicorn apps.api.src.main:app --reload --port 8000

# Prisma
cd apps/api && python3 -m prisma generate && python3 -m prisma migrate dev --name init

# Frontend
cd apps/web && npm install && npm run dev

# Production build
npm run build
```

**Ports:** API on 8000, frontend on 3000, frontend proxies `/api` to 8000.

## NOTES

- Vite HMR: `routes.tsx` with only non-component exports causes HMR error — wrap in `getRoutes()` function.
- `DATABASE_URL` must be set for Prisma client.
- `.turbo/` cache committed — contains large binary files.
- TURBO_CACHE is tracked in git.
- Default admin: username `admin`, password `admin123`.