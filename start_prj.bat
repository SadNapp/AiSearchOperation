@echo off
TITLE SAR-VISION // TACTICAL PIPELINE LAUNCHER
echo ======================================================================
echo    SAR-VISION // TACTICAL SEARCH ^& RESCUE PIPELINE
echo ======================================================================

IF EXIST .venv\Scripts\activate.bat (
    echo [INFO] Activating .venv virtual environment...
    call .venv\Scripts\activate.bat
) ELSE IF EXIST venv\Scripts\activate.bat (
    echo [INFO] Activating venv virtual environment...
    call venv\Scripts\activate.bat
)

echo ----------------------------------------------------------------------
echo [LAUNCH] Starting FastAPI Backend Pipeline Server on http://localhost:8000
echo ----------------------------------------------------------------------
python main.py
pause
