const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { execSync, spawn } = require("child_process");

// Register custom protocol: oryxgen://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("oryxgen", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("oryxgen");
}

const SETTINGS_FILE = path.join(app.getPath("userData"), "device_settings.json");
const PYTHON_SCRIPT = path.join(__dirname, "computer_use_engine.py");
const ICON_PATH = fs.existsSync(path.join(__dirname, "icon.ico"))
  ? path.join(__dirname, "icon.ico")
  : path.join(__dirname, "dist", "Logo.png");

// Default Device Settings
const DEFAULT_SETTINGS = {
  allowComputerUse: true,
  allowScreenVision: true,
  allowTerminal: true,
  allowFilesystem: true,
  autonomousMode: true,
  glowIndicator: true,
  defaultWorkspace: path.join(process.env.USERPROFILE || process.env.HOME || ".", "Desktop"),
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) };
    }
  } catch { }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch { }
}

let currentSettings = loadSettings();
let mainWindow = null;
let tray = null;

function runPythonEngine(action, args = {}) {
  try {
    const argsJson = JSON.stringify(args);
    const cmd = `python "${PYTHON_SCRIPT}" ${action} ${JSON.stringify(argsJson)}`;
    const output = execSync(cmd, {
      timeout: 35000,
      encoding: "utf-8",
      windowsHide: true,
    });
    return JSON.parse(output.trim());
  } catch (err) {
    return { error: `Computer Use Engine xatoligi (${action}): ${err.message}` };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 740,
    title: "Oryxgen AI — Autonomous Desktop & CodeX Platform",
    backgroundColor: "#09090b",
    icon: ICON_PATH,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const indexPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL("https://avg-ai-creator.site/app");
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    const initialUrl = process.argv.find((arg) => typeof arg === "string" && arg.startsWith("oryxgen://"));
    if (initialUrl) {
      setTimeout(() => handleDeepLinkUrl(initialUrl), 600);
    }
  });

  // Tray Setup
  try {
    tray = new Tray(ICON_PATH);
    const contextMenu = Menu.buildFromTemplate([
      { label: "Oryxgen AI — Open App", click: () => { mainWindow.show(); mainWindow.focus(); } },
      { type: "separator" },
      { label: "Exit", click: () => { app.isQuitting = true; app.quit(); } },
    ]);
    tray.setToolTip("Oryxgen AI Desktop Platform");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
  } catch { }

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── IPC Handlers ────────────────────────────────────────────────────────

// 📁 File Operations
ipcMain.handle("file:read", async (e, filePath) => {
  if (!currentSettings.allowFilesystem) return { error: "Fayl tizimi ruxsati o'chirilgan." };
  try {
    const full = path.resolve(filePath);
    if (!fs.existsSync(full)) return { error: `Fayl topilmadi: ${full}` };
    const content = fs.readFileSync(full, "utf-8");
    return { success: true, content, length: content.length, path: full };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("file:write", async (e, filePath, content) => {
  if (!currentSettings.allowFilesystem) return { error: "Fayl tizimi ruxsati o'chirilgan." };
  try {
    const full = path.resolve(filePath);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
    return { success: true, path: full, size: content.length };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("file:edit", async (e, filePath, oldText, newText) => {
  if (!currentSettings.allowFilesystem) return { error: "Fayl tizimi ruxsati o'chirilgan." };
  try {
    const full = path.resolve(filePath);
    if (!fs.existsSync(full)) return { error: `Fayl topilmadi: ${full}` };
    const cur = fs.readFileSync(full, "utf-8");
    if (!cur.includes(oldText)) return { error: "Eski matn faylda topilmadi." };
    const updated = cur.replace(oldText, newText);
    fs.writeFileSync(full, updated, "utf-8");
    return { success: true, path: full };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("file:list", async (e, dirPath) => {
  if (!currentSettings.allowFilesystem) return { error: "Fayl tizimi ruxsati o'chirilgan." };
  try {
    const full = path.resolve(dirPath || ".");
    if (!fs.existsSync(full)) return { error: `Papka topilmadi: ${full}` };
    const items = fs.readdirSync(full, { withFileTypes: true });
    const list = items.map((i) => ({
      name: i.name,
      isDirectory: i.isDirectory(),
      isFile: i.isFile(),
    }));
    return { success: true, path: full, count: list.length, items: list };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("file:path_info", async (e, targetPath) => {
  try {
    const full = path.resolve(targetPath);
    const exists = fs.existsSync(full);
    if (!exists) return { exists: false, path: full };
    const stat = fs.statSync(full);
    return {
      exists: true,
      path: full,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      size: stat.size,
    };
  } catch (err) {
    return { error: err.message };
  }
});

// ⚡ Terminal Execution
ipcMain.handle("terminal:run", async (e, command, cwd) => {
  if (!currentSettings.allowTerminal) return { error: "Terminal ruxsati o'chirilgan." };
  try {
    const workDir = cwd ? path.resolve(cwd) : currentSettings.defaultWorkspace;
    const output = execSync(command, {
      cwd: fs.existsSync(workDir) ? workDir : undefined,
      timeout: 60000,
      encoding: "utf-8",
      shell: "powershell.exe",
    });
    return { success: true, output: (output || "").trim() };
  } catch (err) {
    return { error: `Terminal xatosi: ${(err.stderr || err.message || "").trim()}`, stdout: (err.stdout || "").trim() };
  }
});

// 🖱️ & 📸 Complete Computer Use Dispatcher
ipcMain.handle("computer:call", async (e, action, args = {}) => {
  // Permission checks
  if (["mouse_click", "mouse_move", "mouse_drag", "mouse_scroll", "keyboard_type", "keyboard_press", "keyboard_hotkey"].includes(action)) {
    if (!currentSettings.allowComputerUse) return { error: "Computer Use ruxsati sozlamalarda o'chirilgan." };
  }
  if (["screenshot", "ocr", "find_image"].includes(action)) {
    if (!currentSettings.allowScreenVision) return { error: "Screen Vision ruxsati sozlamalarda o'chirilgan." };
  }

  return runPythonEngine(action, args);
});

// 🛡️ Device Settings
ipcMain.handle("device:get_settings", () => currentSettings);
ipcMain.handle("device:set_settings", (e, newSettings) => {
  currentSettings = { ...currentSettings, ...newSettings };
  saveSettings(currentSettings);
  return { success: true, settings: currentSettings };
});

// 🌐 External Browser Launcher
ipcMain.handle("app:open-external", async (e, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

// 🔗 Deep Link Protocol Handler
function handleDeepLinkUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return;
  try {
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl.startsWith("oryxgen://")) return;

    const urlObj = new URL(cleanUrl);
    const token = urlObj.searchParams.get("token") || "";
    const userRaw = urlObj.searchParams.get("user");
    let user = null;
    if (userRaw) {
      try {
        user = JSON.parse(decodeURIComponent(userRaw));
      } catch {
        try {
          user = JSON.parse(userRaw);
        } catch {}
      }
    }

    if (token && mainWindow) {
      mainWindow.webContents.send("auth:deep-link", { token, user });
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  } catch (err) {
    console.error("Deep link parse error:", err);
  }
}

// Single Instance Lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    const deepLink = commandLine.find((arg) => arg.startsWith("oryxgen://"));
    if (deepLink) {
      handleDeepLinkUrl(deepLink);
    }
  });
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLinkUrl(url);
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

