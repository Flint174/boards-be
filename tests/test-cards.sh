#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

section "CARDS"

# Setup: register user, create a room, then a board
TOKEN=$(register_and_get_token "card-test-$(date +%s)@example.com" "password123" "Card Tester")

response=$(curl -s \
  -X POST "${API_PREFIX}/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Card Test Room"}')
ROOM_ID=$(echo "$response" | jq -r '.data.id')

response=$(curl -s \
  -X POST "${API_PREFIX}/boards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"name\":\"Card Test Board\",\"roomId\":${ROOM_ID}}")
BOARD_ID=$(echo "$response" | jq -r '.data.id')

# ── POST /api/v1/cards ───────────────────────────────────────────
echo ""
echo "POST /api/v1/cards"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"title\":\"Test Card 1\",\"description\":\"A test card\",\"boardId\":${BOARD_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 201 "Create card"
assert_has_field "$body" ".data.id" "Card id returned"
assert_field "$body" ".data.title" "Test Card 1" "Title matches"
assert_field "$body" ".data.description" "A test card" "Description matches"
assert_field "$body" ".data.status" "new" "Default status is new"
assert_field "$body" ".data.votesCount" "0" "Default votesCount is 0"
assert_field "$body" ".data.commentsCount" "0" "Default commentsCount is 0"

CARD_ID=$(echo "$body" | jq -r '.data.id')

# Create second card
echo ""
echo "POST /api/v1/cards (second card)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"title\":\"Test Card 2\",\"boardId\":${BOARD_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 201 "Create second card"
CARD_ID_2=$(echo "$body" | jq -r '.data.id')

# Create without auth — expect 401
echo ""
echo "POST /api/v1/cards (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/cards" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"No auth\",\"boardId\":${BOARD_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "No auth returns 401"

# Create with invalid boardId — expect 404
echo ""
echo "POST /api/v1/cards (bad boardId)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"Should fail","boardId":99999}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Invalid boardId returns 404"

# ── GET /api/v1/cards?boardId=:boardId ───────────────────────────
echo ""
echo "GET /api/v1/cards?boardId=:boardId"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/cards?boardId=${BOARD_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "List cards by boardId"
assert_has_field "$body" ".meta.total" "meta.total exists"
assert_has_field "$body" ".meta.page" "meta.page exists"
assert_has_field "$body" ".meta.limit" "meta.limit exists"
assert_field "$body" ".meta.page" "1" "Default page is 1"
assert_field "$body" ".meta.limit" "20" "Default limit is 20"

# List cards without boardId — expect 400
echo ""
echo "GET /api/v1/cards (missing boardId)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/cards" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 400 "Missing boardId returns 400"

# ── GET /api/v1/cards/:id ────────────────────────────────────────
echo ""
echo "GET /api/v1/cards/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/cards/${CARD_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Get card by id"
assert_field "$body" ".data.id" "$CARD_ID" "Card id matches"
assert_field "$body" ".data.title" "Test Card 1" "Card title matches"

# Get non-existent card — expect 404
echo ""
echo "GET /api/v1/cards/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/cards/99999" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Non-existent card returns 404"

# ── PUT /api/v1/cards/:id ────────────────────────────────────────
echo ""
echo "PUT /api/v1/cards/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/cards/${CARD_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"Updated Card","description":"Updated desc","status":"in_progress"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Update card"
assert_field "$body" ".data.title" "Updated Card" "Title updated"
assert_field "$body" ".data.description" "Updated desc" "Description updated"
assert_field "$body" ".data.status" "in_progress" "Status updated to in_progress"

# Update non-existent card — expect 404
echo ""
echo "PUT /api/v1/cards/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/cards/99999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title":"Nope"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Update non-existent card returns 404"

# ── POST /api/v1/cards/:id/vote ────────────────────────────────────
echo ""
echo "POST /api/v1/cards/:id/vote"

# First vote (should add)
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/cards/${CARD_ID}/vote" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Vote for card"
assert_field "$body" ".success" "true" "Vote response has success=true"
assert_field "$body" ".data.votesCount" "1" "Votes count is 1 after voting"
assert_field "$body" ".data.voted" "true" "Voted is true"

# Second vote (should toggle off)
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/cards/${CARD_ID}/vote" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Unvote for card"
assert_field "$body" ".data.votesCount" "0" "Votes count is 0 after unvoting"
assert_field "$body" ".data.voted" "false" "Voted is false"

# Vote without auth — expect 401
echo ""
echo "POST /api/v1/cards/:id/vote (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/cards/${CARD_ID}/vote")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "No auth returns 401"

# ── DELETE /api/v1/cards/:id ─────────────────────────────────────
echo ""
echo "DELETE /api/v1/cards/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/cards/${CARD_ID_2}" \
  -H "Authorization: Bearer ${TOKEN}")
status=$(echo "$response" | tail -n1)

assert_status "$status" 204 "Delete card"

# Delete non-existent card — expect 404
echo ""
echo "DELETE /api/v1/cards/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/cards/99999" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Delete non-existent card returns 404"

# Delete by non-owner (not admin) — expect 403
echo ""
echo "DELETE /api/v1/cards/:id (not owner)"
OTHER_CARD_TOKEN=$(register_and_get_token "other-card-$(date +%s)@example.com" "password123" "Other User")
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/cards/${CARD_ID}" \
  -H "Authorization: Bearer ${OTHER_CARD_TOKEN}")
status=$(echo "$response" | tail -n1)
assert_status "$status" 403 "Non-owner cannot delete card"

# ── Pagination tests ──────────────────────────────────────────────
echo ""
echo "GET /api/v1/cards?boardId=${BOARD_ID}&limit=1 (pagination — first page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/cards?boardId=${BOARD_ID}&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List cards with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "1" "Page is 1"
assert_has_field "$body" ".meta.total" "Total exists"
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly 1 card returned (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly 1 card, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

TOTAL_CARDS=$(echo "$body" | jq '.meta.total')
echo ""
echo "GET /api/v1/cards?boardId=${BOARD_ID}&page=2&limit=1 (pagination — second page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/cards?boardId=${BOARD_ID}&page=2&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List cards page 2 with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "2" "Page is 2"
assert_field "$body" ".meta.total" "$TOTAL_CARDS" "Total still matches"
expected_on_page_2=$(( TOTAL_CARDS > 1 ? 1 : 0 ))
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq "$expected_on_page_2" ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly $expected_on_page_2 cards on page 2 (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly $expected_on_page_2 cards on page 2, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

print_summary
