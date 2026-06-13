import time
from pynput.keyboard import Controller, Listener, Key

keyboard = Controller()

# ⏱ 5 minutes
INTERVAL = 5 * 60

last_press = time.time()

running = True

print("Macro started: pressing SPACE every 5 minutes")
print("Press Q to stop")

# ----------------------------
# STOP KEY (Q)
# ----------------------------
def on_press(key):
    global running

    try:
        if key.char == 'q':
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

        keyboard.press(' ')
        time.sleep(0.05)
        keyboard.release(' ')

        print("Space pressed at", time.strftime("%H:%M:%S"))

        last_press = now

    time.sleep(1)