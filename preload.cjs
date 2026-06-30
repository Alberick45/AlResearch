const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onAppClose: (callback) => ipcRenderer.on("app-close", (_, ...args) => callback(...args)),
  confirmClose: () => ipcRenderer.send("confirm-close")
});
