# Task ID: 4 - PWA Offline Controller Support

## Agent: full-stack-developer

## Files Created
1. `src/lib/offline-store.ts` — IndexedDB wrapper (blacklist, whitelist, pending-controls)
2. `src/lib/offline-qr-verify.ts` — Client-side QR verification (base64url decode, no deps)
3. `src/hooks/use-offline-sync.ts` — React hook for online/offline status + sync
4. `src/app/api/offline/data/route.ts` — GET endpoint for blacklist/whitelist download

## Files Modified
1. `src/components/smartticket/views/qr-scanner.tsx` — Added offline mode support

## Key Decisions
- QR format: supports both custom (token.signature) and JWT (header.payload.signature) formats
- Offline verification cannot verify HMAC signature (no secret client-side) — relies on blacklist/whitelist/expiry checks
- Pending controls stored in IndexedDB with auto-increment ID for easy deletion after sync
- Last sync timestamp stored in localStorage for display purposes
- No auto-sync on reconnect — user manually triggers via "Synchroniser" button

## Lint Status
- ESLint: 0 errors (fixed 2 set-state-in-effect issues)

## Testing
- Dev server running on port 3000, HTTP 200 on /
- GET /api/offline/data requires CONTROLLER or SUPERADMIN auth
