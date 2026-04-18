# Task: Integrate Next.js frontend with Express backend (mini-service)

## Worklog

### Step 1: Added Missing Endpoints to Express Backend

#### adminController.js — 14 new controller functions:
1. **updateTariff** — PUT handler, updates price and is_active on a tariff
2. **deleteTariff** — DELETE handler, soft-deletes tariff (sets is_active=0)
3. **createLine** — POST handler, creates a bus line with number, name, color, description
4. **updateLine** — PUT handler, updates line fields (name, number, color, is_active)
5. **deleteLine** — DELETE handler, soft-deletes a line
6. **createStop** — POST handler, creates a stop with zone_id, coordinates
7. **updateStop** — PUT handler, updates stop fields (name, code, zone_id, lat/lng)
8. **deleteStop** — DELETE handler, soft-deletes a stop
9. **createSchedule** — POST handler, creates a schedule with line_id, day_of_week, start/end time, frequency
10. **updateSchedule** — PUT handler, updates schedule fields
11. **getControlsStats** — GET handler, returns today's scan stats (total, valid, invalid) per controller
12. **getControlsReport** — GET handler, returns control report data grouped by date/controller
13. **exportCSV** — GET handler, exports controls or tickets as CSV
14. **deleteUser** — DELETE handler, soft-deletes a user (sets is_active=0)
15. **getLineById** — GET handler, returns line detail with lineStops and schedules (added for frontend line detail view)

#### routes/index.js — New routes added:
- `PUT /tariffs/:id` — update tariff
- `DELETE /tariffs/:id` — delete tariff
- `POST /lines` — create line
- `PUT /lines/:id` — update line
- `DELETE /lines/:id` — delete line
- `POST /stops` — create stop
- `PUT /stops/:id` — update stop
- `DELETE /stops/:id` — delete stop
- `POST /schedules` — create schedule
- `PUT /schedules/:id` — update schedule
- `GET /controls/stats` — control statistics
- `GET /reports/controls` — controls report
- `GET /reports/export` — CSV export
- `DELETE /users/:id` — soft delete user
- `GET /lines/:id` — line detail (public)

### Step 2: Updated Frontend API Layer

#### `/src/lib/api.ts` — Complete rewrite with:
1. **`toBackendUrl(path, options)`** — Maps frontend paths to Express backend URLs:
   - `/api/fares/*` → `/api/v1/tariffs/*`
   - `/api/tickets` POST → `/api/v1/sell`
   - `/api/tickets/validate` POST → `/api/v1/scan`
   - `/api/*` → `/api/v1/*` (generic mapping)
   - Appends `?XTransformPort=3001` to all URLs

2. **`transformRequestBody(path, body)`** — Converts camelCase to snake_case:
   - Pricing: `fromZoneId` → `from_zone_id`
   - Scan: `qrString` → `qr_string`
   - Sell: full camelCase → snake_case mapping for all fields
   - Controls sync: `qrString` → `qr_data`
   - Lines/Stops/Schedules: generic `normalizeRequestKeys()` recursive converter

3. **`transformResponse(path, data)`** — Normalizes Express responses for frontend:
   - **snakeToCamel / normalizeKeys** — general-purpose recursive key converter
   - **Tariffs** → maps `from_zone_id/to_zone_id` to nested `fromZone/toZone` objects with `isActive`
   - **Sell** → maps `ticket_id/ticket_number/qrcode/change` to `id/ticketNumber/qrCode/changeGiven`
   - **Scan** → maps Express response to frontend's `ValidationResult` interface
   - **Cash Sessions** → maps `opening_balance/operator_name/actual_cash` to `openingBalance/operator/closingBalance`
   - **Users** → generic snake_case normalization
   - **Zones** → snake_case + `isActive` boolean
   - **Stops** → snake_case + nested `zone` object + `lat/lng` from `latitude/longitude`
   - **Lines** → snake_case + `isActive` + `_count` with `lineStops/schedules`
   - **Line Detail** → includes mapped `lineStops` array with nested `stop` objects
   - **Schedules** → generic snake_case normalization
   - **Pricing** → maps `from_zone_name/to_zone_name` + adds `fareId`
   - **Offline Data** → maps `ticket_id/status` to `ticketId/reason`, `end_date` to `expiresAt`
   - **Controls Sync** → maps `synced` to `syncedCount`

4. **`apiFetch`** — Updated to use `toBackendUrl` for URL, `transformRequestBody` for body, `transformResponse` for response

### Step 3: Updated auth-store.ts

#### `/src/stores/auth-store.ts`:
- **Login**: Uses `toBackendUrl('/api/auth/login')` instead of direct fetch
- **Response handling**: Maps Express's nested `data.tokens.access_token/refresh_token` to flat `accessToken/refreshToken`
- **Refresh**: Uses `toBackendUrl('/api/auth/refresh')` instead of direct fetch
- **Body**: Sends `{ refresh_token }` (snake_case) instead of `{ refreshToken }` (camelCase)
- **Response**: Maps Express's `data.access_token` to `accessToken`

### Step 4: Updated View Components

#### `ticket-sales.tsx`:
- QR generation changed from `POST /api/tickets/generate-qr` to `GET /api/tickets/:id/qr`
- Success dialog now handles both `fromZone/toZone` (string) and `fromStop/toStop` (object) formats
- Type badge checks for both `'UNIT'` and `'single'`

#### `qr-scanner.tsx`:
- No changes needed — `apiFetch` handles path mapping (`/api/tickets/validate` → `/api/v1/scan`), body transformation (`qrString` → `qr_string`), and response normalization (Express scan result → frontend `ValidationResult`)

#### `cash-session.tsx`:
- Close session URL changed from `PUT /api/cash-sessions/:id` to `PUT /api/cash-sessions/:id/close`
- Request body changed from `{ closingBalance, notes }` to `{ actual_cash }`

#### `zones-fares.tsx`:
- No changes needed — `apiFetch` handles `/api/fares` → `/api/v1/tariffs` mapping and response normalization (snake_case → camelCase + nested `fromZone/toZone` objects)

### Step 5: Key Design Decisions

1. **Centralized mapping in `apiFetch`**: All URL routing, request body transformation, and response normalization is handled in the `apiFetch` wrapper, so most view components needed no changes.

2. **Generic `normalizeKeys`**: A recursive snake_case → camelCase converter handles most database fields automatically, with specific overrides for complex nested objects (e.g., tariffs with zone info, line details with stops).

3. **No `src/app/api/` modifications**: All Next.js API routes were left untouched as fallback.

4. **Auth compatibility**: The auth store handles the different response formats between Express (`data.tokens.access_token`) and frontend expectations (`data.accessToken`).

### Lint Results
- `bun run lint` passed with 0 errors.
