import requests
import time
import math
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://34.41.16.247:8080")
DEVICE_ID = "aegis-container-001"

def calculate_gforce(x, y, z):
    if x is None or y is None or z is None:
        return 0.0
    return round(math.sqrt(x**2 + y**2 + z**2) / 9.81, 3)

def fetch_latest():
    try:
        response = requests.get(BACKEND_URL, timeout=5)
        raw = response.json()

        # Calculate G-force from accelerometer
        accel = raw.get("acceleration", {})
        gforce = calculate_gforce(
            accel.get("x"),
            accel.get("y"),
            accel.get("z")
        )

        # Gyro for rotation detection
        gyro = raw.get("gyro", {})
        gyro_magnitude = calculate_gforce(
            gyro.get("x"),
            gyro.get("y"),
            gyro.get("z")
        )

        reading = {
            "device_id": DEVICE_ID,
            "timestamp": time.time(),
            "temperature": raw.get("temperature") or 0.0,
            "humidity": raw.get("humidity") or 0.0,
            "shock": gforce,
            "shock_detected": bool(raw.get("shockDetected")),
            "gyro_magnitude": gyro_magnitude,
            "water_detected": (raw.get("water") or 0) > 50,
            "light": raw.get("light") or 0.0
        }

        print(f"temp={reading['temperature']}°C "
              f"humidity={reading['humidity']}% "
              f"shock={reading['shock']}G "
              f"water={reading['water_detected']} "
              f"light={reading['light']}%")

        return reading

    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print(f"Connecting to {BACKEND_URL}")
    while True:
        fetch_latest()
        time.sleep(2)