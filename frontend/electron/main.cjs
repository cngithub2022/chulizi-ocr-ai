const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

let mainWindow = null;
let backendProcess = null;
const isDev = !app.isPackaged;
const BACKEND_PORT = 8000;

// =====================================================================
// Auto-Updater
// =====================================================================

function setupAutoUpdater() {
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = console;

    autoUpdater.on("checking-for-update", () => {
      mainWindow?.webContents.send("update-status", { status: "checking" });
    });
    autoUpdater.on("update-available", (info) => {
      mainWindow?.webContents.send("update-status", {
        status: "available",
        version: info.version,
      });
    });
    autoUpdater.on("update-not-available", () => {
      mainWindow?.webContents.send("update-status", { status: "not-available" });
    });
    autoUpdater.on("download-progress", (p) => {
      mainWindow?.webContents.send("update-status", {
        status: "downloading",
        percent: Math.round(p.percent),
      });
    });
    autoUpdater.on("update-downloaded", (info) => {
      mainWindow?.webContents.send("update-status", {
        status: "downloaded",
        version: info.version,
      });
    });
    autoUpdater.on("error", (err) => {
      console.error("[autoUpdater]", err.message);
      mainWindow?.webContents.send("update-status", { status: "error", message: err.message });
    });

    // Check for updates 10s after app starts
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((e) => console.log("[autoUpdater] Check skipped:", e.message));
    }, 10000);

    // Periodic check every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4 * 60 * 60 * 1000);

    console.log("[Electron] Auto-updater configured (provider: github)");

    // IPC handlers for manual check & install
    ipcMain.handle("check-for-updates", async () => {
      try { return await autoUpdater.checkForUpdates(); } catch { return null; }
    });
    ipcMain.handle("install-update", () => {
      autoUpdater.quitAndInstall();
    });

  } catch (e) {
    console.log("[Electron] electron-updater not available:", e.message);
  }
}

// =====================================================================
// Python Backend
// =====================================================================

function findPython() {
  const candidates = [
    "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
  ];
  for (const p of candidates) {
    try { execFileSync(p, ["--version"], { stdio: "ignore" }); return p; } catch {}
  }
  return "";
}

async function startBackend() {
  if (isDev) { console.log("[Electron] Dev mode — backend expected on :8000"); return; }
  const python = findPython();
  if (!python) { console.log("[Electron] Python not found"); return; }
  const backendDir = path.join(process.resourcesPath, "backend");
  const mainPy = path.join(backendDir, "main.py");
  if (!fs.existsSync(mainPy)) { console.log("[Electron] " + mainPy + " not found"); return; }
  console.log("[Electron] Starting: " + python + " " + mainPy);
  backendProcess = spawn(python, [mainPy], {
    cwd: backendDir,
    env: { ...process.env, OCR_PORT: String(BACKEND_PORT), OCR_APP_HOME: path.join(app.getPath("userData"), "ocr-data") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  backendProcess.stdout.on("data", (d) => console.log("[backend]", d.toString().trim()));
  backendProcess.stderr.on("data", (d) => console.log("[backend:err]", d.toString().trim()));
  backendProcess.on("error", (e) => { console.error("[Electron] Spawn error:", e.message); backendProcess = null; });
  backendProcess.on("exit", (code) => { if (code && code !== 0) console.error("[Electron] Backend exited code", code); backendProcess = null; });
}

// =====================================================================
// Health / Lifecycle
// =====================================================================

function healthCheck() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:" + BACKEND_PORT + "/api/health", (res) => resolve(res.statusCode === 200));
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForBackend(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < (timeoutMs || 30000)) {
    try { if (await healthCheck()) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
}

function stopBackend() {
  if (backendProcess) {
    process.platform === "win32" ? spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"]) : backendProcess.kill("SIGTERM");
    backendProcess = null;
  }
}

// =====================================================================
// Window / IPC
// =====================================================================

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 860, minWidth: 900, minHeight: 600,
    title: "OCR Desktop",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false },
    backgroundColor: "#0f172a",
    titleBarStyle: "hiddenInset",
    show: false,
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(isDev ? "http://localhost:5173" : "file://" + path.join(__dirname, "..", "dist", "index.html"));
}

ipcMain.handle("get-backend-url", () => "http://127.0.0.1:" + BACKEND_PORT);
ipcMain.handle("show-open-dialog", async (_, o) => mainWindow ? dialog.showOpenDialog(mainWindow, o) : null);

// =====================================================================
// App Lifecycle
// =====================================================================

app.whenReady().then(async () => {
  await startBackend();
  await createWindow();
  setupAutoUpdater();
  if (!isDev) waitForBackend().catch((e) => console.error(e));
});

app.on("window-all-closed", () => { stopBackend(); if (process.platform !== "darwin") app.quit(); });
app.on("will-quit", () => stopBackend());
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
