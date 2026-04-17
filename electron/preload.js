const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the APIs in a safe way
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  quit: () => ipcRenderer.invoke('app-quit'),
  steam: {
    isAvailable: () => ipcRenderer.invoke('steam-is-available'),
    ensureStatsReady: (options) => ipcRenderer.invoke('steam-ensure-stats-ready', options),
    activateAchievement: (achievementApiName) =>
      ipcRenderer.invoke('steam-activate-achievement', achievementApiName),
    getStatInt: (statName) => ipcRenderer.invoke('steam-get-stat-int', statName),
    setStatInt: (statName, value) => ipcRenderer.invoke('steam-set-stat-int', statName, value),
    storeStats: (options) => ipcRenderer.invoke('steam-store-stats', options),
    leaderboardSubmitScore: (options) => ipcRenderer.invoke('steam-leaderboard-submit-score', options),
    leaderboardGetTop: (options) => ipcRenderer.invoke('steam-leaderboard-get-top', options),
    debug: (options) => ipcRenderer.invoke('steam-debug', options),
    openOverlayAchievements: () => ipcRenderer.invoke('steam-open-overlay-achievements'),
  },
});

