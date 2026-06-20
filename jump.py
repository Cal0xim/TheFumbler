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

MATCH_THRESHOLD = 0.7
MAX_RETRIES = 4

SCALES = [0.85, 0.9, 0.95, 1.0, 1.05, 1.1]

DEBUG_FOLDER = "search_debug"
os.makedirs(DEBUG_FOLDER, exist_ok=True)

pyautogui.FAILSAFE = True

# ----------------------------
# LOAD TEMPLATE (EDGE BASED)
# ----------------------------

template = cv2.imread(SEARCH_IMAGE, cv2.IMREAD_GRAYSCALE)

if template is None:
    print(f"ERROR: {SEARCH_IMAGE} not found")
    raise SystemExit(1)

template_edges = cv2.Canny(template, 50, 150)

# ORB fallback
orb = cv2.ORB_create(500)
kp1, des1 = orb.detectAndCompute(template, None)

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
# SCREEN CAPTURE
# ----------------------------

def capture_clean():
    pyautogui.moveTo(50, 50, duration=0.05)
    time.sleep(0.05)
    img = pyautogui.screenshot(region=SEARCH_REGION)
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)

# ----------------------------
# DETECTION (FIXED SCALE BINDING)
# ----------------------------

def edge_match(screen):

    screen_edges = cv2.Canny(screen, 50, 150)

    best_score = -1
    best_loc = None
    best_size = None

    for scale in SCALES:

        resized = cv2.resize(
            template_edges,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_AREA
        )

        th, tw = resized.shape
        sh, sw = screen_edges.shape

        if tw > sw or th > sh:
            continue

        result = cv2.matchTemplate(screen_edges, resized, cv2.TM_CCOEFF_NORMED)
        _, score, _, loc = cv2.minMaxLoc(result)

        # 🔥 FIX: bind loc + size from SAME scale result
        if score > best_score:
            best_score = score
            best_loc = loc
            best_size = (tw, th)

    return best_score, best_loc, best_size

# ----------------------------
# ORB FALLBACK
# ----------------------------

def orb_fallback(screen):
    kp2, des2 = orb.detectAndCompute(screen, None)

    if des2 is None or des1 is None:
        return -1, None, None

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)

    score = len(matches) / 100.0
    return score, (0, 0), template.shape[::-1]

# ----------------------------
# FIND BEST MATCH
# ----------------------------

def find_search_best():

    best_overall = -1
    best_loc = None
    best_size = None

    screen = capture_clean()

    for attempt in range(MAX_RETRIES):

        score, loc, size = edge_match(screen)

        print(f"[Search Attempt {attempt+1}] score={score:.3f}")

        if score > best_overall:
            best_overall = score
            best_loc = loc
            best_size = size

        if score >= MATCH_THRESHOLD:
            break

        time.sleep(0.2)

    # fallback ORB
    if best_overall < 0.60:
        orb_score, _, _ = orb_fallback(screen)
        if orb_score > best_overall:
            best_overall = orb_score

    # ----------------------------
    # DEBUG IMAGE
    # ----------------------------

    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")

    debug_img = cv2.cvtColor(screen, cv2.COLOR_GRAY2BGR)

    if best_loc is not None and best_size is not None:

        x, y = best_loc
        w, h = best_size

        cx = x + w // 2
        cy = y + h // 2

        color = (0, 255, 0) if best_overall >= MATCH_THRESHOLD else (0, 0, 255)

        cv2.rectangle(debug_img, (x, y), (x + w, y + h), color, 2)
        cv2.circle(debug_img, (cx, cy), 3, (255, 0, 0), -1)

        cv2.putText(
            debug_img,
            f"{best_overall:.3f}",
            (x, max(15, y - 5)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 255),
            1
        )

    cv2.imwrite(
        os.path.join(DEBUG_FOLDER, f"search_{timestamp}.png"),
        debug_img
    )

    return best_overall, best_loc, best_size

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

        for i in range(MAX_RETRIES):

            score, loc, size = find_search_best()

            print(f"Retry {i+1}/{MAX_RETRIES} score={score:.3f}")

            if score > best_score:
                best_score = score
                best_loc = loc
                best_size = size

            if score >= MATCH_THRESHOLD:
                found = True
                break

            time.sleep(0.3)

        # ----------------------------
        # NOT FOUND (RECOVERY)
        # ----------------------------

        if not found:

            ts = time.strftime("%Y-%m-%d_%H-%M-%S")

            pyautogui.screenshot().save(f"SEARCH_NOT_FOUND_{ts}.png")
            pyautogui.screenshot(region=SEARCH_REGION).save(f"SEARCH_REGION_{ts}.png")

            print("SEARCH_NOT_FOUND (recoverable)")
            last_press = now
            continue

        # ----------------------------
        # FIXED CLICK CALCULATION
        # ----------------------------

        rx, ry, rw, rh = SEARCH_REGION

        x, y = best_loc
        w, h = best_size

        center_x = x + w // 2
        center_y = y + h // 2

        click_x = rx + center_x
        click_y = ry + center_y

        print(f"FOUND ({best_score:.3f}) -> ({click_x},{click_y})")

        # ----------------------------
        # YOUR ORIGINAL MOVEMENT (UNCHANGED)
        # ----------------------------

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
        # YOUR ORIGINAL CLICK LOGIC (UNCHANGED)
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

        pyautogui.moveTo(click_x + 300, click_y, duration=0.3)

        print("Finished click sequence")

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