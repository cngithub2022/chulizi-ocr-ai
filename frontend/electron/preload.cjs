const { contextBridge, ipcRenderer } = require("electron");

let appVersion = "0.0.0";
try { appVersion = ipcRenderer.sendSync("get-app-version-sync"); } catch {}

contextBridge.exposeInMainWorld("electronAPI", {
  appVersion,
  getBackendUrl: () => ipcRenderer.invoke("get-backend-url"),
  showOpenDialog: (opts) => ipcRenderer.invoke("show-open-dialog", opts),
  triggerScreenshot: () => ipcRenderer.invoke("trigger-screenshot"),
  onScreenshotCaptured: (callback) => {
    const h = (_e, path) => callback(path);
    ipcRenderer.on("screenshot-captured", h);
    return () => ipcRenderer.removeListener("screenshot-captured", h);
  },
  openReleasePage: () => ipcRenderer.invoke("open-release-page"),
});
