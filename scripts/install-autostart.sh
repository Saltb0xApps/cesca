#!/bin/bash
# Make Margins start automatically on login (macOS) and keep running in the
# background, so it's always available at a fixed URL you can pin to your Dock.
# Your essays are saved as .md files in ~/Documents/Margins.
#
# Run it with:  npm run autostart
# (that builds the app first, then runs this script)

set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
PORT="4321"
DATA_DIR="$HOME/Documents/Margins"
LABEL="com.margins.server"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -z "$NODE" ]; then
  echo "Could not find node on your PATH. Install Node.js first, then re-run."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$DATA_DIR" "$HOME/Library/Logs"

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$REPO/server/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key><string>$PORT</string>
    <key>DATA_DIR</key><string>$DATA_DIR</string>
    <key>NODE_ENV</key><string>production</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/margins.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/margins.log</string>
</dict>
</plist>
PLISTEOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo ""
echo "  ✓ Margins is now running and will start automatically on login."
echo "    Open:   http://localhost:$PORT"
echo "    Essays: $DATA_DIR"
echo ""
echo "  Tip: open that URL in Chrome (⋮ → Cast, Save, and Share → Install page as app)"
echo "       or Safari 17+ (File → Add to Dock) to get a real app icon in your Dock."
echo ""
echo "  To stop it later:  launchctl unload \"$PLIST\" && rm \"$PLIST\""
