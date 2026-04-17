## Steam Cloud setup (Auto-Cloud) for Reflex This

This project uses **Steam Auto-Cloud** to sync a single file:

- `reflexthis_save.json`

The game writes this file to Electron’s `userData` directory on:

- **Game over** (best-effort)
- **App quit** (best-effort, main process)

### Why a single file

Steam Cloud sync happens before and after each session and Steam recommends keeping saves **small** to avoid slowing down shutdown and consuming bandwidth. See the Steam docs: [Steam Cloud](https://partner.steamgames.com/doc/features/cloud?l=english).

### Steamworks configuration steps

1. Open Steamworks App Admin for your App ID.
2. Go to **Steam Cloud Settings**.
3. Set:
   - **Byte quota per user**
   - **Number of files allowed per user**
4. Save + publish.
5. In **Auto-Cloud configuration**, add a Root Path that matches the Electron `userData` folder.

### Auto-Cloud paths (Windows dev build)

Electron `userData` on Windows is typically under:

- `%APPDATA%\\<YourAppName>\\` (Roaming) or
- `%LOCALAPPDATA%\\<YourAppName>\\` (Local)

For this project, the exact directory name depends on Electron’s app identity.
If you’re unsure, you can log it once in `electron/main.js` via `app.getPath('userData')` **during development**.

Recommended Root Path approach:

- **Root**: `WinAppDataRoaming` (or `WinAppDataLocal` depending on the observed `userData` path)
- **Subdirectory**: a fixed folder name that matches the last segments of `userData`
- **Pattern**: `reflexthis_save.json`
- **Recursive**: `false`

### Cross-platform

If you ship macOS/Linux too, prefer a **single logical root** with **Root Overrides** so the same file syncs across platforms. See: [Steam Cloud](https://partner.steamgames.com/doc/features/cloud?l=english).

### Testing

Steam provides Auto-Cloud testing via the Steam console:

- Open `steam://open/console`
- Use `testappcloudpaths <appid>` and `set_spew_level 4 4`

Follow the detailed steps in the Steam Cloud docs: [Steam Cloud](https://partner.steamgames.com/doc/features/cloud?l=english).

