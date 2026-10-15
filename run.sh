#!/bin/sh
# Booth mode (macOS): serve locally, then open the launcher full screen in
# Chrome kiosk mode. Cmd+Q quits Chrome; the server stops with it.
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
URL="http://127.0.0.1:$PORT/"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ -z "$(lsof -ti tcp:"$PORT" 2>/dev/null)" ]; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  SERVER=$!
  trap 'kill $SERVER 2>/dev/null' EXIT
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -fsS -o /dev/null "$URL" 2>/dev/null && break
    sleep 0.3
  done
fi

caffeinate -d -i &                                   # keep the display awake
trap 'kill $SERVER $! 2>/dev/null' EXIT

if [ -x "$CHROME" ]; then
  "$CHROME" --kiosk --noerrdialogs --disable-session-crashed-bubble --disable-infobars \
    --autoplay-policy=no-user-gesture-required --user-data-dir="${TMPDIR:-/tmp}/booth-chrome" \
    --disable-background-timer-throttling --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding --no-first-run --no-default-browser-check "$URL"
else
  echo "Chrome not found at its usual path; opening in the default browser"
  open "$URL"; wait
fi
