import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getBackendUrl: (): Promise<string> =>
    ipcRenderer.invoke("get-backend-url"),
  showOpenDialog: (options: any): Promise<any> =>
    ipcRenderer.invoke("show-open-dialog", options),
});
