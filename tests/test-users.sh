#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="password123"
TEST_NAME="Test User"

section "USERS"

# ── POST /api/v1/users/register ──────────────────────────────────
echo ""
echo "POST /api/v1/users/register"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"${TEST_NAME}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 201 "Register new user"
assert_field "$body" ".success" "true" "Response has success=true"
assert_has_field "$body" ".data.accessToken" "Access token returned"
assert_has_field "$body" ".data.refreshToken" "Refresh token returned"
assert_has_field "$body" ".data.user.id" "User id returned"
USER_ID=$(echo "$body" | jq -r '.data.user.id')
assert_field "$body" ".data.user.email" "$TEST_EMAIL" "Email matches"
assert_field "$body" ".data.user.name" "$TEST_NAME" "Name matches"

ACCESS_TOKEN=$(echo "$body" | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo "$body" | jq -r '.data.refreshToken')

# Register duplicate — expect 409
echo ""
echo "POST /api/v1/users/register (duplicate)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"${TEST_NAME}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 409 "Duplicate email returns 409"

# Register with invalid email — expect 400
echo ""
echo "POST /api/v1/users/register (bad email)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"not-an-email\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"${TEST_NAME}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 400 "Invalid email returns 400"

# Register with short password — expect 400
echo ""
echo "POST /api/v1/users/register (short password)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"short-pwd-$(date +%s)@example.com\",\"password\":\"123\",\"name\":\"${TEST_NAME}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 400 "Short password returns 400"

# ── POST /api/v1/users/login ─────────────────────────────────────
echo ""
echo "POST /api/v1/users/login"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Login with valid credentials"
assert_field "$body" ".success" "true" "Response has success=true"
assert_has_field "$body" ".data.accessToken" "Access token returned on login"
assert_has_field "$body" ".data.refreshToken" "Refresh token returned on login"

ACCESS_TOKEN=$(echo "$body" | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo "$body" | jq -r '.data.refreshToken')

# Login with wrong password — expect 401
echo ""
echo "POST /api/v1/users/login (wrong password)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"wrongpassword\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Wrong password returns 401"

# Login with non-existent email — expect 401
echo ""
echo "POST /api/v1/users/login (unknown email)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"nobody-$(date +%s)@example.com\",\"password\":\"${TEST_PASSWORD}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Unknown email returns 401"

# ── GET /api/v1/users/profile ────────────────────────────────────
echo ""
echo "GET /api/v1/users/profile"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Get profile with valid token"
assert_field "$body" ".success" "true" "Response has success=true"
assert_field "$body" ".data.email" "$TEST_EMAIL" "Profile email matches"
assert_field "$body" ".data.name" "$TEST_NAME" "Profile name matches"

# Profile without token — expect 401
echo ""
echo "GET /api/v1/users/profile (no token)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users/profile")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "No token returns 401"

# Profile with invalid token — expect 401
echo ""
echo "GET /api/v1/users/profile (invalid token)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users/profile" \
  -H "Authorization: Bearer invalid-token-here")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Invalid token returns 401"

# ── GET /api/v1/users ───────────────────────────────────────────
echo ""
echo "GET /api/v1/users"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "List all users"
assert_has_field "$body" ".meta.total" "meta.total exists"
assert_has_field "$body" ".meta.page" "meta.page exists"
assert_has_field "$body" ".meta.limit" "meta.limit exists"
assert_field "$body" ".meta.page" "1" "Default page is 1"
assert_field "$body" ".meta.limit" "20" "Default limit is 20"

# GET /api/v1/users without auth — expect 401
echo ""
echo "GET /api/v1/users (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "List users without auth returns 401"

# ── GET /api/v1/users/:id ───────────────────────────────────────
echo ""
echo "GET /api/v1/users/:id"

