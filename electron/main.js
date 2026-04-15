const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');

let mainWindow;
let nextServer;
let serverReady = false;
let appLoaded = false; // Track if app has successfully loaded
let retryCount = 0; // Track retry attempts for failed loads
let loadAppFunction = null; // Store the loadApp function for retry

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// ============================================================================
// Steamworks (Achievements/Stats) - main process only
// ============================================================================
let steamworks = null; // module
let steamClient = null; // client API returned by steamworks.init()
let steamAvailable = false;
let steamStatsReady = false;
let steamStatsReadyInFlight = null; // Promise<boolean> | null
let lastSteamStoreAt = 0;
let steamCallbacksInterval = null;

function cleanupSteamworks() {
  // Stop our callback pumping (and any overlay frame invalidation timers we attached).
  if (steamCallbacksInterval) {
    clearInterval(steamCallbacksInterval);
    steamCallbacksInterval = null;
  }

  try {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach((bw) => {
      if (bw?.steamworksRepaintInterval) {
        try {
          clearInterval(bw.steamworksRepaintInterval);
        } catch (_) {
          // ignore
        }
        bw.steamworksRepaintInterval = null;
      }
    });
  } catch (_) {
    // ignore
  }

  // steamworks.js does not currently expose a public SteamAPI_Shutdown.
  // Best effort: if the native binding ever exposes a shutdown, call it.
  try {
    steamClient?.shutdown?.();
  } catch (_) {
    // ignore
  }
  try {
    steamworks?.shutdown?.();
  } catch (_) {
    // ignore
  }

  steamClient = null;
  steamworks = null;
  steamAvailable = false;
  steamStatsReady = false;
  steamStatsReadyInFlight = null;
}

function initSteamworks() {
  // Only consider Steam initialized once we have a client.
  // The module may be loaded even if init previously failed; allow retries.
  if (steamClient) return;

  try {
    // steamworks.js is a native module; keep it in main process.
    // In development, you can use a steam_appid.txt next to the executable/cwd.
    // In production on Steam, the AppID is provided by Steam when launched.
    // If STEAM_APP_ID is provided, pass it explicitly (useful for local testing).
    const maybeAppId = Number(process.env.STEAM_APP_ID);
    if (!steamworks) {
      // eslint-disable-next-line global-require
      steamworks = require('steamworks.js');
    }

    // If we're not launched by Steam, restartAppIfNecessary will relaunch us through Steam
    // (required for overlay + proper stats/achievements context).
    if (Number.isFinite(maybeAppId) && maybeAppId > 0) {
      try {
        const shouldRestart = !!steamworks.restartAppIfNecessary?.(maybeAppId);
        if (shouldRestart) {
          logToFile(`Steamworks requested restart via Steam (appId=${maybeAppId}). Quitting...`);
          // Quit quickly; Steam will relaunch us.
          app.quit();
          return;
        }
      } catch (e) {
        logToFile(`Steamworks restartAppIfNecessary failed (continuing): ${e.message}`);
      }

      steamClient = steamworks.init(maybeAppId);
    } else {
      steamClient = steamworks.init();
    }

    // Determine availability. `localplayer.getName()` can be empty in edge cases, so prefer stable identifiers.
    let appId = null;
    let steamId64 = null;
    try {
      appId = steamClient?.utils?.getAppId?.() ?? null;
    } catch (_) {
      appId = null;
    }
    try {
      const sid = steamClient?.localplayer?.getSteamId?.();
      steamId64 = sid?.steamId64 ? sid.steamId64.toString() : null;
    } catch (_) {
      steamId64 = null;
    }

    steamAvailable = Number.isFinite(appId) && appId > 0;
    steamStatsReady = false;
    steamStatsReadyInFlight = null;
    logToFile(`Steamworks init: ${steamAvailable ? 'available' : 'unavailable'} (appId=${appId}, steamId64=${steamId64})`);

    // Pump Steam callbacks periodically (recommended for callback-driven systems like overlay/stats).
    // NOTE: steamworks.js already pumps callbacks internally after init (30fps).
    // We keep a very small additional pump as a safety net in case of edge cases.
    if (steamAvailable && steamworks?.runCallbacks && !steamCallbacksInterval) {
      steamCallbacksInterval = setInterval(() => {
        try {
          steamworks.runCallbacks();
        } catch (_) {
          // ignore
        }
      }, 100);
    }
  } catch (e) {
    // Keep the module loaded so we can retry init later, but clear client state.
    steamClient = null;
    steamAvailable = false;
    steamStatsReady = false;
    steamStatsReadyInFlight = null;
    logToFile(`Steamworks init failed (non-Steam run is OK): ${e.message}`);
  }
}

