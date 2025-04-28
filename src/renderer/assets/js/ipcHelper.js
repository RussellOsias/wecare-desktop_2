const { ipcRenderer } = require('electron');
window.ipcRenderer = ipcRenderer; // Attach ipcRenderer to the global window object