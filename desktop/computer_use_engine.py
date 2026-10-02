#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
  ORYXGEN AI — ADVANCED NATIVE COMPUTER USE & VISION ENGINE
  Industrial-grade Desktop Automation, Vision, OCR, Window & Process Control
  Designed for autonomous agents with live visual feedback & full system access.
═══════════════════════════════════════════════════════════════════════════════
"""

import sys
import os
import io
import json
import time
import base64
import ctypes
import ctypes.wintypes
import tempfile
import subprocess
import threading
from typing import Any, Dict, List, Optional, Tuple, Union

# Ensure UTF-8 streaming
for stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

# Win32 API handles
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
gdi32 = ctypes.windll.gdi32
shell32 = ctypes.windll.shell32

# Win32 Constants
SW_HIDE = 0
SW_SHOWNORMAL = 1
SW_SHOWMINIMIZED = 2
SW_SHOWMAXIMIZED = 3
SW_RESTORE = 9

GWL_EXSTYLE = -20
WS_EX_TRANSPARENT = 0x00000020
WS_EX_LAYERED = 0x00080000
WS_EX_TOOLWINDOW = 0x00000080
WS_EX_TOPMOST = 0x00000008
WS_EX_NOACTIVATE = 0x08000000

HWND_TOPMOST = -1
SWP_NOSIZE = 0x0001
SWP_NOMOVE = 0x0002
SWP_NOACTIVATE = 0x0010
SWP_SHOWWINDOW = 0x0040

def attach_interactive_desktop():
    """Ensure the calling thread is attached to the visible user desktop."""
    try:
        hdesk = user32.OpenDesktopW("default", 0, False, 0x01FF)
        if hdesk:
            user32.SetThreadDesktop(hdesk)
    except Exception:
        pass

attach_interactive_desktop()

import pyautogui
import pyperclip
import psutil
import mss
import mss.tools
from PIL import Image

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.03

# ═══════════════════════════════════════════════════════════════════════════════
# 1. LIVE SCREEN GLOW OVERLAY (Subtle Cloud-Blue / Cyan Perimeter Rim)
# ═══════════════════════════════════════════════════════════════════════════════

class ScreenGlowOverlay:
    """
    Creates a subtle, elegant, cloud-blue/cyan glowing perimeter border
    around the monitor edges when the AI Agent is actively controlling the computer.
    Completely transparent to mouse clicks (WS_EX_TRANSPARENT).
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.is_active = False
        self._thread = None
        self._stop_event = threading.Event()

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def start(self, duration: Optional[float] = None):
        """Show the subtle cloud-blue rim."""
        with self._lock:
            if self.is_active:
                return
            self.is_active = True
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_overlay, args=(duration,), daemon=True)
            self._thread.start()

    def stop(self):
        """Fade out and close the glowing rim."""
        with self._lock:
            if not self.is_active:
                return
            self._stop_event.set()
            self.is_active = False

    def _run_overlay(self, duration: Optional[float]):
        try:
            import tkinter as tk

            root = tk.Tk()
            root.overrideredirect(True)
            root.attributes("-topmost", True)
            root.attributes("-alpha", 0.75)

            sw = root.winfo_screenwidth()
            sh = root.winfo_screenheight()
            root.geometry(f"{sw}x{sh}+0+0")

            # Transparent key background
            transparent_color = "#000001"
            root.configure(bg=transparent_color)
            root.attributes("-transparentcolor", transparent_color)

            # Make window click-through via Win32 API
            root.update_idletasks()
            hwnd = root.winfo_id()
            ex_style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            user32.SetWindowLongW(
                hwnd,
                GWL_EXSTYLE,
                ex_style | WS_EX_TRANSPARENT | WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE
            )

            canvas = tk.Canvas(root, width=sw, height=sh, bg=transparent_color, highlightthickness=0)
            canvas.pack(fill="both", expand=True)

            # Draw subtle, cloud-blue / cyan border with soft corners
            # Outer rim: #00f0ff (cyan) -> Inner rim: #38bdf8 (cloud blue)
            border_w = 4
            glow_color = "#38bdf8"
            accent_color = "#00f0ff"

            # Top bar
            canvas.create_rectangle(0, 0, sw, border_w, fill=accent_color, outline="")
            # Bottom bar
            canvas.create_rectangle(0, sh - border_w, sw, sh, fill=accent_color, outline="")
            # Left bar
            canvas.create_rectangle(0, 0, border_w, sh, fill=accent_color, outline="")
            # Right bar
            canvas.create_rectangle(sw - border_w, 0, sw, sh, fill=accent_color, outline="")

            # Subtle Corner Accents (16px x 16px soft brackets)
            corner_len = 36
            corner_w = 6
            # Top-Left
            canvas.create_line(0, 0, corner_len, 0, fill=glow_color, width=corner_w)
            canvas.create_line(0, 0, 0, corner_len, fill=glow_color, width=corner_w)
            # Top-Right
            canvas.create_line(sw - corner_len, 0, sw, 0, fill=glow_color, width=corner_w)
            canvas.create_line(sw, 0, sw, corner_len, fill=glow_color, width=corner_w)
            # Bottom-Left
            canvas.create_line(0, sh, corner_len, sh, fill=glow_color, width=corner_w)
            canvas.create_line(0, sh - corner_len, 0, sh, fill=glow_color, width=corner_w)
            # Bottom-Right
            canvas.create_line(sw - corner_len, sh, sw, sh, fill=glow_color, width=corner_w)
            canvas.create_line(sw, sh - corner_len, sw, sh, fill=glow_color, width=corner_w)

            start_t = time.time()
            while not self._stop_event.is_set():
                if duration and (time.time() - start_t) > duration:
                    break
                root.update()
                time.sleep(0.04)

            root.destroy()
        except Exception:
            pass
        finally:
            self.is_active = False

