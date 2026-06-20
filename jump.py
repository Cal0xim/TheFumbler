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

MAX_RETRIES = 5

MAX_CONSECUTIVE_FAILURES = 3

DEBUG_FOLDER = "debug_search"

SCALES = [
    0.90,
    0.95,
    1.00,
    1.05,
    1.10
]

pyautogui.FAILSAFE = True

os.makedirs(DEBUG_FOLDER, exist_ok=True)

# ----------------------------
# LOAD TEMPLATE
# ----------------------------

template_original = cv2.imread(
    SEARCH_IMAGE,
    cv2.IMREAD_GRAYSCALE
)

if template_original is None:
    print(f"ERROR: {SEARCH_IMAGE} not found")
    raise SystemExit(1)

template_edges_original = cv2.Canny(
    template_original,
    50,
    150
)

def smooth_move(x, y, steps=50):
    start_x, start_y = pyautogui.position()

    for i in range(steps + 1):
        t = i / steps
        nx = start_x + (x - start_x) * t
        ny = start_y + (y - start_y) * t
        pyautogui.moveTo(nx, ny)
        time.sleep(0.01)

# ----------------------------
# KEYBOARD
# ----------------------------

keyboard = Controller()

last_press = time.time() - INTERVAL

running = True

failure_count = 0

print("Macro started")
print("Press Q to stop")

# ----------------------------
# STOP KEY
# ----------------------------

def on_press(key):

    global running

    try:

        if key.char.lower() == "q":

            print("Stopped by user")

            running = False

            return False

    except:
        pass

listener = Listener(
    on_press=on_press
)

listener.start()

# ----------------------------
# DETECTION
# ----------------------------

def find_search_button():

    best_score = -1
    best_loc = None
    best_size = None
    best_debug = None

    pyautogui.moveTo(
        50,
        50,
        duration=0.1
    )

    time.sleep(0.1)

    screenshot = pyautogui.screenshot(
        region=SEARCH_REGION
    )

    screenshot_bgr = cv2.cvtColor(
        np.array(screenshot),
        cv2.COLOR_RGB2BGR
    )

    screenshot_gray = cv2.cvtColor(
        screenshot_bgr,
        cv2.COLOR_BGR2GRAY
    )

    screenshot_edges = cv2.Canny(
        screenshot_gray,
        50,
        150
    )

    for scale in SCALES:

        resized_template = cv2.resize(
            template_edges_original,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_AREA
        )

        th, tw = resized_template.shape

        sh, sw = screenshot_edges.shape

        if tw > sw or th > sh:
            continue

        result = cv2.matchTemplate(
            screenshot_edges,
            resized_template,
            cv2.TM_CCOEFF_NORMED
        )

        _, score, _, loc = cv2.minMaxLoc(
            result
        )

        if score > best_score:

            best_score = score
            best_loc = loc
            best_size = (tw, th)

    debug_image = screenshot_bgr.copy()

    if best_loc and best_size:

        x, y = best_loc
        w, h = best_size

        cv2.rectangle(
            debug_image,
            (x, y),
            (x + w, y + h),
            (0, 255, 0),
            2
        )

        cv2.putText(
            debug_image,
            f"{best_score:.3f}",
            (x, y - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 0),
            1
        )

    timestamp = time.strftime(
        "%Y-%m-%d_%H-%M-%S"
    )

    debug_path = os.path.join(
        DEBUG_FOLDER,
        f"debug_{timestamp}.png"
    )

    cv2.imwrite(
        debug_path,
        debug_image
    )

    return (
        best_score,
        best_loc,
        best_size,
        debug_path
    )

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

        for attempt in range(
            1,
            MAX_RETRIES + 1
        ):

            score, loc, size, debug_file = (
                find_search_button()
            )

            print(
                f"Attempt {attempt}/{MAX_RETRIES} "
                f"score={score:.3f}"
            )

            if score > best_score:

                best_score = score
                best_loc = loc
                best_size = size

            if score >= MATCH_THRESHOLD:

                found = True
                break

            time.sleep(0.5)

        if found:

            failure_count = 0

            w, h = best_size

            click_x = (
                SEARCH_REGION[0]
                + best_loc[0]
                + w // 2
            )

            click_y = (
                SEARCH_REGION[1]
                + best_loc[1]
                + h // 2
            )

            print(
                f"Found Search "
                f"(score={best_score:.3f}) "
                f"at ({click_x}, {click_y})"
            )

            smooth_move(click_x, click_y, steps=50)

            time.sleep(0.1)

            pyautogui.moveTo(click_x, click_y)

            time.sleep(0.1)

            for i in range(15):

                pyautogui.click()

                print(
                    f"Click {i + 1}"
                )

                if i % 2 == 0:
                    pyautogui.moveRel(
                        -10,
                        0,
                        duration=0.05
                    )
                else:
                    pyautogui.moveRel(
                        10,
                        0,
                        duration=0.05
                    )

                time.sleep(0.05)

            print(
                "Finished click sequence"
            )

            pyautogui.moveTo(
                click_x + 300,
                click_y,
                duration=0.3
            )

            print(
                "Moved mouse right"
            )

        else:

            failure_count += 1

            timestamp = time.strftime(
                "%Y-%m-%d_%H-%M-%S"
            )

            full_file = (
                f"SEARCH_NOT_FOUND_{timestamp}.png"
            )

            region_file = (
                f"SEARCH_REGION_{timestamp}.png"
            )

            pyautogui.screenshot().save(
                full_file
            )

            pyautogui.screenshot(
                region=SEARCH_REGION
            ).save(
                region_file
            )

            print(
                f"FAILED "
                f"(best score={best_score:.3f})"
            )

            print(
                f"Saved: {full_file}"
            )

            print(
                f"Saved: {region_file}"
            )

            print(
                f"Consecutive failures: "
                f"{failure_count}"
            )

            if (
                failure_count
                >= MAX_CONSECUTIVE_FAILURES
            ):

                print(
                    "SEARCH_NOT_FOUND",
                    flush=True
                )

                raise SystemExit(3)

        # ----------------------------
        # JUMP
        # ----------------------------

        for i in range(10):

            keyboard.press(' ')
            time.sleep(0.05)

            keyboard.release(' ')
            time.sleep(0.1)

        print(
            "Space pressed at",
            time.strftime("%H:%M:%S")
        )

        last_press = now

    time.sleep(1)

    #test