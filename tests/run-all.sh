#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "  Running full API test suite"
echo "========================================"

"${SCRIPT_DIR}/test-users.sh"
"${SCRIPT_DIR}/test-rooms.sh"
"${SCRIPT_DIR}/test-boards.sh"
"${SCRIPT_DIR}/test-cards.sh"
"${SCRIPT_DIR}/test-comments.sh"
"${SCRIPT_DIR}/test-files.sh"

echo ""
echo "All test files completed."