def trigger_glow(duration: float = 1.2):
    """Trigger the glowing perimeter during an agent action."""
    overlay = ScreenGlowOverlay.get_instance()
    overlay.start(duration=duration)

# ═══════════════════════════════════════════════════════════════════════════════
# 2. VISION & SCREEN PERCEPTION MODULE
# ═══════════════════════════════════════════════════════════════════════════════

def get_screen_resolution() -> Dict[str, int]:
    attach_interactive_desktop()
    size = pyautogui.size()
    return {"width": size.width, "height": size.height}

def capture_screen(
    output_path: Optional[str] = None,
    region: Optional[Dict[str, int]] = None,
    monitor_idx: int = 1,
    scale: float = 1.0,
    return_base64: bool = False
) -> Dict[str, Any]:
    """Capture full screen or region with high quality and optional scaling."""
    attach_interactive_desktop()
    trigger_glow(1.0)

    if not output_path:
        temp_dir = tempfile.gettempdir()
        timestamp = int(time.time() * 1000)
        output_path = os.path.join(temp_dir, f"oryxgen_screen_{timestamp}.png")

    with mss.MSS() as sct:
        if region:
            mon = {
                "left": int(region["x"]),
                "top": int(region["y"]),
                "width": int(region["width"]),
                "height": int(region["height"]),
            }
        else:
            idx = max(0, min(monitor_idx, len(sct.monitors) - 1))
            mon = sct.monitors[idx]

        sct_img = sct.grab(mon)
        img = Image.frombytes("RGB", sct_img.size, sct_img.rgb)

    if scale and 0.1 <= scale < 0.99:
        nw = max(1, int(img.width * scale))
        nh = max(1, int(img.height * scale))
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img.save(output_path, format="PNG", optimize=True)
    file_size = os.path.getsize(output_path)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")

    res = get_screen_resolution()
    return {
        "success": True,
        "path": output_path,
        "base64": b64_str,
        "data_url": f"data:image/png;base64,{b64_str}",
        "width": img.width,
        "height": img.height,
        "file_size": file_size,
        "screen_width": res["width"],
        "screen_height": res["height"]
    }

