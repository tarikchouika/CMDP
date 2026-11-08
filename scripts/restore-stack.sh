#!/usr/bin/env bash
# restore-stack.sh — idempotent restore of the CMDP local stack.
#   1) Next.js API backend on 127.0.0.1:3003  (npx next dev)
#   2) Cloudflare tunnel connectors via ./bin/cft (renamed cloudflared binary)
#      - tunnel "cmdp-local"  -> secrets/t1.token -> logs/cf1.log
#      - tunnel "mamp-local2" -> secrets/t2.token -> logs/cf2.log
# Safe to re-run. Duplicate connector starts are tolerated (they either add
# redundant connections or exit with an error recorded in their log).
# NOTE: never print token values; they are passed only as command arguments.
set -u

cd /home/z/my-project || { echo "FATAL: cannot cd /home/z/my-project"; exit 1; }
mkdir -p logs secrets

LOCAL_STATS="http://127.0.0.1:3003/api/stats"
LOCAL_ROOT="http://127.0.0.1:3003/"
WORKER_STATS="https://cmdp-api.mamp-local-5381.workers.dev/api/stats"
PAGES_URL="https://cmdp.pages.dev"

hcode() { # hcode <url> [timeout] -> http code (000 on failure)
  local c
  c=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${2:-15}" "$1" 2>/dev/null)
  echo "${c:-000}"
}

# ------------------------------------------------------------------
# 1) Backend on :3003
# ------------------------------------------------------------------
stats=$(hcode "$LOCAL_STATS" 8)
if [ "$stats" = "200" ]; then
  echo "[backend] already healthy (200)"
else
  root=$(hcode "$LOCAL_ROOT" 8)
  if [ "$root" = "200" ]; then
    echo "[backend] listening but /api/stats=$stats (app-level issue, not restarting)"
  else
    echo "[backend] down (stats=$stats root=$root) — restarting Next dev on :3003"
    rm -f .next/dev/lock
    (nohup npx next dev -p 3003 > logs/next-3003.log 2>&1 &)
    sleep 25
    stats=$(hcode "$LOCAL_STATS" 30)
    if [ "$stats" != "200" ]; then
      # Known failure mode: stale .next cache (e.g. node_modules version bump)
      # breaks Turbopack module resolution (@swc/helpers ...). Wipe and retry.
      echo "[backend] still unhealthy ($stats) — wiping stale .next cache, restarting"
      rm -rf .next
      (nohup npx next dev -p 3003 > logs/next-3003.log 2>&1 &)
      sleep 30
      stats=$(hcode "$LOCAL_STATS" 60)
    fi
    if [ "$stats" = "200" ]; then
      echo "[backend] restored (200)"
    else
      echo "[backend] STILL FAILING (stats=$stats) — check logs/next-3003.log"
    fi
  fi
fi

# ------------------------------------------------------------------
# 2) Tunnel connectors
# ------------------------------------------------------------------
worker=$(hcode "$WORKER_STATS" 15)
if [ "$worker" = "200" ]; then
  echo "[tunnels] worker origin already reachable (200) — connectors look alive"
else
  echo "[tunnels] worker origin unreachable ($worker) — ensuring connectors"
  if [ ! -x ./bin/cft ]; then
    echo "[tunnels] ./bin/cft missing — downloading (url from secrets/dl-url.txt)"
    mkdir -p bin
    if curl -sL --max-time 240 -o ./bin/cft "$(cat secrets/dl-url.txt)"; then
      chmod +x ./bin/cft
      du -h ./bin/cft
    else
      echo "[tunnels] download FAILED — cannot start connectors"
    fi
  fi
  if [ -x ./bin/cft ]; then
    for i in 1 2; do
      tok="secrets/t${i}.token"
      log="logs/cf${i}.log"
      if [ -s "$tok" ]; then
        if grep -q "Registered tunnel connection" "$log" 2>/dev/null; then
          echo "[tunnels] cf${i}: prior registration in ${log}; starting anyway"
        else
          echo "[tunnels] cf${i}: starting connector"
        fi
        (nohup ./bin/cft tunnel run --token "$(cat "$tok")" > "$log" 2>&1 &)
      else
        echo "[tunnels] cf${i}: MISSING $tok — cannot start"
      fi
    done
    sleep 25
    for i in 1 2; do
      if grep -q "Registered tunnel connection" "logs/cf${i}.log" 2>/dev/null; then
        echo "[tunnels] cf${i}: registered OK"
      else
        echo "[tunnels] cf${i}: NOT registered — check logs/cf${i}.log"
      fi
    done
    worker=$(hcode "$WORKER_STATS" 20)
  fi
fi

# ------------------------------------------------------------------
# 3) Health summary
# ------------------------------------------------------------------
echo "---------------- health summary ----------------"
echo "local  /api/stats           : $(hcode "$LOCAL_STATS" 15)"
echo "worker /api/stats (tunnel)  : $worker"
echo "pages  cmdp.pages.dev       : $(hcode "$PAGES_URL" 15)"
echo "------------------------------------------------"
