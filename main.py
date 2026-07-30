import cv2
import orjson
import pytest
from fastapi import FastAPI
from ultralytics import YOLO

print("✅ OpenCV версія:", cv2.__version__)
print("✅ YOLO (Ultralytics) успішно імпортовано!")
print("✅ orjson працює, тест парсингу:", orjson.loads(b'{"metric": "fps", "value": 60}'))
print("✅ pytest працює, версія:", pytest.__version__)

app = FastAPI()
print("✅ FastAPI готовий до роботи!")