def ocr_screen(region: Optional[Dict[str, int]] = None, language: str = "") -> Dict[str, Any]:
    """
    Extracts text from the screen using Windows built-in high-accuracy OCR.
    Works with Uzbek, English, Russian and all Windows installed OCR languages.
    """
    attach_interactive_desktop()
    trigger_glow(1.2)

    tmp_png = os.path.join(tempfile.gettempdir(), f"oryxgen_ocr_{int(time.time()*1000)}.png")
    cap = capture_screen(output_path=tmp_png, region=region)
    if not cap.get("success"):
        return {"success": False, "error": "Failed to capture screen for OCR."}

    lang_code = f'[Windows.Globalization.Language]::new("{language}")' if language else '[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()'
    engine_init = f'$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage({lang_code})' if language else '$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()'

    ps_script = f"""
    Add-Type -AssemblyName "System.Runtime.WindowsRuntime"
    [void][Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
    [void][Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
    [void][Windows.Storage.StorageFile,Windows.Foundation,ContentType=WindowsRuntime]

    $asyncMethods = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {{ $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethodDefinition }}

    function Await($op, [Type]$type) {{
        $m = ($asyncMethods | Select-Object -First 1).MakeGenericMethod($type)
        $t = $m.Invoke($null, @($op)); $t.Wait() | Out-Null; return $t.Result
    }}

    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync("{tmp_png.replace('\\', '\\\\')}")) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    {engine_init}
    if ($engine -eq $null) {{
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    }}
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    
    $lines = @()
    foreach ($line in $result.Lines) {{
        $words = @()
        foreach ($w in $line.Words) {{
            $words += @{{ text = $w.Text; x = $w.BoundingRect.X; y = $w.BoundingRect.Y; width = $w.BoundingRect.Width; height = $w.BoundingRect.Height }}
        }}
        $lines += @{{ text = $line.Text; words = $words }}
    }}
    
    @{{ full_text = $result.Text; lines = $lines }} | ConvertTo-Json -Depth 5 -Compress
    $stream.Dispose()
    """

    try:
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=20,
            encoding="utf-8"
        )
        out = proc.stdout.strip()
        if not out or proc.returncode != 0:
            return {"success": False, "error": f"OCR returned no data. Stderr: {proc.stderr.strip()}"}

        parsed = json.loads(out)
        return {
            "success": True,
            "text": parsed.get("full_text", ""),
            "lines": parsed.get("lines", []),
            "char_count": len(parsed.get("full_text", ""))
        }
    except Exception as ex:
        return {"success": False, "error": str(ex)}
    finally:
        try:
            if os.path.exists(tmp_png):
                os.remove(tmp_png)
        except Exception:
            pass

