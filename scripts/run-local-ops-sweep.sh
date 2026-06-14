#!/bin/zsh
set -euo pipefail

REPO_DIR="/Users/vikram/Documents/New project 4"
LOG_DIR="$HOME/Library/Logs"

mkdir -p "$LOG_DIR"
cd "$REPO_DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-vikramcars24/vikramcars24.github.io}"
export GITHUB_SERVER_URL="${GITHUB_SERVER_URL:-https://github.com}"
export GITHUB_API_URL="${GITHUB_API_URL:-https://api.github.com}"
export GMAIL_SWEEP_MODE="${GMAIL_SWEEP_MODE:-filter}"
export SLACK_REPORT_DM_CHANNEL="${SLACK_REPORT_DM_CHANNEL:-D19RY6BGV}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  GITHUB_TOKEN="$(gh auth token)"
  export GITHUB_TOKEN
fi

/usr/bin/env node scripts/morning-ops-sweep.mjs >> "$LOG_DIR/site-ops-sweep.log" 2>> "$LOG_DIR/site-ops-sweep.err"
