import time
import cv2
import numpy as np
import pyautogui

from pynput.keyboard import Controller, Listener

# ----------------------------
# CONFIG
# ----------------------------

INTERVAL = 5 * 60

SEARCH_REGION = (1521, 453, 184, 128)

SEARCH_IMAGE = "macroImages/Search.png"

MATCH_THRESHOLD = 0.95

pyautogui.FAILSAFE = True

# ----------------------------
# LOAD TEMPLATE
# ----------------------------

template = cv2.imread(
    SEARCH_IMAGE,
    cv2.IMREAD_GRAYSCALE
)

if template is None:
    print(f"ERROR: {SEARCH_IMAGE} not found")
    raise SystemExit(1)

# ----------------------------
# KEYBOARD
# ----------------------------

keyboard = Controller()

# Run immediately on startup
last_press = time.time() - INTERVAL

running = True

print("Macro started: pressing SPACE every 5 minutes")
print("Press Q to stop")

# ----------------------------
# STOP KEY (Q)
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

listener = Listener(on_press=on_press)
listener.start()

# ----------------------------
# MAIN LOOP
# ----------------------------

while running:

    now = time.time()

    if now - last_press >= INTERVAL:

        print("\nChecking for Search.png...")

        # ----------------------------
        # FIND SEARCH BUTTON
        # ----------------------------

        search_shot = pyautogui.screenshot(
            region=SEARCH_REGION
        )

        search_gray = cv2.cvtColor(
            np.array(search_shot),
            cv2.COLOR_RGB2GRAY
        )

        result = cv2.matchTemplate(
            search_gray,
            template,
            cv2.TM_CCOEFF_NORMED
        )

        _, max_val, _, max_loc = cv2.minMaxLoc(result)

        print(f"Search match: {max_val:.3f}")

        if max_val >= MATCH_THRESHOLD:

            h, w = template.shape

            click_x = (
                SEARCH_REGION[0]
                + max_loc[0]
                + w // 2
            )

            click_y = (
                SEARCH_REGION[1]
                + max_loc[1]
                + h // 2
            )

            print(
                f"Found Search.png at "
                f"({click_x}, {click_y})"
            )

            # ----------------------------
            # SMOOTH MOVE TO SEARCH
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

            # Wiggle mouse left/right
            for _ in range(3):
                pyautogui.moveRel(-10, 0, duration=0.05)
                pyautogui.moveRel(10, 0, duration=0.05)

            # Return to center
            pyautogui.moveTo(click_x, click_y)

            # Click 5 times while moving slightly
            for i in range(5):

                pyautogui.mouseDown()
                time.sleep(0.05)
                pyautogui.mouseUp()

                print(f"Click {i + 1}")

                pyautogui.moveRel(10, 0, duration=0.05)

                time.sleep(0.05)

            print("Finished click sequence")

            # ----------------------------
            # MOVE MOUSE AWAY
            # ----------------------------

            pyautogui.moveTo(
                click_x + 300,
                click_y,
                duration=0.3
            )

            print("Moved mouse right")

        else:

            print("Search button not found")

        # ----------------------------
        # JUMP
        # ----------------------------

        keyboard.press(' ')
        time.sleep(0.05)
        keyboard.release(' ')

        print(
            "Space pressed at",
            time.strftime("%H:%M:%S")
        )

        last_press = now

    time.sleep(1)

    #next vers