def find_image_on_screen(template_path: str, threshold: float = 0.8, region: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    """Search the screen for a template image using OpenCV template matching."""
    attach_interactive_desktop()
    trigger_glow(0.8)

    try:
        import cv2
        import numpy as np
    except ImportError:
        return {"success": False, "error": "OpenCV (cv2) kutubxonasi o'rnatilmagan."}

    if not os.path.isfile(template_path):
        return {"success": False, "error": f"Template rasm topilmadi: {template_path}"}

    with mss.MSS() as sct:
        if region:
            mon = {"left": int(region["x"]), "top": int(region["y"]), "width": int(region["width"]), "height": int(region["height"])}
        else:
            mon = sct.monitors[1]
        sct_img = sct.grab(mon)
        screen_np = np.array(sct_img)

    screen_gray = cv2.cvtColor(screen_np, cv2.COLOR_BGRA2GRAY)
    template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
    if template is None:
        return {"success": False, "error": f"Template rasmini o'qib bo'lmadi: {template_path}"}

    th, tw = template.shape[:2]
    res = cv2.matchTemplate(screen_gray, template, cv2.TM_CCOEFF_NORMED)
    locs = np.where(res >= threshold)

    matches = []
    ox = int(region["x"]) if region else 0
    oy = int(region["y"]) if region else 0

    for pt in zip(*locs[::-1]):
        mx, my = int(pt[0]) + ox, int(pt[1]) + oy
        matches.append({
            "x": mx,
            "y": my,
            "width": tw,
            "height": th,
            "center_x": mx + tw // 2,
            "center_y": my + th // 2,
            "confidence": round(float(res[pt[1], pt[0]]), 4)
        })

    # Sort and remove overlapping bounding boxes
    matches.sort(key=lambda m: -m["confidence"])
    unique_matches = []
    for m in matches:
        if not any(abs(m["center_x"] - u["center_x"]) < 10 and abs(m["center_y"] - u["center_y"]) < 10 for u in unique_matches):
            unique_matches.append(m)

    return {
        "success": True,
        "matches": unique_matches,
        "count": len(unique_matches),
        "best_match": unique_matches[0] if unique_matches else None
    }

def get_pixel_color(x: int, y: int) -> Dict[str, Any]:
    attach_interactive_desktop()
    with mss.MSS() as sct:
        mon = {"left": int(x), "top": int(y), "width": 1, "height": 1}
        px = sct.grab(mon)
        r, g, b = px.pixel(0, 0)[:3]
    return {
        "success": True,
        "x": x, "y": y,
        "rgb": [r, g, b],
        "hex": f"#{r:02x}{g:02x}{b:02x}"
    }

def get_cursor_position() -> Dict[str, Any]:
    attach_interactive_desktop()
    pos = pyautogui.position()
    res = pyautogui.size()
    return {
        "success": True,
        "x": pos.x,
        "y": pos.y,
        "screen_width": res.width,
        "screen_height": res.height
    }

# ═══════════════════════════════════════════════════════════════════════════════
# 3. PRECISION MOUSE CONTROL MODULE
# ═══════════════════════════════════════════════════════════════════════════════

def mouse_move(x: int, y: int, duration: float = 0.12, tween: str = "easeOutQuad") -> Dict[str, Any]:
    attach_interactive_desktop()
    trigger_glow(duration + 0.3)
    pyautogui.moveTo(int(x), int(y), duration=float(duration))
    pos = pyautogui.position()
    return {"success": True, "x": pos.x, "y": pos.y}

def mouse_click(x: Optional[int] = None, y: Optional[int] = None, button: str = "left", clicks: int = 1) -> Dict[str, Any]:
    attach_interactive_desktop()
    trigger_glow(0.6)
    if x is not None and y is not None:
        pyautogui.moveTo(int(x), int(y), duration=0.08)
    pyautogui.click(button=button, clicks=int(clicks))
    pos = pyautogui.position()
    return {"success": True, "clicked_at": {"x": pos.x, "y": pos.y}, "button": button, "clicks": clicks}

def mouse_down(button: str = "left") -> Dict[str, Any]:
    attach_interactive_desktop()
    pyautogui.mouseDown(button=button)
    return {"success": True, "button": button}

def mouse_up(button: str = "left") -> Dict[str, Any]:
    attach_interactive_desktop()
    pyautogui.mouseUp(button=button)
    return {"success": True, "button": button}

def mouse_drag(to_x: int, to_y: int, from_x: Optional[int] = None, from_y: Optional[int] = None, button: str = "left", duration: float = 0.3) -> Dict[str, Any]:
    attach_interactive_desktop()
    trigger_glow(duration + 0.5)
    if from_x is not None and from_y is not None:
        pyautogui.moveTo(int(from_x), int(from_y), duration=0.08)
    pyautogui.dragTo(int(to_x), int(to_y), duration=float(duration), button=button)
    pos = pyautogui.position()
    return {"success": True, "end_pos": {"x": pos.x, "y": pos.y}}

def mouse_scroll(clicks: int, x: Optional[int] = None, y: Optional[int] = None, horizontal: bool = False) -> Dict[str, Any]:
    attach_interactive_desktop()
    trigger_glow(0.5)
    if x is not None and y is not None:
        pyautogui.moveTo(int(x), int(y), duration=0.08)
    if horizontal:
        pyautogui.hscroll(int(clicks))
    else:
        pyautogui.scroll(int(clicks))
    return {"success": True, "scroll": clicks, "horizontal": horizontal}

# ═══════════════════════════════════════════════════════════════════════════════
# 4. KEYBOARD CONTROL & SHORTCUTS MODULE
# ═══════════════════════════════════════════════════════════════════════════════

def keyboard_type(text: str, use_clipboard: bool = True, interval: float = 0.02) -> Dict[str, Any]:
    """Types text directly or via clipboard for Unicode/emojis/code safety."""
    attach_interactive_desktop()
    trigger_glow(0.8)

    if use_clipboard:
        old_clip = ""
        try:
            old_clip = pyperclip.paste()
        except Exception:
            pass
        pyperclip.copy(text)
        time.sleep(0.04)
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.04)
        try:
            if old_clip:
                pyperclip.copy(old_clip)
        except Exception:
            pass
    else:
        pyautogui.write(text, interval=float(interval))
    return {"success": True, "typed_length": len(text)}

