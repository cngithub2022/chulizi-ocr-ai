export {};

declare global {
  interface Window {
    electronAPI?: {
      getBackendUrl: () => Promise<string>;
      showOpenDialog: (options: any) => Promise<any>;
      installUpdate: () => Promise<void>;
      checkForUpdates: () => void;
      onUpdateStatus: (callback: (status: any) => void) => () => void;
    };
  }
}
