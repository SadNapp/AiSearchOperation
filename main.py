"""
SAR-VISION // Main Entry Point
Launches FastAPI backend application with uvicorn server.
"""

import uvicorn
from backend.api.app import app

if __name__ == "__main__":
    print("🚀 Launching SAR-VISION Tactical FastAPI Backend on http://localhost:8000 ...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
