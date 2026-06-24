#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/helpers.sh"

section "FILES"

TOKEN=$(register_and_get_token "files-test-$(date +%s)@example.com" "password123" "Files Tester")

# Prepare test files
TEST_IMAGE="/tmp/test-image-$(date +%s).png"
TEST_TEXT="/tmp/test-text-$(date +%s).txt"

# Minimal 1x1 red PNG
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > "$TEST_IMAGE"

echo "not an image" > "$TEST_TEXT"

# ── POST /api/v1/files/upload ────────────────────────────────
echo ""
echo "POST /api/v1/files/upload (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/files/upload" \
  -F "file=@${TEST_IMAGE}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Upload without auth returns 401"

echo ""
echo "POST /api/v1/files/upload (valid image)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/files/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${TEST_IMAGE}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 201 "Upload image returns 201"
assert_has_field "$body" ".data.url" "Response has url"
assert_has_field "$body" ".data.filename" "Response has filename"
assert_has_field "$body" ".data.originalName" "Response has originalName"
assert_has_field "$body" ".data.size" "Response has size"

FILE_URL=$(echo "$body" | jq -r '.data.url')
FILE_NAME=$(echo "$body" | jq -r '.data.filename')

echo ""
echo "GET ${FILE_URL} (no auth — file served)"
response=$(curl -s -w "\n%{http_code}" \
  -X GET "${BASE_URL}${FILE_URL}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 200 "Served file returns 200"

echo ""
echo "POST /api/v1/files/upload (non-image file)"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_PREFIX}/files/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${TEST_TEXT}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 400 "Upload non-image returns 400"

# ── DELETE /api/v1/files/:filename ───────────────────────────
echo ""
echo "DELETE /api/v1/files/:filename (no auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/files/${FILE_NAME}")
status=$(echo "$response" | tail -n1)
assert_status "$status" 401 "Delete without auth returns 401"

echo ""
echo "DELETE /api/v1/files/:filename (auth)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/files/${FILE_NAME}" \
  -H "Authorization: Bearer ${TOKEN}")
status=$(echo "$response" | tail -n1)
assert_status "$status" 204 "Delete file returns 204"

echo ""
echo "DELETE /api/v1/files/:filename (already deleted)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/files/${FILE_NAME}" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Delete already deleted file returns 404"

echo ""
echo "DELETE /api/v1/files/:filename (non-existent)"
response=$(curl -s -w "\n%{http_code}" \
  -X DELETE "${API_PREFIX}/files/non-existent-file.png" \
  -H "Authorization: Bearer ${TOKEN}")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n1)
assert_status "$status" 404 "Delete non-existent file returns 404"

# Cleanup temp files
rm -f "$TEST_IMAGE" "$TEST_TEXT"

print_summary
