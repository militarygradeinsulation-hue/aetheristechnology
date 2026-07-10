# Aetheris Desktop Dialer

Electron wrapper around **PopTox** (https://www.poptox.com/dialpad) that:

1. Loads PopTox in a native window (no iframe blocks).
2. **Keeps you signed in** between launches via a persistent Electron session.
3. Registers a custom URL scheme — `aetheris-dialer://call?number=+1...` — so the "Call via Desktop Dialer" button in the Aetheris portal jumps straight into PopTox with the number pre-filled.

---

## Build & install (one-time, per machine)

You need Node.js 18+ installed.

```bash
cd desktop-dialer
npm install
```

### Run in dev
```bash
npm start
```

### Package a distributable app

| Target | Command | Output |
| --- | --- | --- |
| macOS (Apple Silicon) | `npm run package:mac` | `release/AetherisDialer-darwin-arm64/` |
| macOS (Intel) | `npm run package:mac-intel` | `release/AetherisDialer-darwin-x64/` |
| Windows | `npm run package:win` | `release\AetherisDialer-win32-x64\` |
| Linux | `npm run package:linux` | `release/AetherisDialer-linux-x64/` |

Move the resulting app folder to `/Applications` (macOS) or `C:\Program Files\AetherisDialer\` (Windows) and launch it **once** — that registers the `aetheris-dialer://` protocol with the OS.

Then sign in to PopTox inside the window. Your session persists forever (or until you clear it).

---

## How the handoff works

1. In the Aetheris rep portal, type a number and click **Call via Desktop Dialer**.
2. The browser opens `aetheris-dialer://call?number=+14155550123`.
3. Your OS routes it to this Electron app, focuses the window, and the preload script auto-fills PopTox's dial field.
4. Press PopTox's green call button — the app doesn't auto-press to avoid dialing on stray clicks.

If the app isn't running, the OS launches it first and forwards the number after PopTox finishes loading.

---

## Notes

- Mic access is auto-granted to poptox.com only — other origins are denied.
- PopTox's DOM can change; if the number stops auto-filling, update the selector in `preload.cjs` (`#output`).
- No credentials or numbers are logged remotely — everything stays local to the Electron session.
- This is a **separate distributable**, not part of the deployed web app. Each rep installs it on their own machine.