def keyboard_press(key: str) -> Dict[str, Any]:
    attach_interactive_desktop()
    trigger_glow(0.4)
    key_clean = key.lower().strip()
    key_map = {
        "enter": "enter", "return": "enter", "esc": "escape", "escape": "escape",
        "tab": "tab", "space": "space", "backspace": "backspace", "delete": "delete",
        "del": "delete", "up": "up", "down": "down", "left": "left", "right": "right",
        "home": "home", "end": "end", "pageup": "pageup", "pagedown": "pagedown",
        "win": "win", "windows": "win", "cmd": "win"
    }
    target = key_map.get(key_clean, key_clean)
    pyautogui.press(target)
    return {"success": True, "key": target}

def keyboard_hotkey(keys: Union[List[str], str]) -> Dict[str, Any]:
    attach_interactive_desktop()
    trigger_glow(0.5)
    if isinstance(keys, str):
        keys = [k.strip() for k in keys.split("+") if k.strip()]
    pyautogui.hotkey(*keys)
    return {"success": True, "hotkey": "+".join(keys)}

def keyboard_key_down(key: str) -> Dict[str, Any]:
    attach_interactive_desktop()
    pyautogui.keyDown(key)
    return {"success": True, "key": key}

def keyboard_key_up(key: str) -> Dict[str, Any]:
    attach_interactive_desktop()
    pyautogui.keyUp(key)
    return {"success": True, "key": key}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. WINDOW & APPLICATION MANAGEMENT MODULE
# ═══════════════════════════════════════════════════════════════════════════════

class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)

def list_windows(include_minimized: bool = True) -> Dict[str, Any]:
    """Lists all open visible desktop application windows with bounds and PIDs."""
    attach_interactive_desktop()
    windows = []

    def enum_cb(hwnd, _):
        if user32.IsWindowVisible(hwnd) or (include_minimized and user32.IsIconic(hwnd)):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value.strip()
                if title:
                    pid = ctypes.wintypes.DWORD()
                    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                    pname = ""
                    try:
                        pname = psutil.Process(pid.value).name()
                    except Exception:
                        pass

                    r = RECT()
                    user32.GetWindowRect(hwnd, ctypes.byref(r))

                    windows.append({
                        "hwnd": hwnd,
                        "title": title,
                        "pid": pid.value,
                        "process": pname,
                        "bounds": {
                            "x": r.left,
                            "y": r.top,
                            "width": max(0, r.right - r.left),
                            "height": max(0, r.bottom - r.top)
                        },
                        "is_minimized": bool(user32.IsIconic(hwnd)),
                        "is_maximized": bool(user32.IsZoomed(hwnd))
                    })
        return True

    user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
    return {"success": True, "windows": windows, "count": len(windows)}

