#!/usr/bin/env bash
set -euo pipefail

# Builds Cesca.app — a proper macOS bundle so notifications and the menu bar
# behave like a real app instead of a terminal helper.

cd "$(dirname "$0")"

CONFIG="${CONFIG:-release}"
APP="Cesca.app"
BUNDLE_ID="com.cesca.dachshund"

echo "→ swift build -c $CONFIG"
swift build -c "$CONFIG"

BIN_PATH="$(swift build -c "$CONFIG" --show-bin-path)"
EXEC="$BIN_PATH/Cesca"
RES_BUNDLE="$BIN_PATH/Cesca_Cesca.bundle"

if [[ ! -x "$EXEC" ]]; then
    echo "Build did not produce $EXEC" >&2
    exit 1
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp "$EXEC" "$APP/Contents/MacOS/Cesca"

# Carry over the SwiftPM-generated resource bundle (holds dachshund.png if you
# dropped one into Sources/Cesca/Resources/). Bundle.module looks in
# Contents/Resources first.
if [[ -d "$RES_BUNDLE" ]]; then
    cp -R "$RES_BUNDLE" "$APP/Contents/Resources/"
fi

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key><string>Cesca</string>
    <key>CFBundleDisplayName</key><string>Cesca</string>
    <key>CFBundleExecutable</key><string>Cesca</string>
    <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>0.1</string>
    <key>CFBundleVersion</key><string>1</string>
    <key>LSMinimumSystemVersion</key><string>12.0</string>
    <key>LSUIElement</key><true/>
    <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# Ad-hoc sign so macOS Notification Center treats this as a stable identity.
codesign --force --sign - "$APP" >/dev/null 2>&1 || true

echo "✓ Built $APP"
echo "  Run with:  open $APP"
echo "  Or drag it into /Applications."
