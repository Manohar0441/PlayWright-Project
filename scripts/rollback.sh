#!/usr/bin/env bash
# ============================================================================
# rollback.sh  —  restore the previous deployment.
# ----------------------------------------------------------------------------
# Called by Jenkins when the deploy step fails its health check. It re-runs the
# image saved as `streamz:previous` and health-checks it. If there is no previous
# image (e.g. the very first deploy), it exits 1 — there is nothing to fall back
# to, which is itself useful information.
# ============================================================================
set -euo pipefail

NAME="${CONTAINER:-streamz}"
PORT="${PORT:-3000}"

if ! docker image inspect streamz:previous >/dev/null 2>&1; then
  echo "No 'streamz:previous' image exists — nothing to roll back to."
  exit 1
fi

echo "==> Rolling back to streamz:previous"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -p "${PORT}:3000" streamz:previous >/dev/null

for i in $(seq 1 20); do
  if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    echo "    rollback healthy after ${i}s  [OK]"
    exit 0
  fi
  sleep 1
done

echo "    rollback health check FAILED  [X]"
exit 1
