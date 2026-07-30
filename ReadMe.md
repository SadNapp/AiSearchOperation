# SAR-VISION // TACTICAL MILITARY DASHBOARD & FASTAPI BACKEND

**SAR-VISION** — це масштабована система для пошуково-рятувальних операцій (SAR), що зв'язує **Adapter -> Backend -> Frontend**. Включає в себе тактичну веб-панель моніторингу, модулі трекінгу координат і CSRT, нормалізацію BBox та підсистему апаратної телеметрії.

---

## 🚀 Швидкий запуск пайплайну (Pipeline Launcher Script)

Для запуску всього пайплайну системи (активація `.venv`, перевірка датасетів та старт FastAPI сервера на `http://localhost:8000`):

### Linux / macOS / Git Bash (Bash Script):
```bash
bash start_prj.sh
# або
./staty_prj.sh
```

### Windows (CMD Batch Script):
```cmd
start_prj.bat
```

---

## 🏗️ Архітектура системи (Adapter -> Backend -> Frontend)

```text
[ Raw Data / Video Stream ]
           │
           ▼
┌─────────────────────────────────────────┐
│        Adapter Layer                    │
│   (adapter/dataset_adapter.py)          │
│   - Normalizes BBox coordinates         │
│   - Formats hardware telemetry packets  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│     Tracking & Processing Modules       │
│                                         │
│  1. Precise Coords Tracker              │
│     (backend/coords_tracking/)          │
│     - High precision IoU tracking       │
│     - Exact pixel normalization         │
│                                         │
│  2. CSRT Tracker Engine                 │
│     (backend/csrt_tracking/)            │
│     - Channel & Spatial Reliability     │
│     - Exponential trajectory smoothing  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│         FastAPI Backend Server          │
│       (backend/api/app.py / main.py)    │
│   - GET /api/metrics                    │
│   - POST /api/model/change              │
│   - GET /api/stream (MJPEG)             │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│       Frontend UI HUD Dashboard         │
│   - Hardware Stats (FPS GPU, CPU, NPU)  │
│   - Interactive BBox Canvas Overlay     │
│   - Real-Time Target BBox Inspector     │
└─────────────────────────────────────────┘
```

---

## 📂 Структура каталогів проекту

```text
AiSearchOperation/
├── start_prj.sh                         <-- Скрипт запуску пайплайну (Bash)
├── staty_prj.sh                         <-- Аліас скрипту запуску
├── start_prj.bat                        <-- Скрипт запуску для Windows (CMD)
├── adapter/
│   └── dataset_adapter.py               <-- Нормалізація координат та телеметрії
├── backend/
│   ├── api/
│   │   └── app.py                        <-- FastAPI сервер (маршрути API та MJPEG)
│   ├── coords_tracking/
│   │   └── coords_tracking.py           <-- Модуль точного трекінгу BBox
│   └── csrt_tracking/
│       └── csrt_tracking.py             <-- Модуль згладженого CSRT трекінгу
├── assets/
│   └── dataset/
│       └── video/                        <-- Відео датасети (.mp4)
├── frontend/
│   ├── index.html                        <-- Тактична веб-оболонка
│   ├── css/style.css                     <-- Стилістика та теми
│   └── js/
│       ├── api.js                        <-- Клієнт API запитів
│       ├── ui.js                         <-- Рендеринг Canvas & метрик
│       └── main.js                       <-- Контролер подій
├── main.py                               <-- Точка запуску uvicorn сервера
└── ReadMe.md                             <-- Документація проекту
```
