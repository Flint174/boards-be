#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_PREFIX="${BASE_URL}/api/v1"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" -eq "$expected" ]]; then
    echo -e "  ${GREEN}PASS${NC} ${label} (HTTP $actual)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "  ${RED}FAIL${NC} ${label} — expected HTTP $expected, got $actual"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_field() {
  local json="$1"
  local field="$2"
  local expected="$3"
  local label="$4"
  local actual
  actual=$(echo "$json" | jq -r "$field")
  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}PASS${NC} ${label}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "  ${RED}FAIL${NC} ${label} — expected '$expected', got '$actual'"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_has_field() {
  local json="$1"
  local field="$2"
  local label="$3"
  local actual
  actual=$(echo "$json" | jq -r "$field")
  if [[ "$actual" != "null" && -n "$actual" ]]; then
    echo -e "  ${GREEN}PASS${NC} ${label}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "  ${RED}FAIL${NC} ${label} — field is missing or null"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

section() {
  echo ""
  echo -e "${YELLOW}════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  $1${NC}"
  echo -e "${YELLOW}════════════════════════════════════════${NC}"
}

login_and_get_token() {
  local email="$1"
  local password="$2"
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${API_PREFIX}/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")
  local body
  body=$(echo "$response" | sed '$d')
  local status
  status=$(echo "$response" | tail -n1)
  echo "$body" | jq -r '.data.accessToken'
}

register_and_get_token() {
  local email="$1"
  local password="$2"
  local name="$3"
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${API_PREFIX}/users/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"name\":\"${name}\"}")
  local body
  body=$(echo "$response" | sed '$d')
  echo "$body" | jq -r '.data.accessToken'
}

print_summary() {
  echo ""
  echo -e "${YELLOW}════════════════════════════════════════${NC}"
  echo -e "${GREEN}Passed: ${PASS_COUNT}${NC}"
  echo -e "${RED}Failed: ${FAIL_COUNT}${NC}"
  echo -e "${YELLOW}════════════════════════════════════════${NC}"
  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    exit 1
  fi
}