def focus_window(query: Union[str, int]) -> Dict[str, Any]:
    """Brings a window to the foreground and focuses it."""
    attach_interactive_desktop()
    trigger_glow(0.8)

    q_str = str(query).lower().strip()
    target_hwnd = None

    def enum_cb(hwnd, _):
        nonlocal target_hwnd
        if user32.IsWindowVisible(hwnd) or user32.IsIconic(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value.strip()
                pid = ctypes.wintypes.DWORD()
                user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                if q_str in title.lower() or q_str == str(pid.value) or q_str == str(hwnd):
                    target_hwnd = hwnd
                    return False
        return True

    user32.EnumWindows(WNDENUMPROC(enum_cb), 0)

    if target_hwnd:
        # Restore if minimized
        user32.ShowWindow(target_hwnd, SW_RESTORE)
        cur_tid = kernel32.GetCurrentThreadId()
        target_tid = user32.GetWindowThreadProcessId(target_hwnd, None)
        user32.AttachThreadInput(cur_tid, target_tid, True)
        user32.BringWindowToTop(target_hwnd)
        user32.SetForegroundWindow(target_hwnd)
        user32.AttachThreadInput(cur_tid, target_tid, False)
        return {"success": True, "hwnd": target_hwnd}
    return {"success": False, "error": f"Oyna topilmadi: {query}"}

def manage_window(query: Union[str, int], action: str, x: int = 0, y: int = 0, width: int = 800, height: int = 600) -> Dict[str, Any]:
    """Maximize, minimize, restore, move/resize, or close a window."""
    attach_interactive_desktop()
    trigger_glow(0.8)

    f = focus_window(query)
    if not f.get("success"):
        return f
    hwnd = f["hwnd"]

    act = action.lower().strip()
    if act == "maximize":
        user32.ShowWindow(hwnd, SW_SHOWMAXIMIZED)
    elif act == "minimize":
        user32.ShowWindow(hwnd, SW_SHOWMINIMIZED)
    elif act == "restore":
        user32.ShowWindow(hwnd, SW_RESTORE)
    elif act == "close":
        # WM_CLOSE = 0x0010
        user32.PostMessageW(hwnd, 0x0010, 0, 0)
    elif act in ("move", "resize", "move_resize"):
        user32.SetWindowPos(hwnd, 0, int(x), int(y), int(width), int(height), SWP_NOACTIVATE | SWP_SHOWWINDOW)
    else:
        return {"success": False, "error": f"Unknown action: {action}"}

    return {"success": True, "action": act, "hwnd": hwnd}

def launch_app(target: str, args: str = "", wait: bool = False) -> Dict[str, Any]:
    """Launches any application, file path, URL, or shell executable."""
    attach_interactive_desktop()
    trigger_glow(1.2)

    try:
        full_cmd = f'"{target}" {args}'.strip() if args else target
        if wait:
            proc = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=60)
            return {"success": True, "returncode": proc.returncode, "stdout": proc.stdout, "stderr": proc.stderr}
        else:
            proc = subprocess.Popen(full_cmd, shell=True)
            return {"success": True, "pid": proc.pid, "command": target}
    except Exception as ex:
        return {"success": False, "error": str(ex)}

def list_processes(filter_name: str = "", limit: int = 35) -> Dict[str, Any]:
    processes = []
    f_lower = filter_name.lower().strip()
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
        try:
            info = p.info
            name = info.get('name') or ''
            if not f_lower or f_lower in name.lower():
                mem_mb = round((info.get('memory_info').rss or 0) / (1024 * 1024), 1)
                processes.append({
                    "pid": info.get('pid'),
                    "name": name,
                    "cpu_percent": info.get('cpu_percent'),
                    "memory_mb": mem_mb
                })
        except Exception:
            continue

    processes.sort(key=lambda x: -x["memory_mb"])
    return {"success": True, "processes": processes[:limit], "total": len(processes)}

def kill_process(pid: Optional[int] = None, name: Optional[str] = None, force: bool = True) -> Dict[str, Any]:
    terminated = 0
    if pid:
        try:
            p = psutil.Process(int(pid))
            if force:
                p.kill()
            else:
                p.terminate()
            return {"success": True, "pid": pid}
        except Exception as ex:
            return {"success": False, "error": str(ex)}

    if name:
        target = name.lower().strip()
        for p in psutil.process_iter(['pid', 'name']):
            try:
                if target in (p.info['name'] or '').lower():
                    if force:
                        p.kill()
                    else:
                        p.terminate()
                    terminated += 1
            except Exception:
                continue
        return {"success": True, "terminated_count": terminated}

    return {"success": False, "error": "PID or name is required."}

