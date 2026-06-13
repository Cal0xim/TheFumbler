import pyautogui
import os
import json
import re
from datetime import datetime
import pytesseract
import cv2
import numpy as np
import time

from pynput.keyboard import Controller

pyautogui.FAILSAFE = True

keyboard = Controller()

# ⚙️ Tesseract path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# 📁 Paths
DATA_DIR = "data"
SAVE_FOLDER = "assets/crew_leaderboards"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SAVE_FOLDER, exist_ok=True)

JSON_FILE = os.path.join(DATA_DIR, "ratings.json")

# 📍 Leaderboard region
SCREEN_REGION = (836, 567, 779, 442)

# ----------------------------
# LEADERBOARD CHECK
# ----------------------------
def looks_like_leaderboard(text):
    rank_count = len(re.findall(r"#\d+", text))
    return rank_count >= 5

# ----------------------------
# LOAD JSON
# ----------------------------
def load_stats():
    if os.path.exists(JSON_FILE):
        try:
            with open(JSON_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    return json.loads(content)
        except Exception as e:
            print("Failed to load JSON:", e)

    return {
        "OldStats": None,
        "NewStats": None
    }

# ----------------------------
# SAVE SNAPSHOT
# ----------------------------
def save_snapshot(crews):
    data = load_stats()

    data["OldStats"] = data.get("NewStats")

    data["NewStats"] = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "crews": crews
    }

    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    print("Updated OldStats -> NewStats")

# ----------------------------
# MAIN
# ----------------------------
print("Starting leaderboard capture...")

# ⌨️ SPACE using pynput (more reliable than pyautogui)
keyboard.press(' ')
time.sleep(0.05)
keyboard.release(' ')
time.sleep(0.2)

# 📸 screenshot
screenshot = pyautogui.screenshot(region=SCREEN_REGION)

filename = f"screenshot_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.png"
filepath = os.path.join(SAVE_FOLDER, filename)

screenshot.save(filepath)

print("Screenshot saved:", filepath)

# 🧠 OCR
img = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)
text = pytesseract.image_to_string(img)

print("\nRAW OCR:\n")
print(text)

# ❌ not valid leaderboard
if not looks_like_leaderboard(text):
    print("\nLeaderboard not found")

    try:
        os.remove(filepath)
        print("Screenshot deleted:", filepath)
    except:
        pass

    raise SystemExit

print("\nLeaderboard found")

# ----------------------------
# PARSE OCR
# ----------------------------
lines = [line.strip() for line in text.split("\n") if line.strip()]

names = []
ratings = []
members = []

mode = "names"

for line in lines:

    if "—" in line and "#" in line:
        mode = "ratings"

    elif "/" in line:
        mode = "members"

    if mode == "names":
        if not line.startswith("#"):
            names.append(line)

    elif mode == "ratings":
        match = re.search(r"#\d+\s*—\s*([\d,]+)", line)
        if match:
            ratings.append(match.group(1))

    elif mode == "members":
        match = re.search(r"(\d+/\d+)", line)
        if match:
            members.append(match.group(1))

# ----------------------------
# BUILD DATA
# ----------------------------
crews = []

count = min(len(names), len(ratings), len(members))

for i in range(count):
    crews.append({
        "name": names[i],
        "rating": ratings[i],
        "members": members[i]
    })

# ----------------------------
# OUTPUT
# ----------------------------
print("\nName | Rating | Members")
print("-----------------------------------")

for c in crews:
    print(f"{c['name']} | {c['rating']} | {c['members']}")

print("-----------------------------------")

# 💾 SAVE JSON
save_snapshot(crews)

# 🗑️ DELETE IMAGE
try:
    os.remove(filepath)
    print("Screenshot deleted:", filepath)
except Exception as e:
    print("Failed to delete screenshot:", e)

print("\nDone.")