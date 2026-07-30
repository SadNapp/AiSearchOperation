/**
 * SAR-VISION // API Service Module
 * Handles communications with backend services and local dataset assets
 */
class ApiService {
    constructor(baseUrl = "http://localhost:8000") {
        this.baseUrl = baseUrl;
        this.datasets = [
            {
                id: "farhuman_medium",
                name: "Far Human Dataset (farhuman_medium.mp4)",
                path: "../assets/dataset/video/farhuman_medium.mp4",
                type: "mp4"
            },
            {
                id: "midlhuman_medium",
                name: "Middle Distance (midlhuman_medium.mp4)",
                path: "../assets/dataset/video/midlhuman_medium.mp4",
                type: "mp4"
            },
            {
                id: "mjpeg_stream",
                name: "Live FastAPI MJPEG Stream",
                path: `${this.baseUrl}/api/stream`,
                type: "stream"
            }
        ];
    }

    // Get live telemetry metrics from backend server
    async getMetrics() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(`${this.baseUrl}/api/metrics`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            // Silence noise, return null so UI handles fallback / simulation
            return null;
        }
    }

    // Request neural model change on backend
    async setModel(modelName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/model/change`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelName })
            });
            return await response.json();
        } catch (error) {
            console.warn("[API] Backend model update failed (offline mode):", error.message);
            return { status: "offline_simulated", model: modelName };
        }
    }

    // Return stream URL for MJPEG stream
    getStreamUrl() {
        return `${this.baseUrl}/api/stream`;
    }

    // Get available video datasets
    getAvailableDatasets() {
        return this.datasets;
    }
}

const api = new ApiService();