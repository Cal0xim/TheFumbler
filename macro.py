import os
import json
import re
import time
from datetime import datetime

import cv2
import numpy as np
import pyautogui
import pytesseract

pyautogui.FAILSAFE = True

# ----------------------------
# CONFIG
# ----------------------------

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

DATA_DIR = "data"
SAVE_FOLDER = "assets/crew_leaderboards"
JSON_FILE = os.path.join(DATA_DIR, "ratings.json")

# Leaderboard screenshot area
SCREEN_REGION = (836, 567, 779, 442)

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SAVE_FOLDER, exist_ok=True)

# ----------------------------
# HELPERS
# ----------------------------

def looks_like_leaderboard(text):
    return len(re.findall(r"#\d+", text)) >= 5


def load_stats():
    default = {
        "OldStats": None,
        "NewStats": None
    }

    if not os.path.exists(JSON_FILE):
        return default

    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return default


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
# SCREENSHOT
# ----------------------------

screenshot = pyautogui.screenshot(region=SCREEN_REGION)

filepath = os.path.join(
    SAVE_FOLDER,
    f"screenshot_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.png"
)

screenshot.save(filepath)

print("Screenshot saved:", filepath)

# ----------------------------
# OCR
# ----------------------------

img = cv2.cvtColor(
    np.array(screenshot),
    cv2.COLOR_RGB2BGR
)

text = pytesseract.image_to_string(img)

print("\nRAW OCR:\n")
print(text)

if not looks_like_leaderboard(text):
    print("\nLeaderboard not found")

    try:
        os.remove(filepath)
    except:
        pass

    raise SystemExit(0)

print("\nLeaderboard found")

# ----------------------------
# PARSE OCR
# ----------------------------

lines = [
    line.strip()
    for line in text.split("\n")
    if line.strip()
]

names, ratings, members = [], [], []
mode = "names"

for line in lines:

    # Members first
    if "/" in line:

        mode = "members"

        match = re.search(r"(\d+/\d+)", line)

        if match:
            members.append(match.group(1))

        continue

    # Ratings second
    if line.startswith("#"):

        mode = "ratings"

        match = re.search(
            r"#\d+\D+([\d,]+)",
            line
        )

        if match:
            ratings.append(match.group(1))

        continue

    # Names
    if mode == "names":
        names.append(line)

# ----------------------------
# BUILD DATA
# ----------------------------

print("\nDEBUG")
print("Names:", len(names))
print("Ratings:", len(ratings))
print("Members:", len(members))

count = min(
    len(names),
    len(ratings),
    len(members)
)

crews = [
    {
        "name": names[i],
        "rating": ratings[i],
        "members": members[i]
    }
    for i in range(count)
]

# ----------------------------
# OUTPUT
# ----------------------------

print("\nName | Rating | Members")
print("-----------------------------------")

for crew in crews:
    print(
        f"{crew['name']} | "
        f"{crew['rating']} | "
        f"{crew['members']}"
    )

print("-----------------------------------")

# ----------------------------
# SAVE JSON
# ----------------------------

save_snapshot(crews)

# ----------------------------
# DELETE SCREENSHOT
# ----------------------------

try:
    os.remove(filepath)
    print("Screenshot deleted:", filepath)
except Exception as e:
    print("Failed to delete screenshot:", e)

print("\nDone.")