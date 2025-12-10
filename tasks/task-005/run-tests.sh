#!/usr/bin/env bash
set -euo pipefail

TASK_ID="task-005"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."

cd "${REPO_ROOT}"
./run_tests.sh "${TASK_ID}"
