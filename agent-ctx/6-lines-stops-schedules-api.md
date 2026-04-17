# Task 6: Lines, Stops & Schedules API Routes

**Date**: 2025-01-01
**Agent**: Backend API Developer (Task 6)

### Files Created

| # | File | Methods | Description |
|---|------|---------|-------------|
| 1 | `src/app/api/lines/route.ts` | GET, POST | List all lines (with `?active=true`, stop/schedule counts) + Create line (SUPERADMIN) |
| 2 | `src/app/api/lines/[id]/route.ts` | GET, PUT, DELETE | Get line with stops/schedules + Update/Delete line (SUPERADMIN) |
| 3 | `src/app/api/stops/route.ts` | GET, POST | List all stops (with `?zoneId&active&search`, zone name included) + Create stop (SUPERADMIN) |
| 4 | `src/app/api/stops/[id]/route.ts` | GET, PUT, DELETE | Get stop with zone + lines passing through + Update/Delete stop (SUPERADMIN) |
| 5 | `src/app/api/schedules/route.ts` | GET, POST | List schedules (with `?lineId&dayOfWeek`, line info) + Create schedule (SUPERADMIN) |
| 6 | `src/app/api/schedules/[id]/route.ts` | GET, PUT, DELETE | Get schedule + Update/Delete schedule (SUPERADMIN) |
| 7 | `src/app/api/line-stops/route.ts` | GET, POST | List line stops (with `?lineId&direction`, fromStop/toStop details) + Add stop to line (SUPERADMIN) |
| 8 | `src/app/api/line-stops/[id]/route.ts` | PUT, DELETE | Update line stop + Remove line stop (SUPERADMIN) |

### Implementation Details

**Lines (`/api/lines`)**:
- GET: Returns all lines with `_count` for lineStops and schedules. Supports `?active=true` filter. Ordered by line number.
- POST: Creates line with validated unique number. Default color `#16a34a`. Audit log created.

**Lines by ID (`/api/lines/[id]`)**:
- GET: Returns line with ordered lineStops (direction → order) and schedules (day → startTime). Includes nested zone info on stops.
- PUT: Updates line fields. Validates number uniqueness. Audit log created.
- DELETE: Cascades delete lineStops and schedules. Blocks if tickets exist. Audit log created.

**Stops (`/api/stops`)**:
- GET: Returns all stops with zone name/code/color. Supports `?zoneId`, `?active=true`, `?search=xxx` (searches name and code).
- POST: Creates stop with validated unique code. Verifies zone exists. Parses lat/lng as floats. Audit log created.

**Stops by ID (`/api/stops/[id]`)**:
- GET: Returns stop with zone, lineStopsFrom (with line + toStop), lineStopsTo (with line + fromStop), and deduplicated lines array.
- PUT: Updates stop fields. Validates code uniqueness and zone existence. Audit log created.
- DELETE: Blocks if lineStops or tickets reference this stop. Audit log created.

**Schedules (`/api/schedules`)**:
- GET: Returns schedules with line info. Supports `?lineId` and `?dayOfWeek=1`. Ordered by line number → day → startTime.
- POST: Validates dayOfWeek (0-6), time format (HH:mm), startTime < endTime, frequency ≥ 1. Checks unique constraint. Audit log created.

**Schedules by ID (`/api/schedules/[id]`)**:
- GET: Returns schedule with line info.
- PUT: Validates all fields. Checks unique constraint when changing lineId/dayOfWeek/startTime. Audit log created.
- DELETE: Direct delete with audit log.

**Line Stops (`/api/line-stops`)**:
- GET: Returns line stops with line info, fromStop (with zone), toStop (with zone). Supports `?lineId` and `?direction`.
- POST: Validates direction (forward/backward). Verifies line and both stops exist. Checks unique constraint. Audit log created.

**Line Stops by ID (`/api/line-stops/[id]`)**:
- PUT: Validates direction, verifies stops exist, checks unique constraint. Supports setting duration to null. Audit log created.
- DELETE: Removes line stop with detailed audit log.

### Key Design Decisions
- **GET endpoints are public** (no auth required) to support the public portal
- **All mutations require SUPERADMIN** role via `withAuth(..., 'SUPERADMIN')`
- **Consistent response format**: `{ success: boolean, data?: any, error?: string }`
- **All mutations create audit logs** with entity, entityId, details, and IP
- **Referential integrity checks** before deletion (tickets, lineStops)
- **Uniqueness validation** before create/update (line number, stop code, schedule composite, lineStop composite)
- **LINT: 0 errors** — all files pass `bun run lint`