response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users/${USER_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Get user by id"
assert_field "$body" ".data.id" "$USER_ID" "User id matches"
assert_field "$body" ".data.email" "$TEST_EMAIL" "Email matches"
assert_field "$body" ".data.name" "$TEST_NAME" "Name matches"

# Get non-existent user — expect 404
echo ""
echo "GET /api/v1/users/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users/99999" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Non-existent user returns 404"

# ── PUT /api/v1/users/:id ───────────────────────────────────────
echo ""
echo "PUT /api/v1/users/:id (update name)"

response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/users/${USER_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"name":"Updated Name"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Update own name"
assert_field "$body" ".data.name" "Updated Name" "Name updated"

# Update email
echo ""
echo "PUT /api/v1/users/:id (update email)"

response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/users/${USER_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"updated-$(date +%s)@example.com\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Update own email"
assert_has_field "$body" ".data.email" "Email updated"
assert_field "$body" ".data.name" "Updated Name" "Name unchanged"

# Update non-existent user — expect 404
echo ""
echo "PUT /api/v1/users/:id (not found)"
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/users/99999" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{"name":"Nope"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Update non-existent user returns 404"

# Update without auth — expect 401
echo ""
echo "PUT /api/v1/users/:id (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/users/${USER_ID}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nope"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Update without auth returns 401"

# Other user tries to update — expect 403
echo ""
echo "PUT /api/v1/users/:id (other user)"
OTHER_TOKEN=$(register_and_get_token "other-$(date +%s)@example.com" "password123" "Other User")
response=$(curl -s -w "\n%{http_code}" \
  -X PUT "${API_PREFIX}/users/${USER_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OTHER_TOKEN}" \
  -d '{"name":"Hacker"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 403 "Other user cannot update returns 403"

# ── POST /api/v1/users/refresh-token ─────────────────────────────
echo ""
echo "POST /api/v1/users/refresh-token"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Refresh token with valid token"
assert_field "$body" ".success" "true" "Response has success=true"
assert_has_field "$body" ".data.accessToken" "New access token returned"
assert_has_field "$body" ".data.refreshToken" "New refresh token returned"

NEW_REFRESH=$(echo "$body" | jq -r '.data.refreshToken')

# Refresh with used token (old one should be invalidated)
echo ""
echo "POST /api/v1/users/refresh-token (reused token)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"${REFRESH_TOKEN}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Reused refresh token returns 401"

# Refresh with new token — should work (proving rotation)
echo ""
echo "POST /api/v1/users/refresh-token (rotated token)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"${NEW_REFRESH}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Rotated refresh token works"

# Refresh with invalid token — expect 401
echo ""
echo "POST /api/v1/users/refresh-token (invalid token)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/refresh-token" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"totally-fake-token"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Invalid refresh token returns 401"

# Refresh with missing field — expect 400
echo ""
echo "POST /api/v1/users/refresh-token (missing field)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/refresh-token" \
  -H "Content-Type: application/json" \
  -d '{}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 400 "Missing refreshToken returns 400"

# ── POST /api/v1/users/logout ────────────────────────────────────
echo ""
echo "POST /api/v1/users/logout"

response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/logout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)

assert_status "$status" 200 "Logout with valid token"
assert_field "$body" ".success" "true" "Response has success=true"

# Refresh after logout — expect 401
echo ""
echo "POST /api/v1/users/refresh-token (after logout)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/refresh-token" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"${NEW_REFRESH}\"}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Refresh token after logout returns 401"

# Logout without token — expect 401
echo ""
echo "POST /api/v1/users/logout (no token)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/users/logout")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "No token returns 401"

# ── Pagination tests ──────────────────────────────────────────────
echo ""
echo "GET /api/v1/users?limit=1 (pagination — first page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users?limit=1" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List users with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "1" "Page is 1"
assert_has_field "$body" ".meta.total" "Total exists"
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq 1 ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly 1 user returned (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly 1 user, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

TOTAL_USERS=$(echo "$body" | jq '.meta.total')
echo ""
echo "GET /api/v1/users?page=2&limit=1 (pagination — second page)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${API_PREFIX}/users?page=2&limit=1" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "List users page 2 with limit=1"
assert_field "$body" ".meta.limit" "1" "Limit is 1"
assert_field "$body" ".meta.page" "2" "Page is 2"
assert_field "$body" ".meta.total" "$TOTAL_USERS" "Total still matches"
expected_on_page_2=$(( TOTAL_USERS > 1 ? 1 : 0 ))
length=$(echo "$body" | jq '.data | length')
if [[ "$length" -eq "$expected_on_page_2" ]]; then
  echo -e "  ${GREEN}PASS${NC} Exactly $expected_on_page_2 users on page 2 (got $length)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "  ${RED}FAIL${NC} Expected exactly $expected_on_page_2 users on page 2, got $length"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

print_summary
