const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApi', {
  /**
  * From renderer to main
  **/ 
  getCurrentUrl: async () => { return await ipcRenderer.invoke('invoke:current-url'); },
  getAppLocale: async () => { return await ipcRenderer.invoke('invoke:app-locale'); },
  showConfirmBox: async (msg, title, buttons) => { return await ipcRenderer.invoke('invoke:dialogs:confirm-box', msg, title, buttons); }, 
  renderPageToImage: async(path) => { return await ipcRenderer.invoke('invoke:render-page', path); },
  notifyPageNavigated: (page) =>  ipcRenderer.send('on:page-navigated', page),
  showMessageBox: (type, msg, title) => ipcRenderer.send('on:dialogs:msg-box', type, msg, title),
  showFatalErrorBox: (msg) => ipcRenderer.invoke('on:dialogs:fatal', msg),
  notifyThemeChanged: (theme) =>  ipcRenderer.send('on:theme-changed', theme),
  notifyNavBarRefreshed: (nav) => ipcRenderer.send('on:nav-refreshed', nav),

  /**
  * From main to renderer
  **/ 
  onRequestNavigateToPage: (callback) => ipcRenderer.on('request:navigate-to-page', callback),
  onRequestShowExceptionDialog: (callback) => ipcRenderer.on('request:show-exception', callback),
  onRequestSetTheme: (callback) => ipcRenderer.on('request:set-theme', callback),
  onRequestSetLocale: (callback) => ipcRenderer.on('request:set-locale', callback),
  onRequestLogout: (callback) => ipcRenderer.on('request:logout', callback)
})