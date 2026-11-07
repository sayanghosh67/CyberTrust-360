#!/usr/bin/env bash
# TECHNIX PRO — supervised local demo; no installs, resets or false readiness.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
if [ ! -x backend/.venv/bin/python ]; then
  echo 'Missing backend/.venv: install the documented prerequisites explicitly.' >&2
  exit 1
fi
exec backend/.venv/bin/python scripts/start_demo.py "$@"

