const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require("electron");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

let mainWindow = null;
let backendProcess = null;
const isDev = !app.isPackaged;
const BACKEND_PORT = 8000;

// Sync IPC for app version (called from preload)
ipcMain.on("get-app-version-sync", (e) => {
  e.returnValue = app.getVersion() || "0.2.3";
});

// ---- Find system Python ----
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

// ---- Start backend ----
async function startBackend() {
  if (isDev) { return; }
  const python = findPython();
  if (!python) return;
  const backendDir = path.join(process.resourcesPath, "backend");
  const mainPy = path.join(backendDir, "main.py");
  if (!fs.existsSync(mainPy)) return;
  console.log("[Electron] Starting: " + python + " " + mainPy);
  backendProcess = spawn(python, [mainPy], {
    cwd: backendDir,
    env: { ...process.env, OCR_PORT: String(BACKEND_PORT), OCR_APP_HOME: path.join(app.getPath("userData"), "ocr-data") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  backendProcess.stdout.on("data", (d) => console.log("[backend]", d.toString().trim()));
  backendProcess.stderr.on("data", (d) => console.log("[backend:err]", d.toString().trim()));
  backendProcess.on("error", (e) => { backendProcess = null; });
  backendProcess.on("exit", (code) => { backendProcess = null; });
}

function stopBackend() {
  if (backendProcess) {
    process.platform === "win32" ? spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"]) : backendProcess.kill("SIGTERM");
    backendProcess = null;
  }
}

// ---- Window ----
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

  // Global shortcut: Cmd+Shift+O for screenshot OCR
  globalShortcut.register("Cmd+Shift+O", () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    const { exec } = require("child_process");
    const tmpPath = path.join(app.getPath("temp"), `ocr_shot_${Date.now()}.png`);
    exec(`screencapture -i "${tmpPath}"`, (err) => {
      if (!err && fs.existsSync(tmpPath)) mainWindow?.webContents.send("screenshot-captured", tmpPath);
    });
  });
}

// ---- IPC ----
ipcMain.handle("get-backend-url", () => "http://127.0.0.1:" + BACKEND_PORT);
ipcMain.handle("show-open-dialog", async (_, o) => mainWindow ? dialog.showOpenDialog(mainWindow, o) : null);
ipcMain.handle("trigger-screenshot", async () => {
  if (!mainWindow) return null;
  const tmpPath = path.join(app.getPath("temp"), `ocr_shot_${Date.now()}.png`);
  return new Promise((resolve) => {
    const { exec } = require("child_process");
    exec(`screencapture -i "${tmpPath}"`, (err) => {
      if (!err && fs.existsSync(tmpPath)) {
        mainWindow?.webContents.send("screenshot-captured", tmpPath);
        resolve(tmpPath);
      } else { resolve(null); }
    });
  });
});

// ---- Lifecycle ----
app.whenReady().then(async () => {
  await startBackend();
  await createWindow();
});
app.on("window-all-closed", () => { stopBackend(); if (process.platform !== "darwin") app.quit(); });
app.on("will-quit", () => { globalShortcut.unregisterAll(); stopBackend(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// Open release page in browser

ipcMain.handle("open-release-page", () => {
  shell.openExternal("https://github.com/cngithub2022/chulizi-ocr-ai/releases/latest");
});
