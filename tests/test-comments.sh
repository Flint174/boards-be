#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

section "COMMENTS"

# Setup: register user, create a room, a board, and a card
TOKEN=$(register_and_get_token "comment-test-$(date +%s)@example.com" "password123" "Comment Tester")

response=$(curl -s \
  -X POST "${API_PREFIX}/rooms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Comment Test Room"}')
ROOM_ID=$(echo "$response" | jq -r '.data.id')

response=$(curl -s \
  -X POST "${API_PREFIX}/boards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"name\":\"Comment Test Board\",\"roomId\":${ROOM_ID}}")
BOARD_ID=$(echo "$response" | jq -r '.data.id')

response=$(curl -s \
  -X POST "${API_PREFIX}/cards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"title\":\"Comment Test Card\",\"boardId\":${BOARD_ID}}")
CARD_ID=$(echo "$response" | jq -r '.data.id')

# ── POST /api/v1/comments ─────────────────────────────────────────
echo ""
echo "POST /api/v1/comments"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"content\":\"Test comment\",\"cardId\":${CARD_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 201 "Create comment"
assert_has_field "$body" ".data.id" "Comment id returned"
assert_field "$body" ".data.content" "Test comment" "Content matches"
assert_field "$body" ".data.parent" "null" "parent is null for root comment"
assert_has_field "$body" ".data.author.id" "Author id returned"

COMMENT_ID=$(echo "$body" | jq -r '.data.id')

# Create comment with invalid cardId — expect 404
echo ""
echo "POST /api/v1/comments (bad cardId)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"content\":\"Should fail\",\"cardId\":99999}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Invalid cardId returns 404"

# Create without auth — expect 401
echo ""
echo "POST /api/v1/comments (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/comments" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"No auth\",\"cardId\":${CARD_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "No auth returns 401"

# ── POST reply to comment ──────────────────────────────────────────
echo ""
echo "POST /api/v1/comments (reply)"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"content\":\"Reply to comment\",\"cardId\":${CARD_ID},\"parentId\":${COMMENT_ID}}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 201 "Create reply"
assert_field "$body" ".data.content" "Reply to comment" "Reply content matches"
assert_field "$body" ".data.parent.id" "$COMMENT_ID" "parent.id matches root comment"

REPLY_ID=$(echo "$body" | jq -r '.data.id')

# Create reply with invalid parentId — expect 404
echo ""
echo "POST /api/v1/comments (bad parentId)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"content\":\"Bad parent\",\"cardId\":${CARD_ID},\"parentId\":99999}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Invalid parentId returns 404"

# ── GET /api/v1/comments?cardId=:cardId ───────────────────────────
echo ""
echo "GET /api/v1/comments?cardId=:cardId"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/comments?cardId=${CARD_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "List comments by cardId"
assert_has_field "$body" ".meta.total" "meta.total exists"
assert_has_field "$body" ".meta.page" "meta.page exists"
assert_has_field "$body" ".meta.limit" "meta.limit exists"
assert_field "$body" ".meta.page" "1" "Default page is 1"
assert_field "$body" ".meta.limit" "20" "Default limit is 20"
# All comments (root + replies) are returned, newest first
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq 2 ]]; then
  echo -e "  ${GREEN}PASS${NC} All comments returned (root + reply, got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected 2 comments (root + reply), got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# List comments without cardId — expect 400
echo ""
echo "GET /api/v1/comments (missing cardId)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/comments" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 400 "Missing cardId returns 400"

# ── PUT /api/v1/comments/:id ──────────────────────────────────────
echo ""
echo "PUT /api/v1/comments/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"content":"Updated comment"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Update own comment"
assert_field "$body" ".data.content" "Updated comment" "Content updated"
assert_field "$body" ".data.id" "$COMMENT_ID" "Comment id unchanged"

# Update non-existent comment — expect 404
echo ""
echo "PUT /api/v1/comments/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/comments/99999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"content":"Nope"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Update non-existent comment returns 404"

# Update by other user — expect 403
echo ""
echo "PUT /api/v1/comments/:id (other user)"
OTHER_TOKEN=$(register_and_get_token "other-comment-$(date +%s)@example.com" "password123" "Other User")
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OTHER_TOKEN}" \
  -d '{"content":"Hacked"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 403 "Other user cannot update comment"

# ── DELETE /api/v1/comments/:id ───────────────────────────────────
echo ""
echo "DELETE /api/v1/comments/:id (by comment owner)"

response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/comments/${REPLY_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
status=$(echo "$response" | tail -n1)

assert_status "$status" 204 "Comment owner can delete own comment"

# Delete non-existent comment — expect 404
echo ""
echo "DELETE /api/v1/comments/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/comments/99999" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Delete non-existent comment returns 404"

# Delete by non-owner (not card owner / board owner / admin) — expect 403
echo ""
echo "DELETE /api/v1/comments/:id (not owner)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/comments/${COMMENT_ID}" \
  -H "Authorization: Bearer ${OTHER_TOKEN}")
status=$(echo "$response" | tail -n1)
assert_status "$status" 403 "Non-owner cannot delete comment"

# ── Pagination tests ──────────────────────────────────────────────
echo ""
echo "GET /api/v1/comments?cardId=${CARD_ID}&limit=1 (pagination — first page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/comments?cardId=${CARD_ID}&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List comments with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "1" "Page is 1"
assert_has_field "$body" ".meta.total" "Total exists"
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly 1 comment on page (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected 1 comment, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

TOTAL_COMMENTS=$(echo "$body" | jq '.meta.total')
echo ""
echo "GET /api/v1/comments?cardId=${CARD_ID}&page=2&limit=1 (pagination — second page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/comments?cardId=${CARD_ID}&page=2&limit=1" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List comments page 2 with limit=1"
assert_field "$body" ".meta.page" "2" "Page is 2"
assert_field "$body" ".meta.total" "$TOTAL_COMMENTS" "Total still matches"
expected_on_page_2=$(( TOTAL_COMMENTS > 1 ? 1 : 0 ))
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq "$expected_on_page_2" ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly $expected_on_page_2 comments on page 2 (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly $expected_on_page_2 comments on page 2, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

print_summary
