export {};

declare global {
  interface Window {
    electronAPI?: {
      appVersion: string;
      getBackendUrl: () => Promise<string>;
      showOpenDialog: (options: any) => Promise<any>;
      triggerScreenshot: () => Promise<string | null>;
      onScreenshotCaptured: (callback: (filepath: string) => void) => () => void;
      openReleasePage: () => void;
    };
  }
}
