#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

section "ROOMS"

# Setup: register & login to get token
TOKEN=$(register_and_get_token "room-test-$(date +%s)@example.com" "password123" "Room Tester")

# ── POST /api/v1/rooms ───────────────────────────────────────────
echo ""
echo "POST /api/v1/rooms"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Test Room 1","description":"A test room"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 201 "Create room"
assert_has_field "$body" ".data.id" "Room id returned"
assert_field "$body" ".data.name" "Test Room 1" "Name matches"
assert_field "$body" ".data.description" "A test room" "Description matches"
assert_field "$body" ".data.status" "active" "Default status is active"

ROOM_ID=$(echo "$body" | jq -r '.data.id')

# Create second room for listing tests
echo ""
echo "POST /api/v1/rooms (second room)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Test Room 2"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 201 "Create second room"
ROOM_ID_2=$(echo "$body" | jq -r '.data.id')

# Create without auth — expect 401
echo ""
echo "POST /api/v1/rooms (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms" \
  -H "Content-Type: application/json" \
  -d '{"name":"Should fail"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "No auth returns 401"

# ── GET /api/v1/rooms ────────────────────────────────────────────
echo ""
echo "GET /api/v1/rooms"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "List all rooms"
assert_has_field "$body" ".meta.total" "meta.total exists"
assert_has_field "$body" ".meta.page" "meta.page exists"
assert_has_field "$body" ".meta.limit" "meta.limit exists"
assert_field "$body" ".meta.page" "1" "Default page is 1"
assert_field "$body" ".meta.limit" "20" "Default limit is 20"

# ── GET /api/v1/rooms/:id ────────────────────────────────────────
echo ""
echo "GET /api/v1/rooms/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms/${ROOM_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Get room by id"
assert_field "$body" ".data.id" "$ROOM_ID" "Room id matches"
assert_field "$body" ".data.name" "Test Room 1" "Room name matches"

# Get non-existent room — expect 404
echo ""
echo "GET /api/v1/rooms/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms/99999" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Non-existent room returns 404"

# ── PUT /api/v1/rooms/:id ────────────────────────────────────────
echo ""
echo "PUT /api/v1/rooms/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/rooms/${ROOM_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Updated Room","status":"archived"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Update room"
assert_field "$body" ".data.name" "Updated Room" "Name updated"
assert_field "$body" ".data.status" "archived" "Status updated to archived"

# Update non-existent room — expect 404
echo ""
echo "PUT /api/v1/rooms/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/rooms/99999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Nope"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Update non-existent room returns 404"

# ── DELETE /api/v1/rooms/:id ─────────────────────────────────────
echo ""
echo "DELETE /api/v1/rooms/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/rooms/${ROOM_ID_2}" \
  -H "Authorization: Bearer ${TOKEN}")
status=$(echo "$response" | tail -n1)

assert_status "$status" 204 "Delete room"

# Delete non-existent room — expect 404
echo ""
echo "DELETE /api/v1/rooms/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/rooms/99999" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Delete non-existent room returns 404"

# Delete by non-owner (not admin) — expect 403
echo ""
echo "DELETE /api/v1/rooms/:id (not owner)"
OTHER_ROOM_TOKEN=$(register_and_get_token "other-room-$(date +%s)@example.com" "password123" "Other User")
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/rooms/${ROOM_ID}" \
  -H "Authorization: Bearer ${OTHER_ROOM_TOKEN}")
status=$(echo "$response" | tail -n1)
assert_status "$status" 403 "Non-owner cannot delete room"

# ── POST /api/v1/rooms/:id/join ──────────────────────────────────
echo ""
echo "POST /api/v1/rooms/:id/join (owner — already member)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/join" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Owner joins own room"
assert_field "$body" ".data.id" "$ROOM_ID" "Room id matches"

# Join non-existent room — expect 404
echo ""
echo "POST /api/v1/rooms/:id/join (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/99999/join" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Join non-existent room returns 404"

# Join without auth — expect 401
echo ""
echo "POST /api/v1/rooms/:id/join (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/join")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Join without auth returns 401"

# Second user joins the room
echo ""
echo "POST /api/v1/rooms/:id/join (second user)"
TOKEN2=$(register_and_get_token "join-test-$(date +%s)@example.com" "password123" "Join Tester")
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/join" \
  -H "Authorization: Bearer ${TOKEN2}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Second user joins room"