function isSteamUserStatsReady() {
  if (!steamClient) return false;
  try {
    // Determine readiness by probing known INT stats.
    // Once user stats are available, Steam returns a number (0 is valid). Before that it returns null.
    const probes = [
      'STAT_BEST_SCORE',
      'STAT_GAMES_PLAYED',
      'STAT_BEST_COMBO',
      'STAT_PLAYTIME_SECONDS',
    ];
    return probes.some((name) => {
      const v = steamClient.stats.getInt(name);
      return typeof v === 'number' && Number.isFinite(v);
    });
  } catch (_) {
    return false;
  }
}

async function ensureSteamUserStatsReady({ timeoutMs = 5000, probeStatName } = {}) {
  initSteamworks();
  if (!steamClient) return { ok: false, reason: 'steam_unavailable' };

  const isReady = () => {
    if (typeof probeStatName === 'string' && probeStatName.length > 0) {
      try {
        const v = steamClient.stats.getInt(probeStatName);
        return typeof v === 'number' && Number.isFinite(v);
      } catch {
        return false;
      }
    }
    return isSteamUserStatsReady();
  };

  if (steamStatsReady || isReady()) {
    steamStatsReady = true;
    return { ok: true };
  }

  if (steamStatsReadyInFlight) {
    const ok = await steamStatsReadyInFlight;
    return ok ? { ok: true } : { ok: false, reason: 'stats_not_ready' };
  }

  steamStatsReadyInFlight = (async () => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        steamworks?.runCallbacks?.();
      } catch (_) {
        // ignore
      }
      if (isReady()) return true;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  })();

  const ok = await steamStatsReadyInFlight;
  steamStatsReadyInFlight = null;
  steamStatsReady = ok;
  return ok ? { ok: true } : { ok: false, reason: 'stats_not_ready' };
}

function getSteamStatus() {
  if (!steamClient) {
    return { available: false };
  }

  try {
    const steamId = steamClient.localplayer.getSteamId?.();
    return {
      available: !!steamAvailable,
      name: steamClient.localplayer.getName?.() ?? null,
      steamId64: steamId?.steamId64 ? steamId.steamId64.toString() : null,
      level: steamClient.localplayer.getLevel?.() ?? null,
      appId: steamClient.utils?.getAppId?.() ?? null,
      statsReady: steamStatsReady || isSteamUserStatsReady(),
    };
  } catch (e) {
    return { available: false };
  }
}

// Disable Windows DPI scaling to prevent text scaling from affecting game visuals
// This forces the device scale factor to 1, blocking Windows text scaling (e.g., 150%)
app.commandLine.appendSwitch('force-device-scale-factor', '1');
// Overlay/hooking can be sensitive to GPU compositing. steamworks.js also sets these
// in electronEnableSteamOverlay(), but we set them here too to guarantee they're applied
// before any Chromium GPU initialization.
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

