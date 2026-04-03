# R1 Ecosystem Research Plan

## 1. ADB + DevTools (highest value, do first)
- `brew install android-platform-tools`
- `adb devices` — confirm R1 visible
- `adb logcat | grep -i "chromium\|webview\|console\|speech"` — capture WebView errors
- `chrome://inspect` on Mac Chrome — if WebView is debuggable, get full DevTools
- **Answers:** Available JS APIs, PluginMessageHandler behavior, WebView version, network failures

## 2. On-device JS probing
- Inject diagnostic script into Creation that dumps environment to canvas HUD
- Probe: `navigator.userAgent`, `navigator.mediaDevices`, `window.SpeechRecognition`, `window.creationSensors`, `creationStorage`, all `PluginMessageHandler` properties
- Enumerate R1-specific window globals: `Object.keys(window).filter(k => /plugin|creation|rabbit|handler/i.test(k))`
- Render results on-canvas (no DevTools needed)

## 3. Reverse-engineer Creations SDK docs
- Search `hole.rabbit.tech`, `www.rabbit.tech/creations` for developer portal
- GitHub search: `rabbit r1 creations`, `PluginMessageHandler`
- Reddit r/rabbit_r1, Rabbit community Discord

## 4. APK analysis (deeper dive)
- `adb shell pm list packages | grep -i rabbit`
- Pull and decompile APK with jadx/apktool
- Inspect JS bridge implementation

## 5. Network sniffing
- mitmproxy/Charles proxy to see native LLM bridge API calls
- Determine if `useLLM: true` is cloud or local

## Priority order: 1 → 2 → 3 → 4 → 5
