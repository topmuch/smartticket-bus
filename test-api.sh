#!/bin/bash
BASE="http://localhost:3000"
PASS=0
FAIL=0
TOTAL=0

check() {
  local name="$1"
  local resp="$2"
  local expected="$3"
  TOTAL=$((TOTAL+1))
  if echo "$resp" | grep -q "$expected"; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name"
    echo "     Expected substring: $expected"
    echo "     Got: $(echo "$resp" | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

echo "========================================="
echo "  SmartTicket Bus - API Self-Audit v2"
echo "========================================="
echo ""

# Check server alive
if ! curl -s --max-time 5 "$BASE/" > /dev/null 2>&1; then
  echo "❌ Server not reachable at $BASE"
  exit 1
fi
echo "✅ Server reachable"

echo ""
echo "--- AUTH ---"

R=$(curl -s --max-time 20 -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@smartticket.bus","password":"Admin@123"}')
check "Login Admin" "$R" '"success":true'
echo "$R" > /tmp/admin_resp.json

R=$(curl -s --max-time 20 -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"guichet1@smartticket.bus","password":"Oper@123"}')
check "Login Operator" "$R" '"success":true'
echo "$R" > /tmp/op_resp.json

R=$(curl -s --max-time 20 -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"control1@smartticket.bus","password":"Control@123"}')
check "Login Controller" "$R" '"success":true'
echo "$R" > /tmp/ctrl_resp.json

R=$(curl -s --max-time 20 -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@smartticket.bus","password":"wrong"}')
check "Wrong Password Rejected" "$R" '"success":false'

R=$(curl -s --max-time 20 -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"nobody@test.com","password":"test"}')
check "Nonexistent User Rejected" "$R" '"success":false'

# Get tokens
AT=$(node -e "try{const j=require('/tmp/admin_resp.json');console.log(j.data?.accessToken||'')}catch{console.log('')}" 2>/dev/null)
OT=$(node -e "try{const j=require('/tmp/op_resp.json');console.log(j.data?.accessToken||'')}catch{console.log('')}" 2>/dev/null)
CT=$(node -e "try{const j=require('/tmp/ctrl_resp.json');console.log(j.data?.accessToken||'')}catch{console.log('')}" 2>/dev/null)

echo ""
echo "--- /me ---"
R=$(curl -s --max-time 20 "$BASE/api/auth/me" -H "Authorization: Bearer $AT")
check "GET /me (Admin)" "$R" '"SUPERADMIN"'

R=$(curl -s --max-time 20 "$BASE/api/auth/me")
check "GET /me (No Token → 401)" "$R" '"success":false'

echo ""
echo "--- ZONES ---"
R=$(curl -s --max-time 20 "$BASE/api/zones" -H "Authorization: Bearer $AT")
check "GET Zones" "$R" '"success":true'
echo "$R" > /tmp/zones_resp.json
ZONE_ID=$(node -e "try{const j=require('/tmp/zones_resp.json');const z=j.data||[];console.log(z[0]?.id||'')}catch{console.log('')}" 2>/dev/null)

R=$(curl -s --max-time 20 "$BASE/api/zones")
check "GET Zones (Public - no auth)" "$R" '"success":true'

if [ -n "$ZONE_ID" ]; then
  R=$(curl -s --max-time 20 "$BASE/api/zones/$ZONE_ID" -H "Authorization: Bearer $AT")
  check "GET Zone by ID" "$R" '"success":true'
  
  R=$(curl -s --max-time 20 -X POST "$BASE/api/zones" -H "Content-Type: application/json" -H "Authorization: Bearer $AT" -d '{"code":"T99","name":"Zone Test","description":"Audit test"}')
  check "POST Create Zone" "$R" '"success":true'
  echo "$R" > /tmp/newzone_resp.json
  NZ_ID=$(node -e "try{const j=require('/tmp/newzone_resp.json');console.log(j.data?.id||'')}catch{console.log('')}" 2>/dev/null)
  
  if [ -n "$NZ_ID" ]; then
    R=$(curl -s --max-time 20 -X PUT "$BASE/api/zones/$NZ_ID" -H "Content-Type: application/json" -H "Authorization: Bearer $AT" -d '{"name":"Zone Test Updated"}')
    check "PUT Update Zone" "$R" '"success":true'
    
    R=$(curl -s --max-time 20 -X DELETE "$BASE/api/zones/$NZ_ID" -H "Authorization: Bearer $AT")
    check "DELETE Zone" "$R" '"success":true'
  fi
fi

echo ""
echo "--- FARES ---"
R=$(curl -s --max-time 20 "$BASE/api/fares" -H "Authorization: Bearer $AT")
check "GET Fares" "$R" '"success":true'
echo "$R" > /tmp/fares_resp.json

R=$(curl -s --max-time 20 -X POST "$BASE/api/pricing/calculate" -H "Content-Type: application/json" -H "Authorization: Bearer $AT" -d "{\"fromZoneId\":\"$ZONE_ID\",\"toZoneId\":\"$ZONE_ID\"}")
check "POST Calculate Pricing" "$R" '"success":true'

echo ""
echo "--- LINES ---"
R=$(curl -s --max-time 20 "$BASE/api/lines" -H "Authorization: Bearer $AT")
check "GET Lines" "$R" '"success":true'
echo "$R" > /tmp/lines_resp.json
LINE_ID=$(node -e "try{const j=require('/tmp/lines_resp.json');const l=j.data||[];console.log(l[0]?.id||'')}catch{console.log('')}" 2>/dev/null)

R=$(curl -s --max-time 20 "$BASE/api/lines")
check "GET Lines (Public)" "$R" '"success":true'

if [ -n "$LINE_ID" ]; then
  R=$(curl -s --max-time 20 "$BASE/api/lines/$LINE_ID" -H "Authorization: Bearer $AT")
  check "GET Line by ID" "$R" '"success":true'
fi

echo ""
echo "--- STOPS ---"
R=$(curl -s --max-time 20 "$BASE/api/stops" -H "Authorization: Bearer $AT")
check "GET Stops" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/stops")
check "GET Stops (Public)" "$R" '"success":true'

echo ""
echo "--- SCHEDULES ---"
R=$(curl -s --max-time 20 "$BASE/api/schedules" -H "Authorization: Bearer $AT")
check "GET Schedules" "$R" '"success":true'

echo ""
echo "--- USERS (RBAC) ---"
R=$(curl -s --max-time 20 "$BASE/api/users" -H "Authorization: Bearer $AT")
check "GET Users (Admin → OK)" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/users" -H "Authorization: Bearer $OT")
check "GET Users (Operator → 403)" "$R" '"success":false'

R=$(curl -s --max-time 20 "$BASE/api/users" -H "Authorization: Bearer $CT")
check "GET Users (Controller → 403)" "$R" '"success":false'

echo ""
echo "--- TICKETS ---"
R=$(curl -s --max-time 20 "$BASE/api/tickets" -H "Authorization: Bearer $AT")
check "GET Tickets (Admin)" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/tickets" -H "Authorization: Bearer $OT")
check "GET Tickets (Operator)" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/tickets" -H "Authorization: Bearer $CT")
check "GET Tickets (Controller → 403)" "$R" '"success":false'

echo ""
echo "--- CONTROLS ---"
R=$(curl -s --max-time 20 "$BASE/api/controls" -H "Authorization: Bearer $AT")
check "GET Controls (Admin)" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/controls" -H "Authorization: Bearer $CT")
check "GET Controls (Controller)" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/controls/stats" -H "Authorization: Bearer $AT")
check "GET Controls Stats" "$R" '"success":true'

echo ""
echo "--- REPORTS ---"
R=$(curl -s --max-time 20 "$BASE/api/reports/dashboard" -H "Authorization: Bearer $AT")
check "GET Dashboard" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/reports/revenue" -H "Authorization: Bearer $AT")
check "GET Revenue" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/reports/controls" -H "Authorization: Bearer $AT")
check "GET Controls Report" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/reports/export" -H "Authorization: Bearer $AT")
check "GET Export CSV" "$R" "Date de vente"

echo ""
echo "--- CASH SESSIONS ---"
R=$(curl -s --max-time 20 "$BASE/api/cash-sessions" -H "Authorization: Bearer $AT")
check "GET Cash Sessions" "$R" '"success":true'

echo ""
echo "--- SUBSCRIPTIONS ---"
R=$(curl -s --max-time 20 "$BASE/api/subscriptions" -H "Authorization: Bearer $AT")
check "GET Subscriptions" "$R" '"success":true'

echo ""
echo "--- AUDIT LOGS ---"
R=$(curl -s --max-time 20 "$BASE/api/audit-logs" -H "Authorization: Bearer $AT")
check "GET Audit Logs" "$R" '"success":true'

echo ""
echo "--- PUBLIC PORTAL ---"
R=$(curl -s --max-time 20 "$BASE/api/public/info")
check "GET Public Info" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/public/lines")
check "GET Public Lines" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/public/stops")
check "GET Public Stops" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/public/schedules")
check "GET Public Schedules" "$R" '"success":true'

R=$(curl -s --max-time 20 "$BASE/api/public/search?q=Place")
check "GET Public Search" "$R" '"success":true'

echo ""
echo "--- TICKET SALE FLOW ---"

# Get existing open cash session first
R=$(curl -s --max-time 20 "$BASE/api/cash-sessions?status=OPEN" -H "Authorization: Bearer $OT")
echo "$R" > /tmp/sessions_resp.json
SESSION_ID=$(node -e "try{const j=require('/tmp/sessions_resp.json');const s=j.data||[];console.log(s[0]?.id||'')}catch{console.log('')}" 2>/dev/null)

if [ -z "$SESSION_ID" ]; then
  # Open cash session
  R=$(curl -s --max-time 20 -X POST "$BASE/api/cash-sessions" -H "Content-Type: application/json" -H "Authorization: Bearer $OT" -d '{"openingBalance":50000}')
  check "POST Open Cash Session" "$R" '"success":true'
  echo "$R" > /tmp/session_resp.json
  SESSION_ID=$(node -e "try{const j=require('/tmp/session_resp.json');console.log(j.data?.id||'')}catch{console.log('')}" 2>/dev/null)
else
  echo "  ⏭️ Using existing open cash session: $SESSION_ID"
fi

# Get fare info
FROM_ZONE=$(node -e "try{const j=require('/tmp/fares_resp.json');const f=j.data||[];console.log(f[0]?.fromZoneId||'')}catch{console.log('')}" 2>/dev/null)
TO_ZONE=$(node -e "try{const j=require('/tmp/fares_resp.json');const f=j.data||[];console.log(f[0]?.toZoneId||'')}catch{console.log('')}" 2>/dev/null)
FARE_PRICE=$(node -e "try{const j=require('/tmp/fares_resp.json');const f=j.data||[];console.log(f[0]?.price||250)}catch{console.log('250')}" 2>/dev/null)

if [ -n "$SESSION_ID" ] && [ -n "$FROM_ZONE" ]; then
  # Sell ticket
  R=$(curl -s --max-time 20 -X POST "$BASE/api/tickets" -H "Content-Type: application/json" -H "Authorization: Bearer $OT" -d "{\"type\":\"UNIT\",\"fromZoneId\":\"$FROM_ZONE\",\"toZoneId\":\"$TO_ZONE\",\"price\":$FARE_PRICE,\"amountPaid\":500,\"paymentMethod\":\"cash\",\"cashSessionId\":\"$SESSION_ID\"}")
  check "POST Sell Ticket (UNIT)" "$R" '"success":true'
  echo "$R" > /tmp/ticket_resp.json
  
  QR_STRING=$(node -e "try{const j=require('/tmp/ticket_resp.json');console.log(j.data?.qrString||'')}catch{console.log('')}" 2>/dev/null)
  TICKET_NUM=$(node -e "try{const j=require('/tmp/ticket_resp.json');console.log(j.data?.ticketNumber||'')}catch{console.log('')}" 2>/dev/null)
  
  if [ -n "$QR_STRING" ]; then
    echo "     Ticket: $TICKET_NUM"
    
    # Validate ticket
    R=$(curl -s --max-time 20 -X POST "$BASE/api/tickets/validate" -H "Content-Type: application/json" -H "Authorization: Bearer $CT" -d "{\"qrString\":\"$QR_STRING\"}")
    check "POST Validate QR (VALID)" "$R" '"result":"VALID"'
    
    # Re-validate (should be ALREADY_USED)
    R=$(curl -s --max-time 20 -X POST "$BASE/api/tickets/validate" -H "Content-Type: application/json" -H "Authorization: Bearer $CT" -d "{\"qrString\":\"$QR_STRING\"}")
    check "POST Re-validate (ALREADY_USED)" "$R" '"ALREADY_USED"'
    
    # Fake QR
    R=$(curl -s --max-time 20 -X POST "$BASE/api/tickets/validate" -H "Content-Type: application/json" -H "Authorization: Bearer $CT" -d '{"qrString":"fake.invalid.token"}')
    check "POST Fake QR (FALSIFIED)" "$R" '"FALSIFIED"'
  fi
else
  echo "  ⏭️ Skipping ticket sale flow (missing session or zone data)"
fi

echo ""
echo "========================================="
echo "  RESULTS: ✅ $PASS/$TOTAL passed | ❌ $FAIL/$TOTAL failed"
if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED!"
else
  echo "  ⚠️  $FAIL test(s) need attention"
fi
echo "========================================="
