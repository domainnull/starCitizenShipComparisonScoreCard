#!/usr/bin/env bash
# Normal use: set up or sync the uv environment, then run the scorer.
#
#   scripts/run.sh             sync, score, rewrite results/leaderboard.js
#   scripts/run.sh --check     sync, then list stale results without writing
#   scripts/run.sh --dry-run   sync, then print the leaderboard without writing
#
# Any other arguments are passed to scripts/score.py.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v uv >/dev/null 2>&1; then
    echo "uv isn't installed. Install it first: https://docs.astral.sh/uv/getting-started/installation/" >&2
    exit 127
fi

# Creates .venv on first run (fetching the Python in .python-version if needed),
# and fails if uv.lock is out of date with pyproject.toml.
uv sync --locked --quiet

exec uv run --locked --quiet scripts/score.py "$@"