// Create log file for debugging
const logFile = path.join(os.tmpdir(), 'reflexthis-electron.log');
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    // If logging fails, at least try console
    console.error('Failed to write to log file:', e.message);
  }
  // Also log to console
  console.log(message);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showErrorPage({ title, heading, messageLines }) {
  if (!mainWindow) return;

  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const safeLines = (Array.isArray(messageLines) ? messageLines : [])
    .map((line) => `<p style="margin: 8px 0;">${escapeHtml(line)}</p>`)
    .join('');

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${safeTitle}</title>
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px; background: #1a1a1a; color: #fff; height: 100vh; margin: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
      <div style="max-width: 900px;">
        <h1 style="margin: 0 0 12px 0;">${safeHeading}</h1>
        ${safeLines}
        <p style="margin: 14px 0 0 0; opacity: 0.8;">Log file:</p>
        <p style="background: #2a2a2a; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; margin: 8px 0 0 0;">${escapeHtml(
          logFile
        )}</p>
      </div>
    </body>
  </html>`;

  mainWindow
    .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    .catch((e) => {
      logToFile(`Failed to show error page: ${e.message}`);
    });
}

// Log startup
logToFile('=== Electron App Starting ===');
logToFile(`isDev: ${isDev}`);
logToFile(`isPackaged: ${app.isPackaged}`);
logToFile(`Log file: ${logFile}`);


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    fullscreen: true, // Start in fullscreen mode
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev, // Only enable DevTools in development mode
      // Keep renderer active; helps overlay invalidation and reduces throttling issues.
      backgroundThrottling: false,
      webgl: true,
    },
    icon: path.join(__dirname, '../public/logo/ReflexIcon.jpg'),
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true, // Hide menu bar (File, View, etc.)
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Only open DevTools in development mode
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
  });
  
  // Load the app
  const loadApp = () => {
    // Prevent multiple loads
    if (appLoaded) {
      logToFile('App already loaded, skipping reload');
      return;
    }
    
    logToFile(`Loading app from: ${SERVER_URL}`);
    logToFile(`Server ready status: ${serverReady}`);
    
    // Only load if server is ready
    if (!serverReady && !isDev) {
      logToFile('Server not ready yet, waiting before load...');
      // Wait a bit more and retry
      setTimeout(() => {
        if (serverReady) {
          logToFile('Server is now ready, loading app...');
          loadApp();
        } else {
          logToFile('Server still not ready, will retry on connection...');
          // Will retry via did-fail-load handler
        }
      }, 1000);
      return;
    }
    
    mainWindow.loadURL(SERVER_URL).catch((error) => {
      logToFile(`ERROR: Failed to load app: ${error.message}`);
      showErrorPage({
        title: 'Error Loading App',
        heading: 'Error Loading App',
        messageLines: [
          `Error: ${error.message}`,
          'Please check the log file for detailed error information.',
          'Retrying in 3 seconds...',
        ],
      });
    });
  };
  
  // Store loadApp function for use in server ready handlers
  loadAppFunction = loadApp;

  // Track successful page load
  mainWindow.webContents.on('did-finish-load', () => {
    if (!appLoaded && mainWindow.webContents.getURL().startsWith(SERVER_URL)) {
      appLoaded = true;
      logToFile('App successfully loaded');
    }
  });

  // Monitor for navigation errors (only retry if not already loaded)
  const MAX_RETRIES = 10;
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Only handle main frame errors and only if app hasn't loaded yet
    if (!isMainFrame || appLoaded) {
      return;
    }
    
    logToFile(`Page failed to load: ${JSON.stringify({
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame,
      retryCount
    })}`);
    
    // Handle various connection errors
    if (errorCode === -105 || errorCode === -106 || errorCode === -102 || errorCode === -2) {
      retryCount++;
      
      if (retryCount > MAX_RETRIES) {
        logToFile(`Max retries (${MAX_RETRIES}) reached. Showing error.`);
        showErrorPage({
          title: 'Connection Error',
          heading: 'Connection Error',
          messageLines: [
            `The Next.js server is not responding after ${MAX_RETRIES} attempts.`,
            `Error Code: ${errorCode}`,
            `Description: ${errorDescription}`,
            'Please check the log file to see why the server failed to start.',
            'You can try closing and reopening the application.',
          ],
        });
        return;
      }
      
      // Network error - server not ready
      logToFile(`Server not ready yet, retrying... (attempt ${retryCount}/${MAX_RETRIES})`);
      
      // Check if server is ready, then retry
      const checkAndRetry = () => {
        if (serverReady) {
          logToFile('Server is ready, retrying load...');
          setTimeout(() => loadApp(), 500);
        } else {
          // Wait a bit longer and check again
          logToFile('Server still not ready, waiting...');
          setTimeout(checkAndRetry, 1000);
        }
      };
      
      // Start checking after a short delay
      setTimeout(checkAndRetry, 1000);
    }
  });

  if (isDev) {
    // In development, connect to Next.js dev server
    loadApp();
  } else {
    // In production, wait for server to be ready
    waitForServer(loadApp);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Check if server is ready by making HTTP request
function checkServerReady(callback, maxAttempts = 60) {
  let attempts = 0;
  
  const check = () => {
    attempts++;
    logToFile(`Checking server readiness (attempt ${attempts}/${maxAttempts})...`);
    
    const req = http.get(SERVER_URL, { timeout: 2000 }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        // Server is responding (404 is ok, means server is up)
        logToFile('Server is ready! HTTP response received.');
        if (!serverReady) {
          serverReady = true;
          // If window exists but hasn't loaded, trigger a retry
          if (mainWindow && !appLoaded && loadAppFunction) {
            logToFile('Server became ready via HTTP check, triggering app load...');
            setTimeout(() => {
              if (mainWindow && !appLoaded && loadAppFunction) {
                loadAppFunction();
              }
            }, 500);
          }
        }
        callback();
      } else {
        logToFile(`Server responded with status ${res.statusCode}, retrying...`);
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          logToFile('Server did not become ready in time');
          callback(); // Try anyway
        }
      }
    });
    
    req.on('error', (err) => {
      logToFile(`Server check error (attempt ${attempts}): ${err.message}`);
      if (attempts < maxAttempts) {
        // Exponential backoff for first few attempts, then constant
        const delay = attempts < 5 ? 500 * attempts : 1000;
        setTimeout(check, delay);
      } else {
        logToFile('Server check failed after max attempts');
        callback(); // Try anyway
      }
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      logToFile(`Server check timeout (attempt ${attempts})`);
      if (attempts < maxAttempts) {
        const delay = attempts < 5 ? 500 * attempts : 1000;
        setTimeout(check, delay);
      } else {
        logToFile('Server check timed out after max attempts');
        callback(); // Try anyway
      }
    });
  };
  
  check();
}

// Wait for server to be ready before loading
function waitForServer(callback) {
  console.log('Waiting for Next.js server to be ready...');
  // Wait longer - up to 30 seconds (60 * 500ms) to account for slower startup
  checkServerReady(callback, 60);
}

function startNextServer() {
  logToFile('startNextServer() called');
  
  if (isDev) {
    // In dev mode, Next.js dev server should already be running
    logToFile('Dev mode - assuming server is already running');
    serverReady = true;
    return;
  }

  logToFile('Production mode - starting Next.js server');
  
  // In production, start the Next.js server from standalone build
  const appPath = app.getAppPath();
  logToFile(`App path: ${appPath}`);
  
  // With ASAR enabled, unpacked files are in app.asar.unpacked
  // Check unpacked path first (where standalone should be)
  let nextPath, serverPath;
  
  if (appPath.includes('.asar')) {
    logToFile('App is in ASAR archive, checking unpacked path first');
    const asarPath = appPath.replace('app.asar', 'app.asar.unpacked');
    nextPath = path.join(asarPath, '.next/standalone');
    serverPath = path.join(nextPath, 'server.js');
    logToFile(`Trying unpacked path: ${serverPath}`);
    
    // If not found in unpacked, try ASAR path (shouldn't happen but fallback)
    if (!fs.existsSync(serverPath)) {
      logToFile('Unpacked path not found, trying ASAR path (unlikely to work)');
      nextPath = path.join(appPath, '.next/standalone');
      serverPath = path.join(nextPath, 'server.js');
      logToFile(`Trying ASAR path: ${serverPath}`);
    }
  } else {
    logToFile('App is not in ASAR (development mode)');
    nextPath = path.join(appPath, '.next/standalone');
    serverPath = path.join(nextPath, 'server.js');
    logToFile(`Trying path: ${serverPath}`);
  }
  
  // Check if standalone build exists
  if (!fs.existsSync(serverPath)) {
    logToFile(`ERROR: Server file not found at: ${serverPath}`);
    logToFile(`App path: ${appPath}`);
    
    // List what files actually exist
    try {
      if (fs.existsSync(appPath)) {
        const files = fs.readdirSync(appPath);
        logToFile(`Files in app path (first 20): ${files.slice(0, 20).join(', ')}`);
      }
      if (appPath.includes('.asar')) {
        const asarPath = appPath.replace('app.asar', 'app.asar.unpacked');
        if (fs.existsSync(asarPath)) {
          const unpackedFiles = fs.readdirSync(asarPath);
          logToFile(`Files in unpacked path (first 20): ${unpackedFiles.slice(0, 20).join(', ')}`);
        } else {
          logToFile(`Unpacked path does not exist: ${asarPath}`);
        }
      }
    } catch (e) {
      logToFile(`Error listing files: ${e.message}`);
    }
    
    logToFile('Please ensure you ran "npm run build" before packaging');
    
    // Show error in window if it exists
    if (mainWindow) {
      const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Build Error</title></head><body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff;"><h1>Build Not Found</h1><p>Next.js standalone server not found.</p><p>Expected: ${serverPath}</p><p>Log file: ${logFile}</p><p>Please check the log file for details.</p></body></html>`;
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
    return;
  }
  
  logToFile(`Server file found: ${serverPath}`);
  
  // For Next.js standalone, the server.js expects to be run from the standalone directory
  // and it will look for static files in ../static relative to standalone
  const nextRoot = path.dirname(nextPath); // This is .next directory
  const staticPath = path.join(nextRoot, 'static');
  
  logToFile('=== Server Startup Info ===');
  logToFile(`Server file: ${serverPath}`);
  logToFile(`Server exists: ${fs.existsSync(serverPath)}`);
  logToFile(`Working directory (standalone): ${nextPath}`);
  logToFile(`Next root directory (.next): ${nextRoot}`);
  logToFile(`Static files path (../static from standalone): ${staticPath}`);
  logToFile(`Static files exist: ${fs.existsSync(staticPath)}`);
  
  // Verify static files structure
  if (fs.existsSync(staticPath)) {
    try {
      const staticFiles = fs.readdirSync(staticPath);
      logToFile(`Static directory contains: ${staticFiles.slice(0, 10).join(', ')}`);
      
      // Check for chunks directory
      const chunksPath = path.join(staticPath, 'chunks');
      if (fs.existsSync(chunksPath)) {
        const chunks = fs.readdirSync(chunksPath);
        logToFile(`Static/chunks contains ${chunks.length} files (first 5): ${chunks.slice(0, 5).join(', ')}`);
      } else {
        logToFile(`WARNING: Static/chunks directory not found!`);
      }
    } catch (e) {
      logToFile(`Error reading static directory: ${e.message}`);
    }
  } else {
    logToFile(`ERROR: Static files directory not found at: ${staticPath}`);
    logToFile(`This will cause 404 errors for static assets.`);
  }
  
  // List files in standalone directory
  try {
    if (fs.existsSync(nextPath)) {
      const files = fs.readdirSync(nextPath);
      logToFile(`Files in standalone directory (first 20): ${files.slice(0, 20).join(', ')}`);
      
      // Check if node_modules exists
      const nodeModulesPath = path.join(nextPath, 'node_modules');
      const nodeModulesExists = fs.existsSync(nodeModulesPath);
      logToFile(`node_modules exists: ${nodeModulesExists}`);
      if (nodeModulesExists) {
        try {
          const nodeModulesFiles = fs.readdirSync(nodeModulesPath);
          logToFile(`node_modules contains ${nodeModulesFiles.length} items (first 10): ${nodeModulesFiles.slice(0, 10).join(', ')}`);
          
          // Check specifically for 'next'
          const nextPath_check = path.join(nodeModulesPath, 'next');
          logToFile(`'next' module exists: ${fs.existsSync(nextPath_check)}`);
        } catch (e) {
          logToFile(`Error reading node_modules: ${e.message}`);
        }
      } else {
        logToFile(`ERROR: node_modules not found in standalone directory!`);
        logToFile(`This is required for the Next.js server to run.`);
      }
    } else {
      logToFile(`ERROR: Standalone directory does not exist: ${nextPath}`);
    }
  } catch (e) {
    logToFile(`Error listing standalone files: ${e.message}`);
  }
  
  // Use fork() to run the Node.js script - fork() uses process.execPath internally
  // but handles it correctly. We need to ensure the script is in the unpacked location
  // IMPORTANT: Scripts inside ASAR archives cannot be executed, so we must use unpacked path
  logToFile(`Forking server with cwd: ${nextPath}`);
  logToFile(`Using executable (via fork): ${process.execPath}`);
  logToFile(`Executable exists: ${fs.existsSync(process.execPath)}`);
  logToFile(`Script path: ${serverPath}`);
  
  // Verify process.execPath exists (Electron executable)
  if (!fs.existsSync(process.execPath)) {
    logToFile(`ERROR: Electron executable not found at: ${process.execPath}`);
    logToFile(`This is required to run Node.js scripts.`);
    // Try to find alternative executable path
    const altPath = path.join(path.dirname(process.execPath), 'electron.exe');
    logToFile(`Trying alternative path: ${altPath}`);
    if (fs.existsSync(altPath)) {
      logToFile(`Found alternative executable, but fork() uses process.execPath internally`);
    }
    return;
  }
  
  // Verify the script exists and is accessible
  if (!fs.existsSync(serverPath)) {
    logToFile(`ERROR: Server script not found at: ${serverPath}`);
    logToFile(`This path must be in the unpacked location (not inside ASAR)`);
    return;
  }
  
  // Check if path is inside ASAR (which won't work)
  if (serverPath.includes('.asar') && !serverPath.includes('.asar.unpacked')) {
    logToFile(`ERROR: Server script is inside ASAR archive: ${serverPath}`);
    logToFile(`Scripts cannot be executed from inside ASAR. Ensure asarUnpack includes .next/standalone`);
    logToFile(`Current asarUnpack should include: .next/standalone and .next/standalone/**`);
    return;
  }
  
  try {
    // Next.js standalone server.js expects to run from standalone directory
    // and looks for static files at ../static relative to standalone
    // The path should be: .next/standalone/../static = .next/static
    // Use fork() which correctly handles Electron's Node.js runtime
    // fork() automatically uses process.execPath (Electron executable with Node.js)
    // Set NEXT_TELEMETRY_DISABLED to avoid telemetry issues
    // Set explicit paths for Next.js to find static files
    const env = {
      ...process.env,
      PORT: String(SERVER_PORT),
      NODE_ENV: 'production',
      HOSTNAME: 'localhost',
      HOST: 'localhost',
      NEXT_TELEMETRY_DISABLED: '1',
      // Ensure process can resolve paths correctly
      PWD: nextPath,
      // Explicitly set the static directory path for Next.js
      // Next.js standalone looks for ../static relative to standalone
      // But we need to ensure it can resolve this correctly
    };
    
    nextServer = require('child_process').fork(serverPath, [], {
      cwd: nextPath, // Set cwd to standalone directory (as Next.js expects)
      env: env,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'], // stdout, stderr, IPC
      silent: false, // Don't silence output
    });
    
    logToFile(`Working directory set to: ${nextPath}`);
    logToFile(`Static files absolute path: ${staticPath}`);
    logToFile(`Static files should be at: ${staticPath} (../static from standalone)`);
    
    // Verify the relative path from standalone directory resolves correctly
    const relativeStaticPath = path.resolve(nextPath, '..', 'static');
    logToFile(`Resolved relative static path: ${relativeStaticPath}`);
    logToFile(`Resolved path exists: ${fs.existsSync(relativeStaticPath)}`);
    logToFile(`Paths match: ${staticPath === relativeStaticPath}`);
    
    // If paths don't match, there might be a resolution issue
    if (staticPath !== relativeStaticPath) {
      logToFile(`WARNING: Static path resolution mismatch!`);
      logToFile(`Expected: ${staticPath}`);
      logToFile(`Resolved: ${relativeStaticPath}`);
    }
    
    logToFile(`Server process forked, PID: ${nextServer.pid}`);
  } catch (error) {
    logToFile(`ERROR: Failed to start server: ${error.message}`);
    logToFile(`Error stack: ${error.stack}`);
    if (mainWindow) {
      const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fork Error</title></head><body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff;"><h1>Failed to Start Server</h1><p>${error.message}</p><p>Log file: ${logFile}</p></body></html>`;
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
    return;
  }

  nextServer.stdout.on('data', (data) => {
    const output = data.toString();
    logToFile(`Next.js stdout: ${output}`);
    // Check for server ready message - Next.js 13+ uses different messages
    if (output.includes('Ready') || 
        output.includes('started server') || 
        output.includes('Local:') ||
        output.includes('started') ||
        output.match(/ready.*started/i)) {
      logToFile('Server ready detected from stdout!');
      if (!serverReady) {
        serverReady = true;
        // If window exists but hasn't loaded, trigger a retry
        if (mainWindow && !appLoaded && loadAppFunction) {
          logToFile('Server became ready, triggering app load...');
          setTimeout(() => {
            if (mainWindow && !appLoaded && loadAppFunction) {
              loadAppFunction();
            }
          }, 500);
        }
      }
    }
  });

  nextServer.stderr.on('data', (data) => {
    const output = data.toString();
    logToFile(`Next.js stderr: ${output}`);
    // Some Next.js messages go to stderr but aren't errors
    // Also check for common Next.js startup messages
    if (output.includes('Ready') || 
        output.includes('started server') || 
        output.includes('Local:') ||
        output.includes('started') ||
        output.match(/ready.*started/i)) {
      logToFile('Server ready detected from stderr!');
      if (!serverReady) {
        serverReady = true;
        // If window exists but hasn't loaded, trigger a retry
        if (mainWindow && !appLoaded && loadAppFunction) {
          logToFile('Server became ready, triggering app load...');
          setTimeout(() => {
            if (mainWindow && !appLoaded && loadAppFunction) {
              loadAppFunction();
            }
          }, 500);
        }
      }
    }
    // Check for actual errors
    if (output.includes('Error') || output.includes('error') || output.includes('ENOENT') || output.includes('Cannot find')) {
      logToFile(`Potential server error detected: ${output}`);
    }
  });

  nextServer.on('error', (error) => {
    logToFile(`ERROR: Failed to start Next.js server: ${error.message}`);
    logToFile(`Error details: ${JSON.stringify({
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      stack: error.stack
    })}`);
    if (mainWindow) {
      const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Server Error</title></head><body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff;"><h1>Server Startup Error</h1><p><strong>Error:</strong> ${error.message}</p><p><strong>Code:</strong> ${error.code}</p><p>Log file: ${logFile}</p><p>Please check the log file for details.</p></body></html>`;
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
  });

  nextServer.on('close', (code, signal) => {
    logToFile(`Next.js server exited with code ${code} and signal ${signal}`);
    serverReady = false;
    if (code !== 0 && code !== null) {
      logToFile(`ERROR: Server exited with error code: ${code}`);
      if (mainWindow) {
        const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Server Crashed</title></head><body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff;"><h1>Server Crashed</h1><p>Exit code: ${code}</p><p>Signal: ${signal || 'N/A'}</p><p>Log file: ${logFile}</p><p>Please check the log file for error details.</p></body></html>`;
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
      }
    }
  });

  nextServer.on('message', (message) => {
    console.log('Next.js server message:', message);
  });
}

app.whenReady().then(() => {
  logToFile('App is ready, starting server...');
  appLoaded = false; // Reset loaded flag
  serverReady = false; // Reset server ready flag
  retryCount = 0; // Reset retry count

  // Initialize Steamworks as early as possible (safe no-op outside Steam).
  initSteamworks();

  // Log GPU feature status for overlay diagnostics (helps spot software rendering / disabled compositing).
  try {
    const status = app.getGPUFeatureStatus?.();
    if (status) {
      logToFile(`GPU feature status: ${JSON.stringify(status)}`);
    }
  } catch (_) {
    // ignore
  }
  
  // Start the server first
  startNextServer();
  
  // Wait longer on first startup to allow server to initialize
  // This is especially important after installation when files might be scanned
  const initialDelay = isDev ? 1000 : 5000; // Increased from 3000 to 5000
  
  setTimeout(() => {
    logToFile('Creating window...');
    logToFile(`Server ready status before window creation: ${serverReady}`);
    createWindow();
  }, initialDelay);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  cleanupSteamworks();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
  cleanupSteamworks();
});

// Handle quit request from renderer
ipcMain.handle('app-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
  cleanupSteamworks();
  app.quit();
});

