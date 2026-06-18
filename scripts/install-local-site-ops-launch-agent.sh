#!/bin/zsh
set -euo pipefail

LABEL="com.vikram.site-ops-sweep"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
SCRIPT_PATH="/Users/vikram/Documents/vikramchopra/scripts/run-local-ops-sweep.sh"
WRAPPER_PATH="$HOME/bin/site-ops-sweep.sh"
LOG_DIR="$HOME/Library/Logs"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR" "$HOME/bin"

cat > "$WRAPPER_PATH" <<WRAP
#!/bin/zsh
exec "${SCRIPT_PATH}"
WRAP

chmod 755 "$WRAPPER_PATH"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${WRAPPER_PATH}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>3600</integer>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/site-ops-sweep.launchd.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/site-ops-sweep.launchd.err</string>
</dict>
</plist>
PLIST

chmod 644 "$PLIST_PATH"
chmod +x "$SCRIPT_PATH"

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/${LABEL}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "Installed ${LABEL} at ${PLIST_PATH}"
