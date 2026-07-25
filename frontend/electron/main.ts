import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as http from "http";

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const isDev = !app.isPackaged;
const BACKEND_PORT = 18080;

// ---------------------------------------------------------------------------
// Python backend lifecycle
// ---------------------------------------------------------------------------

function getBackendBinary(): string {
  if (isDev) {
    // Development: assume Python is on PATH, server started manually
    return "";
  }
  // Production: PyInstaller binary bundled in extraResources
  const ext = process.platform === "win32" ? ".exe" : "";
  return path.join(process.resourcesPath, "backend", `main${ext}`);
}

async function startBackend(): Promise<void> {
  const binary = getBackendBinary();

  if (isDev || !binary) {
    console.log(
      "[Electron] Dev mode — expecting backend on http://127.0.0.1:" +
        BACKEND_PORT
    );
    return;
  }

  console.log("[Electron] Starting backend:", binary);
  backendProcess = spawn(binary, [], {
    env: {
      ...process.env,
      OCR_PORT: String(BACKEND_PORT),
      OCR_APP_HOME: path.join(app.getPath("userData"), "ocr-data"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backendProcess.stdout?.on("data", (data: Buffer) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });
  backendProcess.stderr?.on("data", (data: Buffer) => {
    console.error(`[backend:err] ${data.toString().trim()}`);
  });
  backendProcess.on("exit", (code) => {
    console.log(`[Electron] Backend exited with code ${code}`);
    backendProcess = null;
  });
}

async function waitForBackend(
  timeoutMs: number = 30000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await healthCheck();
      if (ok) {
        console.log("[Electron] Backend is healthy");
        return;
      }
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  throw new Error(`Backend did not start within ${timeoutMs}ms`);
}

function healthCheck(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${BACKEND_PORT}/api/health`,
      (res) => resolve(res.statusCode === 200)
    );
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stopBackend(): void {
  if (backendProcess) {
    console.log("[Electron] Stopping backend");
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"]);
    } else {
      backendProcess.kill("SIGTERM");
    }
    backendProcess = null;
  }
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "OCR Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0f172a",
    titleBarStyle: "hiddenInset",
    show: false,
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow = win;
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle("get-backend-url", () => {
  return `http://127.0.0.1:${BACKEND_PORT}`;
});

ipcMain.handle("show-open-dialog", async (_event, options) => {
  if (!mainWindow) return null;
  return dialog.showOpenDialog(mainWindow, options);
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  await startBackend();
  await createWindow();
  if (!isDev) {
    await waitForBackend().catch((err) => {
      console.error(err);
      dialog.showErrorBox(
        "Backend Error",
        "The OCR engine failed to start.\nPlease check your installation."
      );
    });
  }
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  stopBackend();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
