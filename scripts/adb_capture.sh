#!/bin/bash
# ADB logcat capture for R1 WebView debugging
# Usage: ./scripts/adb_capture.sh
# Press Ctrl+C to stop. Output saved to r1_logcat.txt

set -e

if ! adb devices | grep -q "device$"; then
  echo "No R1 device found. Plug in R1 and accept USB debugging prompt."
  echo "Running 'adb devices':"
  adb devices
  exit 1
fi

echo "R1 connected. Capturing WebView logs..."
echo "Open your Creation on the R1, then watch for output."
echo "Logs also saved to r1_logcat.txt"
echo "Press Ctrl+C to stop."
echo "---"

adb logcat -c  # clear old logs
adb logcat | grep -iE "chromium|webview|console|speech|plugin|creation|rabbit|error" | tee r1_logcat.txt
