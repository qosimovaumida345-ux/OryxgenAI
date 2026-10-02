const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");

contextBridge.exposeInMainWorld("oryxgenDesktop", {
  isDesktop: true,
  version: "2.5.0",
  platform: process.platform,
  username: process.env.USERNAME || "",
  userProfile: process.env.USERPROFILE || "",
  desktopPath: process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "Desktop") : "",

  // File Operations
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("file:write", filePath, content),
  editFile: (filePath, oldText, newText) => ipcRenderer.invoke("file:edit", filePath, oldText, newText),
  listDir: (dirPath) => ipcRenderer.invoke("file:list", dirPath),
  getPathInfo: (targetPath) => ipcRenderer.invoke("file:path_info", targetPath),

  // Terminal Execution
  runCommand: (command, cwd) => ipcRenderer.invoke("terminal:run", command, cwd),

  // Computer Use Engine (Vision, Mouse, Keyboard, Window, Process, Audio, Glow)
  computerCall: (action, args) => ipcRenderer.invoke("computer:call", action, args),

  // High-level Computer Use helpers
  takeScreenshot: (scale = 0.8, region = null) => ipcRenderer.invoke("computer:call", "screenshot", { scale, region, base64: true }),
  ocrScreen: (region = null, language = "") => ipcRenderer.invoke("computer:call", "ocr", { region, language }),
  findImage: (templatePath, threshold = 0.8, region = null) => ipcRenderer.invoke("computer:call", "find_image", { template_path: templatePath, threshold, region }),
  getPixelColor: (x, y) => ipcRenderer.invoke("computer:call", "get_pixel_color", { x, y }),
  getCursorPosition: () => ipcRenderer.invoke("computer:call", "get_cursor_position"),

  mouseClick: (x, y, button = "left", clicks = 1) => ipcRenderer.invoke("computer:call", "mouse_click", { x, y, button, clicks }),
  mouseMove: (x, y, duration = 0.12) => ipcRenderer.invoke("computer:call", "mouse_move", { x, y, duration }),
  mouseDrag: (to_x, to_y, from_x, from_y, button = "left") => ipcRenderer.invoke("computer:call", "mouse_drag", { to_x, to_y, from_x, from_y, button }),
  mouseScroll: (clicks, x, y, horizontal = false) => ipcRenderer.invoke("computer:call", "mouse_scroll", { clicks, x, y, horizontal }),

  keyboardType: (text, useClipboard = true) => ipcRenderer.invoke("computer:call", "keyboard_type", { text, use_clipboard: useClipboard }),
  keyboardPress: (key) => ipcRenderer.invoke("computer:call", "keyboard_press", { key }),
  keyboardHotkey: (keys) => ipcRenderer.invoke("computer:call", "keyboard_hotkey", { keys }),

  listWindows: (includeMinimized = true) => ipcRenderer.invoke("computer:call", "list_windows", { include_minimized: includeMinimized }),
  focusWindow: (query) => ipcRenderer.invoke("computer:call", "focus_window", { query }),
  manageWindow: (query, action, x = 0, y = 0, width = 800, height = 600) => ipcRenderer.invoke("computer:call", "manage_window", { query, action, x, y, width, height }),
  launchApp: (command, args = "", wait = false) => ipcRenderer.invoke("computer:call", "launch_app", { command, args, wait }),
  listProcesses: (filter = "", limit = 35) => ipcRenderer.invoke("computer:call", "list_processes", { filter, limit }),
  killProcess: (pid = null, name = null) => ipcRenderer.invoke("computer:call", "kill_process", { pid, name }),

  clipboardRead: () => ipcRenderer.invoke("computer:call", "clipboard_read"),
  clipboardWrite: (text) => ipcRenderer.invoke("computer:call", "clipboard_write", { text }),
  systemInfo: () => ipcRenderer.invoke("computer:call", "system_info"),
  setVolume: (action, steps = 5) => ipcRenderer.invoke("computer:call", "set_volume", { action, steps }),

  // Visual Overlay (Subtle Cloud-Blue / Cyan Glow Rim)
  startGlow: (duration = 2.0) => ipcRenderer.invoke("computer:call", "glow_start", { duration }),
  stopGlow: () => ipcRenderer.invoke("computer:call", "glow_stop"),

  // Batch Multi-Action
  multiAction: (actions) => ipcRenderer.invoke("computer:call", "multi_action", { actions }),

  // Device Access Settings
  getDeviceSettings: () => ipcRenderer.invoke("device:get_settings"),
  setDeviceSettings: (settings) => ipcRenderer.invoke("device:set_settings", settings),

  // External Browser & Deep Link Auth
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  getAuthPort: () => ipcRenderer.invoke("auth:get_auth_port"),
  getPendingAuthDeepLink: () => ipcRenderer.invoke("auth:get_pending_deep_link"),
  onAuthDeepLink: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("auth:deep-link", handler);
    return () => ipcRenderer.removeListener("auth:deep-link", handler);
  },
});

// Also expose as electronAPI for standard compatibility
try {
  window.electronAPI = window.oryxgenDesktop;
} catch {}
