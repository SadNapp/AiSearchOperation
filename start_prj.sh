#!/usr/bin/env bash

# ==============================================================================
# SAR-VISION // TACTICAL MISSION CONTROL PIPELINE LAUNCHER
# ==============================================================================

echo "======================================================================"
echo "   SAR-VISION // TACTICAL SEARCH & RESCUE PIPELINE"
echo "======================================================================"

# 1. Detect and activate Python Virtual Environment
if [ -d ".venv" ]; then
    echo "🔍 Found virtual environment (.venv)"
    if [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
    elif [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    fi
elif [ -d "venv" ]; then
    echo "🔍 Found virtual environment (venv)"
    if [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    fi
else
    echo "⚠️ No .venv directory found. Using system Python."
fi

# 2. Check for required video dataset assets
VIDEO_FILE="assets/dataset/video/farhuman_medium.mp4"
if [ ! -f "$VIDEO_FILE" ]; then
    echo "⚠️ Warning: Video asset not found at $VIDEO_FILE"
    echo "   Attempting to run download__assets.py..."
    python download__assets.py
else
    echo "✅ Verified video dataset: $VIDEO_FILE"
fi

# 3. Launch Pipeline Backend Server
echo "----------------------------------------------------------------------"
echo "🚀 Launching FastAPI Backend Pipeline Server on http://localhost:8000"
echo "----------------------------------------------------------------------"

python main.py
