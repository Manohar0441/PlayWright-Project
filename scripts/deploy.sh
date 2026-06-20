#!/usr/bin/env bash
# ============================================================================
# deploy.sh <image:tag>  —  "Execute" step: run the image as the live container.
# ----------------------------------------------------------------------------
# Before swapping, it remembers the currently-running image as `streamz:previous`
# so a failed deploy can be rolled back (see rollback.sh). After starting the new
# container it polls /api/health; if the app never becomes healthy it exits 1,
# which tells Jenkins to roll back.
# ============================================================================
set -euo pipefail

IMAGE="${1:?usage: deploy.sh <image:tag>}"
NAME="${CONTAINER:-streamz}"
PORT="${PORT:-3000}"

echo "==> Deploying '$IMAGE' as container '$NAME' on port $PORT"

# 1) Save the currently-running image as the rollback target.
if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  CURRENT_IMG="$(docker inspect --format '{{.Config.Image}}' "$NAME" 2>/dev/null || true)"
  if [ -n "${CURRENT_IMG:-}" ]; then
    docker tag "$CURRENT_IMG" streamz:previous
    echo "    saved rollback point -> streamz:previous ($CURRENT_IMG)"
  fi
  docker rm -f "$NAME" >/dev/null 2>&1 || true
fi

# 2) Start the new container.
docker run -d --name "$NAME" -p "${PORT}:3000" "$IMAGE" >/dev/null

# 3) Health check — give the app up to ~20s to answer.
echo "==> Health check: http://localhost:${PORT}/api/health"
for i in $(seq 1 20); do
  if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    echo "    healthy after ${i}s  [OK]"
    exit 0
  fi
  sleep 1
done

echo "    health check FAILED  [X]"
exit 1
