from pynput import mouse

print("Click anywhere to print coordinates.")
print("Press Ctrl+C in terminal to stop.\n")

def on_click(x, y, button, pressed):
    if pressed:
        print(f"CLICK at: (x: {x}, y: {y})")

listener = mouse.Listener(on_click=on_click)
listener.start()

# keep script running
listener.join()