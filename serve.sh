#!/bin/sh
# Serve the launcher and every demo locally, for testing before a push.
# Plain static files: anything that serves a directory works. Python ships
# with macOS, so that is the default.
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
if [ -n "$(lsof -ti tcp:"$PORT" 2>/dev/null)" ]; then
  echo "port $PORT is already in use (PORT=8081 ./serve.sh to pick another)" >&2
  exit 1
fi
echo "serving http://127.0.0.1:$PORT   (ctrl-c to stop)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
