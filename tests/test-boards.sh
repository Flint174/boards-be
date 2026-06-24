#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

section "BOARDS"

# Setup: register user and create a room
TOKEN=$(register_and_get_token "board-test-$(date +%s)@example.com" "password123" "Board Tester")

response=$(curl -s \
  -X POST "${API_PREFIX}/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Board Test Room"}')
ROOM_ID=$(echo "$response" | jq -r '.data.id')

# ── POST /api/v1/boards ───────────────────────────────────────────
echo ""
echo "POST /api/v1/boards"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/boards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"name\":\"Test Board 1\",\"description\":\"A test board\",\"roomId\":${ROOM_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 201 "Create board"
assert_has_field "$body" ".data.id" "Board id returned"
assert_field "$body" ".data.name" "Test Board 1" "Name matches"
assert_field "$body" ".data.description" "A test board" "Description matches"

BOARD_ID=$(echo "$body" | jq -r '.data.id')

# Create second board for listing tests
echo ""
echo "POST /api/v1/boards (second board)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/boards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"name\":\"Test Board 2\",\"roomId\":${ROOM_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 201 "Create second board"
BOARD_ID_2=$(echo "$body" | jq -r '.data.id')

# Create without auth — expect 401
echo ""
echo "POST /api/v1/boards (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/boards" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Should fail\",\"roomId\":${ROOM_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "No auth returns 401"

# Create with invalid roomId — expect 404
echo ""
echo "POST /api/v1/boards (bad roomId)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/boards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Should fail","roomId":99999}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Invalid roomId returns 404"

# ── GET /api/v1/boards?roomId=:roomId ─────────────────────────────
echo ""
echo "GET /api/v1/boards?roomId=:roomId"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/boards?roomId=${ROOM_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "List boards by roomId"
assert_has_field "$body" ".meta.total" "meta.total exists"
assert_has_field "$body" ".meta.page" "meta.page exists"
assert_has_field "$body" ".meta.limit" "meta.limit exists"
assert_field "$body" ".meta.page" "1" "Default page is 1"
assert_field "$body" ".meta.limit" "20" "Default limit is 20"

# List boards without roomId — expect 400
echo ""
echo "GET /api/v1/boards (missing roomId)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/boards" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 400 "Missing roomId returns 400"

# ── GET /api/v1/boards/:id ────────────────────────────────────────
echo ""
echo "GET /api/v1/boards/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/boards/${BOARD_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Get board by id"
assert_field "$body" ".data.id" "$BOARD_ID" "Board id matches"
assert_field "$body" ".data.name" "Test Board 1" "Board name matches"

# Get non-existent board — expect 404
echo ""
echo "GET /api/v1/boards/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/boards/99999" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Non-existent board returns 404"

# ── PUT /api/v1/boards/:id ────────────────────────────────────────
echo ""
echo "PUT /api/v1/boards/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/boards/${BOARD_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Updated Board","description":"Updated desc"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Update board"
assert_field "$body" ".data.name" "Updated Board" "Name updated"
assert_field "$body" ".data.description" "Updated desc" "Description updated"

# Update non-existent board — expect 404
echo ""
echo "PUT /api/v1/boards/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/boards/99999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Nope"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Update non-existent board returns 404"

# ── DELETE /api/v1/boards/:id ─────────────────────────────────────
echo ""
echo "DELETE /api/v1/boards/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/boards/${BOARD_ID_2}" \
  -H "Authorization: Bearer ${TOKEN}")
status=$(echo "$response" | tail -n1)

assert_status "$status" 204 "Delete board"

# Delete non-existent board — expect 404
echo ""
echo "DELETE /api/v1/boards/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/boards/99999" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Delete non-existent board returns 404"

# Delete by non-owner (not admin) — expect 403
echo ""
echo "DELETE /api/v1/boards/:id (not owner)"
OTHER_BOARD_TOKEN=$(register_and_get_token "other-board-$(date +%s)@example.com" "password123" "Other User")
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/boards/${BOARD_ID}" \
  -H "Authorization: Bearer ${OTHER_BOARD_TOKEN}")
status=$(echo "$response" | tail -n1)
assert_status "$status" 403 "Non-owner cannot delete board"

# ── Pagination tests ──────────────────────────────────────────────
echo ""
echo "GET /api/v1/boards?roomId=${ROOM_ID}&limit=1 (pagination — first page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/boards?roomId=${ROOM_ID}&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List boards with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "1" "Page is 1"
assert_has_field "$body" ".meta.total" "Total exists"
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly 1 board returned (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly 1 board, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

TOTAL_BOARDS=$(echo "$body" | jq '.meta.total')
echo ""
echo "GET /api/v1/boards?roomId=${ROOM_ID}&page=2&limit=1 (pagination — second page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/boards?roomId=${ROOM_ID}&page=2&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List boards page 2 with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "2" "Page is 2"
assert_field "$body" ".meta.total" "$TOTAL_BOARDS" "Total still matches"
expected_on_page_2=$(( TOTAL_BOARDS > 1 ? 1 : 0 ))
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq "$expected_on_page_2" ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly $expected_on_page_2 boards on page 2 (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly $expected_on_page_2 boards on page 2, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

print_summary