// ============================================================================
// Steam IPC (renderer -> main)
// ============================================================================
ipcMain.handle('steam-is-available', () => {
  // If init wasn't attempted yet, attempt now.
  initSteamworks();
  return getSteamStatus();
});

ipcMain.handle('steam-ensure-stats-ready', async (event, options) => {
  const timeoutMs = Number.isFinite(options?.timeoutMs) ? Math.max(0, Math.trunc(options.timeoutMs)) : 5000;
  const probeStatName = typeof options?.probeStatName === 'string' ? options.probeStatName : undefined;
  return await ensureSteamUserStatsReady({ timeoutMs, probeStatName });
});

ipcMain.handle('steam-activate-achievement', (event, achievementApiName) => {
  initSteamworks();
  if (!steamClient) return { ok: false, reason: 'steam_unavailable' };
  if (!steamStatsReady && !isSteamUserStatsReady()) return { ok: false, reason: 'stats_not_ready' };
  if (typeof achievementApiName !== 'string' || achievementApiName.length === 0) {
    return { ok: false, reason: 'invalid_name' };
  }

  try {
    const ok = !!steamClient.achievement.activate(achievementApiName);
    logToFile(`Steam activateAchievement(${achievementApiName}) => ${ok}`);
    return { ok };
  } catch (e) {
    logToFile(`Steam activateAchievement(${achievementApiName}) threw: ${e.message}`);
    return { ok: false, reason: 'exception', message: e.message };
  }
});

