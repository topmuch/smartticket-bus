# Task 8: Controls, Reports, Analytics & Public Portal API Routes

## Summary
Created 12 API route files covering controls management, reports/analytics, and public portal endpoints.

## Files Created

### Controls (Auth required: SUPERADMIN, CONTROLLER)
1. **`src/app/api/controls/route.ts`** - GET (list with filters/pagination) + POST (submit scan)
2. **`src/app/api/controls/sync/route.ts`** - POST (batch offline sync, up to 500 controls in transaction)
3. **`src/app/api/controls/stats/route.ts`** - GET (stats: total, valid, invalid, breakdown, daily counts)

### Reports (Auth required: SUPERADMIN only)
4. **`src/app/api/reports/dashboard/route.ts`** - GET (dashboard: revenue, tickets, controls, top lines/zones, subscriptions, cash sessions)
5. **`src/app/api/reports/revenue/route.ts`** - GET (revenue grouped by day/week/month with filters)
6. **`src/app/api/reports/controls/route.ts`** - GET (controls report: fraud rate, by controller, by line)
7. **`src/app/api/reports/export/route.ts`** - GET (CSV export for revenue/controls/tickets with BOM for Excel)

### Public Portal (NO AUTH required)
8. **`src/app/api/public/info/route.ts`** - GET (system info: company name, zone/line counts)
9. **`src/app/api/public/lines/route.ts`** - GET (all active lines or specific line with ordered stops/schedules)
10. **`src/app/api/public/schedules/route.ts`** - GET (schedules with next passage generation based on frequency)
11. **`src/app/api/public/stops/route.ts`** - GET (stops with zone info, filterable by zone/search/line)
12. **`src/app/api/public/search/route.ts`** - GET (search lines by name/number, stops by name/code)

## Key Design Decisions
- CONTROLLER role scoped to own data only; SUPERADMIN has full access
- QR parsing tries qrToken → ticketNumber → id for maximum compatibility
- Batch sync pre-fetches ticket mappings for performance (single query instead of N queries)
- CSV export uses UTF-8 BOM for proper Excel display
- Schedule next passage generation uses current time to show upcoming departures only
- All responses follow `{ success, data?, error? }` format

## Lint
0 errors across all 12 files.
