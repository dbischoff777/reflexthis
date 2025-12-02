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

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

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
    mainWindow.loadURL(SERVER_URL).catch((error) => {
      logToFile(`ERROR: Failed to load app: ${error.message}`);
      // Show error in window with log file location
      const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Connection Error</title></head><body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff;"><h1>Error Loading App</h1><p><strong>Error:</strong> ${error.message}</p><p><strong>Log file location:</strong></p><p style="background: #2a2a2a; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all;">${logFile}</p><p>Please check the log file for detailed error information.</p></body></html>`;
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    });
  };

  // Track successful page load
  mainWindow.webContents.on('did-finish-load', () => {
    if (!appLoaded && mainWindow.webContents.getURL().startsWith(SERVER_URL)) {
      appLoaded = true;
      logToFile('App successfully loaded');
    }
  });

  // Monitor for navigation errors (only retry if not already loaded)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Only handle main frame errors and only if app hasn't loaded yet
    if (!isMainFrame || appLoaded) {
      return;
    }
    
    logToFile(`Page failed to load: ${JSON.stringify({
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame
    })}`);
    
    if (errorCode === -105 || errorCode === -106 || errorCode === -102) {
      // Network error - server not ready
      logToFile('Server not ready yet, retrying...');
      setTimeout(() => {
        // Only retry if app hasn't loaded and server is ready
        if (!appLoaded && serverReady) {
          logToFile('Server is ready, retrying load...');
          loadApp();
        } else if (!appLoaded && !serverReady) {
          logToFile('Server still not ready, showing error...');
          const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Connection Refused</title></head><body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff;"><h1>Connection Refused</h1><p>The Next.js server is not responding.</p><p><strong>Error Code:</strong> ${errorCode}</p><p><strong>Description:</strong> ${errorDescription}</p><p><strong>Log file location:</strong></p><p style="background: #2a2a2a; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all;">${logFile}</p><p>Please check the log file to see why the server failed to start.</p></body></html>`;
          mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
        }
      }, 2000);
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
function checkServerReady(callback, maxAttempts = 30) {
  let attempts = 0;
  
  const check = () => {
    attempts++;
    const req = http.get(SERVER_URL, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        // Server is responding (404 is ok, means server is up)
        console.log('Server is ready!');
        serverReady = true;
        callback();
      } else {
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          console.error('Server did not become ready in time');
          callback(); // Try anyway
        }
      }
    });
    
    req.on('error', (err) => {
      if (attempts < maxAttempts) {
        setTimeout(check, 500);
      } else {
        console.error('Server check failed after max attempts:', err.message);
        callback(); // Try anyway
      }
    });
    
    req.setTimeout(1000, () => {
      req.destroy();
      if (attempts < maxAttempts) {
        setTimeout(check, 500);
      } else {
        console.error('Server check timed out after max attempts');
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
      serverReady = true;
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
      serverReady = true;
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
  startNextServer();
  
  // Wait a bit for the server to start
  setTimeout(() => {
    logToFile('Creating window...');
    createWindow();
  }, isDev ? 1000 : 3000);

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
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

// Handle quit request from renderer
ipcMain.handle('app-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
  app.quit();
});