ipcMain.handle('steam-set-stat-int', (event, statName, value) => {
  initSteamworks();
  if (!steamClient) return { ok: false, reason: 'steam_unavailable' };
  if (!steamStatsReady && !isSteamUserStatsReady()) return { ok: false, reason: 'stats_not_ready' };
  if (typeof statName !== 'string' || statName.length === 0 || !Number.isFinite(value)) {
    return { ok: false, reason: 'invalid_args' };
  }
  try {
    const ok = !!steamClient.stats.setInt(statName, Math.trunc(value));
    logToFile(`Steam setStatInt(${statName}, ${Math.trunc(value)}) => ${ok}`);
    return { ok };
  } catch (e) {
    logToFile(`Steam setStatInt(${statName}) threw: ${e.message}`);
    return { ok: false, reason: 'exception', message: e.message };
  }
});

ipcMain.handle('steam-get-stat-int', (event, statName) => {
  initSteamworks();
  if (!steamClient) return { ok: false, reason: 'steam_unavailable' };
  if (!steamStatsReady && !isSteamUserStatsReady()) return { ok: false, reason: 'stats_not_ready' };
  if (typeof statName !== 'string' || statName.length === 0) {
    return { ok: false, reason: 'invalid_args' };
  }
  try {
    const value = steamClient.stats.getInt(statName);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, reason: 'not_found' };
    }
    return { ok: true, value };
  } catch (e) {
    return { ok: false, reason: 'exception', message: e.message };
  }
});