# ═══════════════════════════════════════════════════════════════════════════════
# 6. SYSTEM METRICS & CLIPBOARD
# ═══════════════════════════════════════════════════════════════════════════════

def clipboard_read() -> Dict[str, Any]:
    text = ""
    try:
        text = pyperclip.paste()
    except Exception:
        pass
    return {"success": True, "text": text}

def clipboard_write(text: str) -> Dict[str, Any]:
    try:
        pyperclip.copy(text)
        return {"success": True, "length": len(text)}
    except Exception as ex:
        return {"success": False, "error": str(ex)}

def system_info() -> Dict[str, Any]:
    attach_interactive_desktop()
    res = get_screen_resolution()
    cur = pyautogui.position()
    cpu = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory()
    battery = psutil.sensors_battery()

    active_title = ""
    hwnd = user32.GetForegroundWindow()
    if hwnd:
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            active_title = buff.value

    return {
        "success": True,
        "screen": res,
        "cursor": {"x": cur.x, "y": cur.y},
        "active_window": active_title,
        "cpu_usage_percent": cpu,
        "ram_used_gb": round((ram.total - ram.available) / (1024**3), 2),
        "ram_total_gb": round(ram.total / (1024**3), 2),
        "ram_percent": ram.percent,
        "battery_percent": battery.percent if battery else None,
        "battery_plugged": battery.power_plugged if battery else None
    }

def set_volume(action: str, steps: int = 5) -> Dict[str, Any]:
    """Control system audio: up, down, mute, play_pause, next, prev."""
    attach_interactive_desktop()
    VK_VOLUME_MUTE = 0xAD
    VK_VOLUME_DOWN = 0xAE
    VK_VOLUME_UP = 0xAF
    VK_MEDIA_NEXT_TRACK = 0xB0
    VK_MEDIA_PREV_TRACK = 0xB1
    VK_MEDIA_PLAY_PAUSE = 0xB3

    act = action.lower().strip()
    vk_map = {
        "up": VK_VOLUME_UP,
        "down": VK_VOLUME_DOWN,
        "mute": VK_VOLUME_MUTE,
        "play_pause": VK_MEDIA_PLAY_PAUSE,
        "next": VK_MEDIA_NEXT_TRACK,
        "prev": VK_MEDIA_PREV_TRACK,
    }
    vk = vk_map.get(act)
    if not vk:
        return {"success": False, "error": f"Unknown audio action: {action}"}

    count = int(steps) if act in ("up", "down") else 1
    for _ in range(count):
        user32.keybd_event(vk, 0, 0, 0)
        time.sleep(0.02)
        user32.keybd_event(vk, 0, 2, 0)

    return {"success": True, "action": act, "steps": count}

# ═══════════════════════════════════════════════════════════════════════════════
# 7. MULTI-ACTION BATCH PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

