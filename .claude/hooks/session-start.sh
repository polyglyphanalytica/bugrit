#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install npm dependencies (uses cache from prior container state)
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm install
fi

# Install functions dependencies if present
if [ -f functions/billing/package.json ]; then
  if [ ! -d functions/billing/node_modules ]; then
    (cd functions/billing && npm install)
  fi
fi
