/**
 * SAR-VISION // Core Application Controller
 * Military Khaki / Olive Tactical Mission Control
 */
document.addEventListener("DOMContentLoaded", () => {
    let isPlaying = false;
    let isBBoxEnabled = true;
    let pollingInterval = null;
    let activeVideoMode = "mp4"; // "mp4" or "stream"

    const videoEl = UI.elements.videoPlayer;

    // 1. Initialize clock, canvas, theme & video zoom controller
    setInterval(() => UI.updateClock(), 1000);
    UI.updateClock();
    UI.initCanvas();
    UI.initVideoZoomController();

    // Restore saved theme from localStorage
    const savedTheme = localStorage.getItem("sar_theme") || "theme-tactical";
    UI.setTheme(savedTheme);

    if (UI.elements.themeSelect) {
        UI.elements.themeSelect.addEventListener("change", (e) => {
            UI.setTheme(e.target.value);
        });
    }

    window.addEventListener("resize", () => {
        UI.initCanvas();
    });

    // 2. Video Source Selection Switcher
    UI.elements.videoSelect.addEventListener("change", (event) => {
        const selectedValue = event.target.value;
        switchVideoSource(selectedValue);
    });

    function switchVideoSource(sourcePath) {
        UI.resetZoom();

        if (sourcePath === "mjpeg_stream") {
            activeVideoMode = "stream";
            videoEl.style.display = "none";
            videoEl.pause();
            UI.elements.streamImage.style.display = "block";
            UI.elements.activeSourceBadge.textContent = "LIVE STREAM (MJPEG)";
        } else {
            activeVideoMode = "mp4";
            UI.elements.streamImage.style.display = "none";
            UI.elements.streamImage.src = "";
            videoEl.style.display = "block";
            
            const filename = sourcePath.split("/").pop();
            UI.elements.activeSourceBadge.textContent = filename;

            UI.elements.videoSource.src = sourcePath;
            videoEl.load();

            if (isPlaying) {
                playVideoSafe();
            }
        }
    }

    function playVideoSafe() {
        if (activeVideoMode === "mp4") {
            videoEl.muted = true;
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn("[PLAYER] Play promise error:", err);
                });
            }
        }
    }

    // 3. PLAY Button Action
    UI.elements.btnPlay.addEventListener("click", () => {
        isPlaying = true;

        if (UI.elements.controlsBar) {
            UI.elements.controlsBar.classList.remove("is-paused");
        }

        UI.elements.signalStatus.textContent = "PLAYING / AWAITING MODEL";
        UI.elements.signalStatus.className = "hud-value success";
        UI.elements.btnPlay.style.borderColor = "var(--accent-olive)";
        UI.elements.btnStop.style.borderColor = "var(--border-color)";

        if (activeVideoMode === "mp4") {
            playVideoSafe();
        } else {
            UI.elements.streamImage.src = api.getStreamUrl();
        }

        startBackendPolling();
    });

    // 4. STOP Button Action (Freezes current video frame, turns timeline red)
    UI.elements.btnStop.addEventListener("click", () => {
        isPlaying = false;

        if (UI.elements.controlsBar) {
            UI.elements.controlsBar.classList.add("is-paused");
        }

        UI.elements.signalStatus.textContent = "STOPPED / PAUSED";
        UI.elements.signalStatus.className = "hud-value highlight-red";
        UI.elements.btnPlay.style.borderColor = "var(--border-color)";
        UI.elements.btnStop.style.borderColor = "var(--accent-red)";

        if (activeVideoMode === "mp4") {
            videoEl.pause();
        } else {
            UI.elements.streamImage.src = "";
        }

        stopBackendPolling();
    });

    // 5. BBox HUD Overlay Toggle
    UI.elements.toggleBBox.addEventListener("change", (event) => {
        isBBoxEnabled = event.target.checked;
        UI.drawBBoxes([], isBBoxEnabled);
    });

    // 6. Neural Model Selector
    UI.elements.modelSelect.addEventListener("change", async (event) => {
        const selectedModel = event.target.value;
        UI.updateActiveModel(selectedModel);

        try {
            await api.setModel(selectedModel);
        } catch (error) {
            console.error("[MAIN] Model update error:", error);
        }
    });

    // 7. Confidence Threshold Slider
    UI.elements.confThreshold.addEventListener("input", (event) => {
        const val = parseFloat(event.target.value).toFixed(2);
        UI.elements.confThreshVal.textContent = val;
    });

    // 8. Video Timeline Synchronization
    videoEl.addEventListener("timeupdate", () => {
        if (videoEl.duration) {
            const pct = (videoEl.currentTime / videoEl.duration) * 100;
            UI.elements.timeline.value = pct;
            
            const currMins = Math.floor(videoEl.currentTime / 60).toString().padStart(2, "0");
            const currSecs = Math.floor(videoEl.currentTime % 60).toString().padStart(2, "0");
            const durMins = Math.floor(videoEl.duration / 60).toString().padStart(2, "0");
            const durSecs = Math.floor(videoEl.duration % 60).toString().padStart(2, "0");
            
            UI.elements.timelineTime.textContent = `${currMins}:${currSecs} / ${durMins}:${durSecs}`;
        }
    });

    UI.elements.timeline.addEventListener("input", (event) => {
        if (videoEl.duration) {
            const seekTime = (parseFloat(event.target.value) / 100) * videoEl.duration;
            videoEl.currentTime = seekTime;
        }
    });

    // 9. Polling Backend for Real Data (FastAPI /api/metrics)
    function startBackendPolling() {
        if (pollingInterval) clearInterval(pollingInterval);

        pollingInterval = setInterval(async () => {
            if (!isPlaying) return;

            const backendData = await api.getMetrics();
            
            if (backendData) {
                UI.elements.signalStatus.textContent = "BACKEND CONNECTED";
                
                const detections = backendData.detections || [];
                const minConfThresh = parseFloat(UI.elements.confThreshold.value) * 100;
                const filteredDetections = detections.filter(d => d.conf >= minConfThresh);

                UI.updateMetrics(backendData);
                UI.updateConfidenceStats(filteredDetections);
                UI.updateBBoxList(filteredDetections);
                UI.drawBBoxes(filteredDetections, isBBoxEnabled);
            } else {
                UI.updateMetrics(null);
                UI.updateConfidenceStats([]);
                UI.updateBBoxList([]);
                UI.drawBBoxes([], isBBoxEnabled);
            }
        }, 200);
    }

    function stopBackendPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        UI.updateMetrics(null);
        UI.updateConfidenceStats([]);
        UI.updateBBoxList([]);
        UI.drawBBoxes([], false);
    }

    // Auto-initialize video source
    switchVideoSource("../assets/dataset/video/farhuman_medium.mp4");
});