def multi_action(actions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Executes a list of actions sequentially with automatic error handling."""
    results = []
    trigger_glow(len(actions) * 0.4 + 1.0)

    for idx, act in enumerate(actions):
        tool = act.get("action") or act.get("tool")
        args = act.get("args") or {k: v for k, v in act.items() if k not in ("action", "tool")}

        try:
            if tool == "click":
                r = mouse_click(args.get("x"), args.get("y"), args.get("button", "left"), args.get("clicks", 1))
            elif tool == "move":
                r = mouse_move(args["x"], args["y"], args.get("duration", 0.1))
            elif tool == "type":
                r = keyboard_type(args["text"], args.get("use_clipboard", True))
            elif tool == "press":
                r = keyboard_press(args["key"])
            elif tool == "hotkey":
                r = keyboard_hotkey(args["keys"])
            elif tool == "wait":
                time.sleep(float(args.get("seconds", 0.5)))
                r = {"success": True, "waited": args.get("seconds")}
            elif tool == "screenshot":
                r = capture_screen(args.get("output_path"), scale=args.get("scale", 1.0))
            elif tool == "launch":
                r = launch_app(args["command"])
            elif tool == "focus":
                r = focus_window(args["query"])
            else:
                r = {"error": f"Unknown action: {tool}"}

            results.append({"step": idx, "action": tool, "result": r})
        except Exception as ex:
            results.append({"step": idx, "action": tool, "error": str(ex)})

    return {"success": True, "steps_count": len(actions), "results": results}

# ═══════════════════════════════════════════════════════════════════════════════
# 8. CLI DISPATCHER
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        sys.exit(1)

    action = sys.argv[1]
    args = {}
    if len(sys.argv) >= 3:
        try:
            args = json.loads(sys.argv[2])
        except Exception:
            args = {}

    try:
        # Vision & Screen
        if action == "screenshot":
            res = capture_screen(args.get("output_path"), args.get("region"), args.get("monitor", 1), args.get("scale", 0.8), True)
        elif action == "ocr":
            res = ocr_screen(args.get("region"), args.get("language", ""))
        elif action == "find_image":
            res = find_image_on_screen(args["template_path"], args.get("threshold", 0.8), args.get("region"))
        elif action == "get_pixel_color":
            res = get_pixel_color(args["x"], args["y"])
        elif action == "get_cursor_position":
            res = get_cursor_position()

        # Mouse
        elif action == "mouse_move":
            res = mouse_move(args["x"], args["y"], args.get("duration", 0.12))
        elif action == "mouse_click":
            res = mouse_click(args.get("x"), args.get("y"), args.get("button", "left"), args.get("clicks", 1))
        elif action == "mouse_down":
            res = mouse_down(args.get("button", "left"))
        elif action == "mouse_up":
            res = mouse_up(args.get("button", "left"))
        elif action == "mouse_drag":
            res = mouse_drag(args["to_x"], args["to_y"], args.get("from_x"), args.get("from_y"), args.get("button", "left"), args.get("duration", 0.3))
        elif action == "mouse_scroll":
            res = mouse_scroll(args["clicks"], args.get("x"), args.get("y"), args.get("horizontal", False))

        # Keyboard
        elif action == "keyboard_type":
            res = keyboard_type(args["text"], args.get("use_clipboard", True), args.get("interval", 0.02))
        elif action == "keyboard_press":
            res = keyboard_press(args["key"])
        elif action == "keyboard_hotkey":
            res = keyboard_hotkey(args["keys"])
        elif action == "keyboard_key_down":
            res = keyboard_key_down(args["key"])
        elif action == "keyboard_key_up":
            res = keyboard_key_up(args["key"])

        # Window & Process
        elif action == "list_windows":
            res = list_windows(args.get("include_minimized", True))
        elif action == "focus_window":
            res = focus_window(args["query"])
        elif action == "manage_window":
            res = manage_window(args["query"], args["action"], args.get("x", 0), args.get("y", 0), args.get("width", 800), args.get("height", 600))
        elif action == "launch_app":
            res = launch_app(args["command"], args.get("args", ""), args.get("wait", False))
        elif action == "list_processes":
            res = list_processes(args.get("filter", ""), args.get("limit", 35))
        elif action == "kill_process":
            res = kill_process(args.get("pid"), args.get("name"), args.get("force", True))

        # System & Clipboard
        elif action == "clipboard_read":
            res = clipboard_read()
        elif action == "clipboard_write":
            res = clipboard_write(args["text"])
        elif action == "system_info":
            res = system_info()
        elif action == "set_volume":
            res = set_volume(args["action"], args.get("steps", 5))

        # Visual indicator
        elif action == "glow_start":
            trigger_glow(args.get("duration", 2.0))
            res = {"success": True, "glow": "active"}
        elif action == "glow_stop":
            ScreenGlowOverlay.get_instance().stop()
            res = {"success": True, "glow": "inactive"}

        # Multi-Action
        elif action == "multi_action":
            res = multi_action(args.get("actions", []))
        else:
            res = {"error": f"Unknown action: {action}"}

        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
