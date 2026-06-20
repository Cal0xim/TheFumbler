import time
import cv2
import numpy as np
import pyautogui
import os

from pynput.keyboard import Controller, Listener

# ----------------------------
# CONFIG
# ----------------------------

INTERVAL = 5 * 60

SEARCH_REGION = (1521, 453, 184, 128)

SEARCH_IMAGE = "macroImages/Search.png"

MATCH_THRESHOLD = 0.70  # lowered for improved detection

MAX_RETRIES = 5

SCALES = [0.90, 0.95, 1.00, 1.05, 1.10]

pyautogui.FAILSAFE = True

# ----------------------------
# LOAD TEMPLATE
# ----------------------------

template_original = cv2.imread(SEARCH_IMAGE, cv2.IMREAD_GRAYSCALE)

if template_original is None:
    print(f"ERROR: {SEARCH_IMAGE} not found")
    raise SystemExit(1)

template_edges = cv2.Canny(template_original, 50, 150)

# ----------------------------
# KEYBOARD
# ----------------------------

keyboard = Controller()

last_press = time.time() - INTERVAL
running = True

print("Macro started: pressing SPACE every 5 minutes")
print("Press Q to stop")

# ----------------------------
# STOP KEY
# ----------------------------

def on_press(key):
    global running
    try:
        if key.char.lower() == 'q':
            print("Stopped by user (Q)")
            running = False
            return False
    except:
        pass

Listener(on_press=on_press).start()

# ----------------------------
# OLD MOVEMENT (UNCHANGED EXACTLY)
# ----------------------------

def smooth_move_to(click_x, click_y):

    start_x, start_y = pyautogui.position()

    steps = 50

    for i in range(steps + 1):

        t = i / steps

        x = start_x + (click_x - start_x) * t
        y = start_y + (click_y - start_y) * t

        pyautogui.moveTo(x, y)
        time.sleep(0.01)

    time.sleep(0.1)

    pyautogui.moveTo(click_x, click_y)

# ----------------------------
# NEW DETECTION (IMPROVED)
# ----------------------------

def find_search():

    best_score = -1
    best_loc = None
    best_size = None

    screenshot = pyautogui.screenshot(region=SEARCH_REGION)
    screenshot = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2GRAY)
    screenshot_edges = cv2.Canny(screenshot, 50, 150)

    for scale in SCALES:

        resized = cv2.resize(
            template_edges,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_AREA
        )

        th, tw = resized.shape
        sh, sw = screenshot_edges.shape

        if tw > sw or th > sh:
            continue

        result = cv2.matchTemplate(
            screenshot_edges,
            resized,
            cv2.TM_CCOEFF_NORMED
        )

        _, score, _, loc = cv2.minMaxLoc(result)

        if score > best_score:
            best_score = score
            best_loc = loc
            best_size = (tw, th)

    return best_score, best_loc, best_size

# ----------------------------
# MAIN LOOP
# ----------------------------

while running:

    now = time.time()

    if now - last_press >= INTERVAL:

        print("\nChecking for Search.png...")

        found = False
        best_score = -1
        best_loc = None
        best_size = None

        # retries (NEW)
        for i in range(MAX_RETRIES):

            score, loc, size = find_search()

            print(f"Attempt {i+1}/{MAX_RETRIES} score={score:.3f}")

            if score > best_score:
                best_score = score
                best_loc = loc
                best_size = size

            if score >= MATCH_THRESHOLD:
                found = True
                break

            time.sleep(0.3)

        if found:

            h, w = best_size

            click_x = SEARCH_REGION[0] + best_loc[0] + w // 2
            click_y = SEARCH_REGION[1] + best_loc[1] + h // 2

            print(f"FOUND Search ({best_score:.3f}) at ({click_x},{click_y})")

            # ----------------------------
            # OLD MOVEMENT (UNCHANGED)
            # ----------------------------

            smooth_move_to(click_x, click_y)

            # ----------------------------
            # OLD CLICK LOOP (UNCHANGED)
            # ----------------------------

            for i in range(15):

                pyautogui.mouseDown()
                time.sleep(0.05)
                pyautogui.mouseUp()

                print(f"Click {i + 1}")

                if i % 2 == 0:
                    pyautogui.moveRel(-10, 0, duration=0.05)
                else:
                    pyautogui.moveRel(10, 0, duration=0.05)

                time.sleep(0.05)

            print("Finished click sequence")

            pyautogui.moveTo(click_x + 300, click_y, duration=0.3)

        else:

            print("Search NOT found after retries")
            print("SEARCH_NOT_FOUND", flush=True)

            raise SystemExit(3)

        # ----------------------------
        # JUMP (UNCHANGED)
        # ----------------------------

        for i in range(10):
            keyboard.press(' ')
            time.sleep(0.05)
            keyboard.release(' ')
            time.sleep(0.1)

        print("Space pressed at", time.strftime("%H:%M:%S"))

        last_press = now

    time.sleep(1)