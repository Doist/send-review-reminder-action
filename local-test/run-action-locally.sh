#!/usr/bin/env bash
# Run the FULL built action locally, exactly as GitHub Actions would, by
# mapping the workflow `with:` inputs to the INPUT_* env vars @actions/core
# reads. Requires `npm run all` (or `npm run package`) to have built dist/.
#
# This makes real GitHub API calls against GITHUB_REPOSITORY and, if any PR is
# actually overdue, a real Comms post. Use comms-smoke-test.mjs first to verify
# the Comms calls in isolation.
#
# Usage:  ./local-test/run-action-locally.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load config (git-ignored; copy .env.example to .env.local and fill it in)
set -a
# shellcheck disable=SC1091
source "$SCRIPT_DIR/.env.local"
set +a

# GitHub context the action reads from the environment
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?set GITHUB_REPOSITORY in .env.local}"

# Map workflow inputs -> INPUT_* (how @actions/core.getInput finds them)
export INPUT_TOKEN="${GITHUB_TOKEN:?set GITHUB_TOKEN in .env.local}"
export INPUT_REVIEW_TIME_MS="${REVIEW_TIME_MS:-86400000}"
export INPUT_MESSAGE="${MESSAGE:-%reviewer%, please review [#%pr_number% - %pr_title%](%pr_url%)}"
export INPUT_TODOIST_ACCESS_TOKEN="${TODOIST_ACCESS_TOKEN:?}"
export INPUT_THREAD_ID="${THREAD_ID:?}"
export INPUT_IGNORE_AUTHORS="${IGNORE_AUTHORS:-}"
# Fallbacks mirror the input defaults in action.yml.
export INPUT_IGNORE_DRAFT_PRS="${IGNORE_DRAFT_PRS:-false}"
export INPUT_IGNORE_LABELS="${IGNORE_LABELS:-}"
export INPUT_IGNORE_PRS_WITH_FAILING_CHECKS="${IGNORE_PRS_WITH_FAILING_CHECKS:-false}"
export INPUT_AUTHOR_TO_COMMS_MAPPING="${AUTHOR_TO_COMMS_MAPPING:-}"
export INPUT_IGNORE_REVIEW_BOTS="${IGNORE_REVIEW_BOTS:-github-actions}"

echo "Running action against $GITHUB_REPOSITORY ..."
node "$REPO_ROOT/dist/index.js"