ipcMain.handle('steam-store-stats', (event, options) => {
  initSteamworks();
  if (!steamClient) return { ok: false, reason: 'steam_unavailable' };
  if (!steamStatsReady && !isSteamUserStatsReady()) return { ok: false, reason: 'stats_not_ready' };

  // Throttle stores (Steam recommends not spamming StoreStats).
  const now = Date.now();
  const force = !!options?.force;
  if (!force && now - lastSteamStoreAt < 10_000) {
    logToFile(`Steam StoreStats throttled (force=false).`);
    return { ok: false, throttled: true, reason: 'throttled' };
  }

  try {
    const ok = !!steamClient.stats.store();
    lastSteamStoreAt = now;
    logToFile(`Steam StoreStats(force=${force}) => ${ok}`);
    return { ok };
  } catch (e) {
    logToFile(`Steam StoreStats threw: ${e.message}`);
    return { ok: false, reason: 'exception', message: e.message };
  }
});

ipcMain.handle('steam-debug', (event, options) => {
  initSteamworks();
  if (!steamClient) return { ok: false, available: false, reason: 'steam_unavailable' };
  if (!steamStatsReady && !isSteamUserStatsReady()) return { ok: false, available: true, reason: 'stats_not_ready' };

  try {
    const statNames = Array.isArray(options?.statNames) ? options.statNames.filter((s) => typeof s === 'string') : [];
    const achievementApiNames = Array.isArray(options?.achievementApiNames)
      ? options.achievementApiNames.filter((s) => typeof s === 'string')
      : [];

    const achievementNames = (() => {
      try {
        return steamClient.achievement?.names?.() ?? [];
      } catch {
        return [];
      }
    })();

    const stats = {};
    for (const name of statNames) {
      try {
        const v = steamClient.stats.getInt(name);
        stats[name] = typeof v === 'number' && Number.isFinite(v) ? v : null;
      } catch {
        stats[name] = null;
      }
    }

    const achievements = {};
    for (const apiName of achievementApiNames) {
      try {
        const v = steamClient.achievement.isActivated(apiName);
        achievements[apiName] = typeof v === 'boolean' ? v : null;
      } catch {
        achievements[apiName] = null;
      }
    }

    return {
      ok: true,
      available: true,
      appId: steamClient.utils?.getAppId?.() ?? null,
      achievementNames,
      achievements,
      stats,
    };
  } catch (e) {
    return { ok: false, available: true, reason: 'exception', message: e.message };
  }
});

ipcMain.handle('steam-open-overlay-achievements', () => {
  initSteamworks();
  if (!steamClient) return { ok: false, reason: 'steam_unavailable' };
  try {
    steamClient.overlay.activateDialog(steamClient.overlay.Dialog.Achievements);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'exception', message: e.message };
  }
});

// Enable Steam Overlay support for Electron if available (safe no-op outside Steam).
try {
  // eslint-disable-next-line global-require
  require('steamworks.js').electronEnableSteamOverlay();
} catch (_) {
  // ignore
}

