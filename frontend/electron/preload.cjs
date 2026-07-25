const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getBackendUrl: () => ipcRenderer.invoke("get-backend-url"),
  showOpenDialog: (opts) => ipcRenderer.invoke("show-open-dialog", opts),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("update-status", handler);
    return () => ipcRenderer.removeListener("update-status", handler);
  },
});
