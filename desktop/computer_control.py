#!/usr/bin/env python3
"""
Oryxgen AI Desktop — Native Computer Use Engine
Provides exact coordinate clicking, mouse moves, screenshots, typing, and window management.
"""

import sys
import os
import json
import time
import ctypes
import ctypes.wintypes
import tempfile

for stream in (sys.stdin, sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

def attach_interactive_desktop():
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
from PIL import Image

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.04

def get_screen_resolution():
    attach_interactive_desktop()
    size = pyautogui.size()
    return {"width": size.width, "height": size.height}

def take_screenshot(output_path=None, scale=1.0):
    attach_interactive_desktop()
    if not output_path:
        temp_dir = tempfile.gettempdir()
        timestamp = int(time.time() * 1000)
        output_path = os.path.join(temp_dir, f"oryxgen_screen_{timestamp}.png")
    
    img = pyautogui.screenshot()
    if scale and scale < 1.0:
        new_w = max(1, int(img.width * scale))
        new_h = max(1, int(img.height * scale))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    img.save(output_path, format="PNG")
    res = get_screen_resolution()
    return {
        "success": True,
        "path": output_path,
        "file_size": os.path.getsize(output_path),
        "width": img.width,
        "height": img.height,
        "screen_width": res["width"],
        "screen_height": res["height"]
    }

def mouse_move(x, y, duration=0.1):
    attach_interactive_desktop()
    pyautogui.moveTo(int(x), int(y), duration=float(duration))
    pos = pyautogui.position()
    return {"success": True, "x": pos.x, "y": pos.y}

def mouse_click(x=None, y=None, button="left", clicks=1):
    attach_interactive_desktop()
    if x is not None and y is not None:
        pyautogui.moveTo(int(x), int(y), duration=0.08)
    pyautogui.click(button=button, clicks=int(clicks))
    pos = pyautogui.position()
    return {"success": True, "clicked_at": {"x": pos.x, "y": pos.y}, "button": button, "clicks": clicks}

def mouse_drag(to_x, to_y, from_x=None, from_y=None, button="left", duration=0.25):
    attach_interactive_desktop()
    if from_x is not None and from_y is not None:
        pyautogui.moveTo(int(from_x), int(from_y), duration=0.08)
    pyautogui.dragTo(int(to_x), int(to_y), duration=float(duration), button=button)
    pos = pyautogui.position()
    return {"success": True, "end_pos": {"x": pos.x, "y": pos.y}}

def mouse_scroll(clicks, x=None, y=None):
    attach_interactive_desktop()
    if x is not None and y is not None:
        pyautogui.moveTo(int(x), int(y), duration=0.08)
    pyautogui.scroll(int(clicks))
    return {"success": True, "scroll_amount": clicks}

def keyboard_type(text, use_clipboard=True):
    attach_interactive_desktop()
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
        pyautogui.write(text, interval=0.02)
    return {"success": True, "typed_length": len(text)}

def keyboard_press(key):
    attach_interactive_desktop()
    key_clean = key.lower().strip()
    key_map = {
        "enter": "enter", "return": "enter", "esc": "escape", "escape": "escape",
        "tab": "tab", "space": "space", "backspace": "backspace", "delete": "delete",
        "del": "delete", "up": "up", "down": "down", "left": "left", "right": "right",
        "home": "home", "end": "end", "pageup": "pageup", "pagedown": "pagedown",
        "win": "win", "windows": "win", "cmd": "win"
    }
    target_key = key_map.get(key_clean, key_clean)
    pyautogui.press(target_key)
    return {"success": True, "key": target_key}

def keyboard_hotkey(keys):
    attach_interactive_desktop()
    if isinstance(keys, str):
        keys = [k.strip() for k in keys.split("+") if k.strip()]
    pyautogui.hotkey(*keys)
    return {"success": True, "hotkey": "+".join(keys)}

def list_windows():
    attach_interactive_desktop()
    windows = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    
    def enum_windows_proc(hwnd, lParam):
        if user32.IsWindowVisible(hwnd):
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
                    windows.append({
                        "hwnd": hwnd,
                        "title": title,
                        "pid": pid.value,
                        "process": pname
                    })
        return True
    
    user32.EnumWindows(WNDENUMPROC(enum_windows_proc), 0)
    return {"windows": windows, "count": len(windows)}

def focus_window(query):
    attach_interactive_desktop()
    target_hwnd = None
    query_str = str(query).lower()
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    
    def enum_proc(hwnd, lParam):
        nonlocal target_hwnd
        if user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value.strip()
                pid = ctypes.wintypes.DWORD()
                user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                if query_str in title.lower() or query_str == str(pid.value):
                    target_hwnd = hwnd
                    return False
        return True

    user32.EnumWindows(WNDENUMPROC(enum_proc), 0)
    if target_hwnd:
        user32.ShowWindow(target_hwnd, 9)
        user32.SetForegroundWindow(target_hwnd)
        return {"success": True, "focused": True, "hwnd": target_hwnd}
    return {"success": False, "error": f"Oyna topilmadi: {query}"}

def launch_app(command):
    import subprocess
    try:
        proc = subprocess.Popen(command, shell=True)
        return {"success": True, "pid": proc.pid, "command": command}
    except Exception as e:
        return {"success": False, "error": str(e)}

def system_info():
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

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action provided"}))
        sys.exit(1)
    
    action = sys.argv[1]
    args = {}
    if len(sys.argv) >= 3:
        try:
            args = json.loads(sys.argv[2])
        except Exception:
            args = {}
    
    try:
        if action == "screenshot":
            res = take_screenshot(args.get("output_path"), args.get("scale", 1.0))
        elif action == "mouse_move":
            res = mouse_move(args["x"], args["y"], args.get("duration", 0.1))
        elif action == "mouse_click":
            res = mouse_click(args.get("x"), args.get("y"), args.get("button", "left"), args.get("clicks", 1))
        elif action == "mouse_drag":
            res = mouse_drag(args["to_x"], args["to_y"], args.get("from_x"), args.get("from_y"), args.get("button", "left"), args.get("duration", 0.25))
        elif action == "mouse_scroll":
            res = mouse_scroll(args["clicks"], args.get("x"), args.get("y"))
        elif action == "keyboard_type":
            res = keyboard_type(args["text"], args.get("use_clipboard", True))
        elif action == "keyboard_press":
            res = keyboard_press(args["key"])
        elif action == "keyboard_hotkey":
            res = keyboard_hotkey(args["keys"])
        elif action == "list_windows":
            res = list_windows()
        elif action == "focus_window":
            res = focus_window(args["query"])
        elif action == "launch_app":
            res = launch_app(args["command"])
        elif action == "system_info":
            res = system_info()
        else:
            res = {"error": f"Unknown action: {action}"}
        
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
