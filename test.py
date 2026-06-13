import pyautogui
import time

pyautogui.FAILSAFE = True

# Gives you time to focus Roblox
time.sleep(2)

# Current mouse position
start_x, start_y = pyautogui.position()

# Target position
target_x = 1417
target_y = 1387

# Smooth movement
steps = 50

for i in range(steps + 1):
    t = i / steps

    x = start_x + (target_x - start_x) * t
    y = start_y + (target_y - start_y) * t

    pyautogui.moveTo(x, y)
    time.sleep(0.01)

# Small pause after arriving
time.sleep(0.1)

# Click
pyautogui.mouseDown()
time.sleep(0.05)
pyautogui.mouseUp()

print("Clicked at (1417, 1387)")