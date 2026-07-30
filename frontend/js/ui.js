/**
 * SAR-VISION // Tactical UI & HUD Rendering Engine
 * Handles DOM updates, canvas BBox overlays, theme engine, and video zoom controller.
 */
const UI = {
    elements: {
        timeDisplay: document.getElementById("system-time"),
        signalStatus: document.getElementById("signal-status"),
        activeSourceBadge: document.getElementById("active-source-badge"),
        hudLatency: document.getElementById("hud-latency"),
        
        videoContainer: document.getElementById("video-container"),
        videoViewportContent: document.getElementById("video-viewport-content"),
        videoPlayer: document.getElementById("video-player"),
        videoSource: document.getElementById("video-source"),
        streamImage: document.getElementById("video-stream"),
        bboxCanvas: document.getElementById("bbox-canvas"),
        
        controlsBar: document.getElementById("controls-bar"),
        btnPlay: document.getElementById("btn-play"),
        btnStop: document.getElementById("btn-stop"),
        videoSelect: document.getElementById("video-select"),
        timeline: document.getElementById("video-timeline"),
        timelineTime: document.getElementById("timeline-time"),
        toggleBBox: document.getElementById("toggle-bbox"),
        
        themeSelect: document.getElementById("theme-select"),
        
        btnZoomIn: document.getElementById("btn-zoom-in"),
        btnZoomOut: document.getElementById("btn-zoom-out"),
        btnZoomReset: document.getElementById("btn-zoom-reset"),
        zoomLevelText: document.getElementById("zoom-level-text"),
        
        modelSelect: document.getElementById("model-select"),
        currentModelBadge: document.getElementById("current-model-badge"),
        confThreshold: document.getElementById("conf-threshold"),
        confThreshVal: document.getElementById("conf-thresh-val"),
        
        metrics: {
            fpsGpu: document.getElementById("metric-fps-gpu"),
            fpsCpu: document.getElementById("metric-fps-cpu"),
            npu: document.getElementById("metric-npu"),
            people: document.getElementById("metric-people"),
            gt: document.getElementById("metric-gt"),
            inference: document.getElementById("metric-inference")
        },
        
        confidence: {
            mean: document.getElementById("conf-mean"),
            range: document.getElementById("conf-range"),
            barFill: document.getElementById("conf-bar-fill"),
            qualityText: document.getElementById("conf-quality-text"),
            highCount: document.getElementById("high-conf-count"),
            medCount: document.getElementById("med-conf-count")
        },
        
        bboxList: document.getElementById("bbox-list")
    },

    // Interactive Zoom & Pan State for Video Window Only
    zoomState: {
        scale: 1.0,
        translateX: 0,
        translateY: 0,
        isDragging: false,
        startX: 0,
        startY: 0,
        initialTransX: 0,
        initialTransY: 0
    },

    // Theme Switcher Engine
    setTheme(themeName) {
        document.body.className = themeName;
        if (this.elements.themeSelect) {
            this.elements.themeSelect.value = themeName;
        }
        try {
            localStorage.setItem("sar_theme", themeName);
        } catch (e) {}
    },

    // Initialize Canvas dimensions
    initCanvas() {
        const canvas = this.elements.bboxCanvas;
        const container = this.elements.videoContainer;
        if (canvas && container) {
            canvas.width = container.clientWidth || 800;
            canvas.height = container.clientHeight || 450;
        }
    },

    // Setup Video Window Zoom & Pan Listeners
    initVideoZoomController() {
        const container = this.elements.videoContainer;
        if (!container) return;

        container.addEventListener("wheel", (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.25 : -0.25;
            this.setZoomScale(this.zoomState.scale + delta);
        }, { passive: false });

        container.addEventListener("mousedown", (e) => {
            if (e.target.closest(".zoom-hud-badge")) return;

            if (this.zoomState.scale > 1.0) {
                this.zoomState.isDragging = true;
                this.zoomState.startX = e.clientX;
                this.zoomState.startY = e.clientY;
                this.zoomState.initialTransX = this.zoomState.translateX;
                this.zoomState.initialTransY = this.zoomState.translateY;
                container.classList.add("is-dragging");
            }
        });

        window.addEventListener("mousemove", (e) => {
            if (this.zoomState.isDragging) {
                const dx = e.clientX - this.zoomState.startX;
                const dy = e.clientY - this.zoomState.startY;
                this.zoomState.translateX = this.zoomState.initialTransX + dx;
                this.zoomState.translateY = this.zoomState.initialTransY + dy;
                this.applyZoomTransform();
            }
        });

        window.addEventListener("mouseup", () => {
            if (this.zoomState.isDragging) {
                this.zoomState.isDragging = false;
                container.classList.remove("is-dragging");
            }
        });

        container.addEventListener("dblclick", (e) => {
            if (e.target.closest(".zoom-hud-badge")) return;
            this.resetZoom();
        });

        if (this.elements.btnZoomIn) {
            this.elements.btnZoomIn.addEventListener("click", () => this.setZoomScale(this.zoomState.scale + 0.5));
        }
        if (this.elements.btnZoomOut) {
            this.elements.btnZoomOut.addEventListener("click", () => this.setZoomScale(this.zoomState.scale - 0.5));
        }
        if (this.elements.btnZoomReset) {
            this.elements.btnZoomReset.addEventListener("click", () => this.resetZoom());
        }
    },

    setZoomScale(newScale) {
        const clampedScale = Math.min(Math.max(1.0, parseFloat(newScale.toFixed(2))), 4.0);
        this.zoomState.scale = clampedScale;

        if (clampedScale === 1.0) {
            this.zoomState.translateX = 0;
            this.zoomState.translateY = 0;
        }
        this.applyZoomTransform();
    },

    resetZoom() {
        this.zoomState.scale = 1.0;
        this.zoomState.translateX = 0;
        this.zoomState.translateY = 0;
        this.applyZoomTransform();
    },

    applyZoomTransform() {
        const el = this.elements.videoViewportContent;
        if (!el) return;

        el.style.transform = `translate(${this.zoomState.translateX}px, ${this.zoomState.translateY}px) scale(${this.zoomState.scale})`;
        
        if (this.elements.zoomLevelText) {
            this.elements.zoomLevelText.textContent = `${this.zoomState.scale.toFixed(1)}x`;
        }

        const container = this.elements.videoContainer;
        if (container) {
            if (this.zoomState.scale > 1.0) {
                container.classList.add("is-zoomed");
            } else {
                container.classList.remove("is-zoomed");
            }
        }
    },

    // Update Hardware & Mission Telemetry numbers
    updateMetrics(data) {
        if (!data) {
            this.elements.metrics.fpsGpu.textContent = "0.0";
            this.elements.metrics.fpsCpu.textContent = "0.0";
            this.elements.metrics.npu.textContent = "STANDBY";
            this.elements.metrics.people.textContent = "0";
            this.elements.metrics.gt.textContent = "0";
            this.elements.metrics.inference.innerHTML = `0 <small>ms</small>`;
            this.elements.hudLatency.textContent = "-- ms";
            return;
        }

        this.elements.metrics.fpsGpu.textContent = (data.fps_gpu ?? data.fps ?? 0.0).toFixed(1);
        this.elements.metrics.fpsCpu.textContent = (data.fps_cpu ?? 0.0).toFixed(1);
        this.elements.metrics.npu.textContent = data.npu ?? data.other ?? "HAILO-8";
        this.elements.metrics.people.textContent = data.people ?? 0;
        this.elements.metrics.gt.textContent = data.gt ?? 0;
        this.elements.metrics.inference.innerHTML = `${data.inference ?? 0} <small>ms</small>`;
        this.elements.hudLatency.textContent = `${data.latency ?? 0} ms`;
    },

    // Update AI Confidence Statistics
    updateConfidenceStats(detections) {
        if (!detections || detections.length === 0) {
            this.elements.confidence.mean.textContent = "0.0%";
            this.elements.confidence.range.textContent = "0% - 0%";
            this.elements.confidence.barFill.style.width = "0%";
            this.elements.confidence.qualityText.textContent = "STANDBY";
            this.elements.confidence.qualityText.style.color = "var(--text-secondary)";
            this.elements.confidence.highCount.textContent = "0";
            this.elements.confidence.medCount.textContent = "0";
            return;
        }

        const confs = detections.map(d => d.conf);
        const sum = confs.reduce((a, b) => a + b, 0);
        const mean = sum / confs.length;
        const minConf = Math.min(...confs);
        const maxConf = Math.max(...confs);

        const highCount = confs.filter(c => c >= 75).length;
        const medCount = confs.filter(c => c >= 35 && c < 75).length;

        this.elements.confidence.mean.textContent = `${mean.toFixed(1)}%`;
        this.elements.confidence.range.textContent = `${minConf.toFixed(0)}% - ${maxConf.toFixed(0)}%`;
        this.elements.confidence.barFill.style.width = `${Math.min(mean, 100)}%`;
        
        this.elements.confidence.highCount.textContent = highCount;
        this.elements.confidence.medCount.textContent = medCount;

        if (mean >= 85) {
            this.elements.confidence.qualityText.textContent = "HIGH PRECISION";
            this.elements.confidence.qualityText.style.color = "var(--accent-olive)";
        } else if (mean >= 65) {
            this.elements.confidence.qualityText.textContent = "OPTIMAL";
            this.elements.confidence.qualityText.style.color = "var(--accent-khaki)";
        } else {
            this.elements.confidence.qualityText.textContent = "MODERATE";
            this.elements.confidence.qualityText.style.color = "var(--accent-red)";
        }
    },

    // Update real-time Target BBox Inspector list
    updateBBoxList(detections) {
        const container = this.elements.bboxList;
        if (!container) return;

        if (!detections || detections.length === 0) {
            container.innerHTML = `<div class="bbox-empty-state">NO ACTIVE DETECTIONS // AWAITING FASTAPI STREAM</div>`;
            return;
        }

        let html = "";
        detections.forEach(det => {
            const confClass = det.conf >= 75 ? "bbox-conf-high" : "bbox-conf-med";
            const statusClass = det.status === "LOCKED" ? "status-locked" : "status-tracking";
            const coordsStr = `[${det.bbox.map(n => Math.round(n)).join(", ")}]`;
            const formattedId = `#${det.id.toString().padStart(2, "0")} ${det.label.toUpperCase()}`;

            html += `
                <div class="bbox-item-row" title="Target ID ${det.id}">
                    <span class="bbox-id">${formattedId}</span>
                    <span class="bbox-conf-tag ${confClass}">${det.conf.toFixed(1)}%</span>
                    <span class="bbox-coords">${coordsStr}</span>
                    <span class="bbox-status-pill ${statusClass}">${det.status}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // Draw real-time bounding boxes on Canvas
    drawBBoxes(detections, isBBoxEnabled = true) {
        const canvas = this.elements.bboxCanvas;
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (!isBBoxEnabled || !detections || detections.length === 0) return;

        detections.forEach(det => {
            const [x1, y1, x2, y2] = det.bbox;
            const boxW = x2 - x1;
            const boxH = y2 - y1;

            const isLocked = det.status === "LOCKED";
            const primaryColor = isLocked ? "var(--accent-red)" : "var(--accent-olive)";

            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x1, y1, boxW, boxH);

            ctx.fillStyle = isLocked ? "rgba(224, 72, 72, 0.08)" : "rgba(163, 203, 108, 0.08)";
            ctx.fillRect(x1, y1, boxW, boxH);

            const labelText = `#${det.id} ${det.label.toUpperCase()} | ${det.conf.toFixed(1)}%`;
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const textMetrics = ctx.measureText(labelText);
            const tagW = textMetrics.width + 12;
            const tagH = 18;
            const tagX = x1;
            const tagY = Math.max(0, y1 - tagH);

            ctx.fillStyle = isLocked ? "rgba(224, 72, 72, 0.9)" : "rgba(19, 27, 21, 0.95)";
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 1;
            ctx.fillRect(tagX, tagY, tagW, tagH);
            ctx.strokeRect(tagX, tagY, tagW, tagH);

            ctx.fillStyle = isLocked ? "#ffffff" : primaryColor;
            ctx.fillText(labelText, tagX + 6, tagY + 13);

            const coordText = `[${Math.round(x1)}, ${Math.round(y1)}, ${Math.round(x2)}, ${Math.round(y2)}]`;
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.fillStyle = "var(--text-secondary)";
            ctx.fillText(coordText, x1, y2 + 13);
        });
    },

    updateActiveModel(modelName) {
        this.elements.currentModelBadge.textContent = modelName.toUpperCase();
    },

    updateClock() {
        const now = new Date();
        this.elements.timeDisplay.textContent = now.toISOString().slice(11, 19) + " UTC";
    }
};