assert_field "$body" ".data.id" "$ROOM_ID" "Room id matches"

# Second user joins again — no-op
echo ""
echo "POST /api/v1/rooms/:id/join (second user, already joined)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/join" \
  -H "Authorization: Bearer ${TOKEN2}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Second user joins again (no-op)"
assert_field "$body" ".data.id" "$ROOM_ID" "Room id matches"

# ── POST /api/v1/rooms/:id/leave ─────────────────────────────────

# Owner cannot leave — expect 403
echo ""
echo "POST /api/v1/rooms/:id/leave (owner)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/leave" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 403 "Owner cannot leave room"

# Second user leaves the room
echo ""
echo "POST /api/v1/rooms/:id/leave (second user)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/leave" \
  -H "Authorization: Bearer ${TOKEN2}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Second user leaves room"
assert_field "$body" ".data.id" "$ROOM_ID" "Room id matches"

# Leave again — no-op (already not a member)
echo ""
echo "POST /api/v1/rooms/:id/leave (second user, already left)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/leave" \
  -H "Authorization: Bearer ${TOKEN2}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Second user leaves again (no-op)"
assert_field "$body" ".data.id" "$ROOM_ID" "Room id matches"

# Leave non-existent room — expect 404
echo ""
echo "POST /api/v1/rooms/:id/leave (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/99999/leave" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Leave non-existent room returns 404"

# Leave without auth — expect 401
echo ""
echo "POST /api/v1/rooms/:id/leave (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms/${ROOM_ID}/leave")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Leave without auth returns 401"

# ── Pagination tests ──────────────────────────────────────────────
# Get actual total from the DB (may have leftover rooms from prior runs)
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Get total count for pagination tests"
TOTAL_ROOMS=$(echo "$body" | jq '.meta.total')

echo ""
echo "GET /api/v1/rooms?limit=1 (pagination — first page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms?limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List rooms with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "1" "Page is 1"
assert_field "$body" ".meta.total" "$TOTAL_ROOMS" "Total matches actual DB count"
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly 1 room returned (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly 1 room, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "GET /api/v1/rooms?page=2&limit=1 (pagination — second page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms?page=2&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List rooms page 2 with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "2" "Page is 2"
assert_field "$body" ".meta.total" "$TOTAL_ROOMS" "Total still matches"
expected_on_page_2=$(( TOTAL_ROOMS > 1 ? 1 : 0 ))
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq "$expected_on_page_2" ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly $expected_on_page_2 rooms on page 2 (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly $expected_on_page_2 rooms on page 2, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ── Search tests ─────────────────────────────────────────────
section "SEARCH"

# Create a dedicated room for search
echo ""
echo "POST /api/v1/rooms (for search tests)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Alpha Room","description":"First project room for testing fulltext search"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 201 "Create room for search"

echo ""
echo "GET /api/v1/rooms?search=Alpha"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms?search=Alpha" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Search rooms by name"
found=$(echo "$body" | jq '[.data[] | select(.name == "Alpha Room")] | length')
if [[ "$found" -ge 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Found Alpha Room by name search (got $found)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Alpha Room not found by name search"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "GET /api/v1/rooms?search=fulltext"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms?search=fulltext" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Search rooms by description"
found=$(echo "$body" | jq '[.data[] | select(.name == "Alpha Room")] | length')
if [[ "$found" -ge 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Found Alpha Room by description search (got $found)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Alpha Room not found by description search"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "GET /api/v1/rooms?search=NonExistentTermXYZ"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms?search=NonExistentTermXYZ" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Search no results"
length=$(echo "$body" | jq '.data | length')
assert_field "$body" ".meta.total" "0" "Total is 0 for non-matching search"
if [[ "$length" -eq 0 ]]; then
  echo -e "  ${GREEN}PASS${NC} Empty data array for non-matching search"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected empty data array, got $length items"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "GET /api/v1/rooms?search=Alpha&limit=1"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/rooms?search=Alpha&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Search with pagination"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "1" "Page is 1"
found=$(echo "$body" | jq '.data | length')
if [[ "$found" -eq 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly 1 room in search+limit result"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected 1 room, got $found"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

print_summary
