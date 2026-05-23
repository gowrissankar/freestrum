// main.js - Application entry point and coordination brain
console.log('FreeStrum Initialized!');

import './style.css'
import { setupCamera, detectHands, setupHandTracking } from './tracking';
import { renderbox, setupCanvas, generateChordBoxes, getBoxAtPosition, drawLandmarks } from './ui';
import { startAbsoluteSustain, playFadedChord, killAll } from "./audio";
import { appState, chords, NOTE_NAMES } from "./state";
import { CONFIG } from "./constants";
import * as Tone from "tone";

function getFistState(handLandmarks) {
    const palm = handLandmarks[0];
    const tips = [8, 12, 16, 20];
    let totalDist = 0;

    for (let tip of tips) {
        const dx = handLandmarks[tip].x - palm.x;
        const dy = handLandmarks[tip].y - palm.y;
        totalDist += Math.sqrt(dx * dx + dy * dy);
    }
    const avgDist = totalDist / 4;
    return avgDist < CONFIG.FIST_THRESHOLD ? "CLOSED" : "OPEN";
}

async function init() {
    const setStepState = (id, state) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("active", "done");
        if (state === "active") el.classList.add("active");
        if (state === "done") el.classList.add("done");
    };

    // Begin concurrent setup
    setStepState("step-camera", "active");
    setStepState("step-vision", "active");
    setStepState("step-audio", "active");

    const cameraPromise = setupCamera().then((video) => {
        console.log("Cam ready", video);
        setStepState("step-camera", "done");
        return video;
    });

    const visionPromise = setupHandTracking().then(() => {
        console.log("Hand tracking ready");
        setStepState("step-vision", "done");
    });

    const audioPromise = Tone.loaded().then(() => {
        console.log("Acoustic samples loaded!");
        setStepState("step-audio", "done");
    });

    // Await all components concurrently
    const [video] = await Promise.all([cameraPromise, visionPromise, audioPromise]);

    // Fade out and clean up preloader UI
    const preloader = document.getElementById("preloader");
    if (preloader) {
        preloader.classList.add("fade-out");
        setTimeout(() => preloader.remove(), 600);
    }

    // Setup canvas 
    const { canvas, ctx } = setupCanvas(video);
    console.log("Canvas ready", canvas);

    let hoverTimer = null;
    let hoveredIndex = null;

    // Strum & Interaction State
    let lastStrumTime = 0;
    let lastRightHandY = 0;
    let isSustaining = false;
    let lastSustainedChordIndex = null;
    let flashOpacity = 0;

    // Dashboard Updates
    function updateDashboard() {
        document.getElementById("capo-display").textContent = appState.capo;

        // Update relative/absolute chord view toggle text
        const toggleBtn = document.getElementById("chord-mode-toggle");
        if (toggleBtn) {
            toggleBtn.textContent = appState.showTransposed ? "Show: Transposed" : "Show: Original";
        }

        // Update grid size display
        const sizeDisplay = document.getElementById("size-display");
        if (sizeDisplay) {
            sizeDisplay.textContent = Math.round((appState.gridScale || 1.0) * 100) + "%";
        }

        if (appState.activeChordIndex !== null) {
            const chord = chords[appState.activeChordIndex];
            const shiftedNote = (chord.note + appState.capo) % 12;
            const suffixMap = { maj: "", min: "m", "7": "7" };
            document.getElementById("chord-display").textContent = NOTE_NAMES[shiftedNote] + suffixMap[chord.quality];
        } else {
            document.getElementById("chord-display").textContent = "--";
        }
    }

    document.getElementById("capo-up").addEventListener("click", () => {
        appState.capo = (appState.capo + 1) % 12;
        updateDashboard();
    });

    document.getElementById("capo-down").addEventListener("click", () => {
        appState.capo = (appState.capo - 1 + 12) % 12;
        updateDashboard();
    });

    // Cape chords view toggler
    document.getElementById("chord-mode-toggle").addEventListener("click", () => {
        appState.showTransposed = !appState.showTransposed;
        updateDashboard();
    });

    // Table Grid Resizing Listeners
    document.getElementById("size-up").addEventListener("click", () => {
        appState.gridScale = Math.min(2.0, (appState.gridScale || 1.0) + 0.1);
        document.getElementById("size-display").textContent = Math.round(appState.gridScale * 100) + "%";
    });

    document.getElementById("size-down").addEventListener("click", () => {
        appState.gridScale = Math.max(0.4, (appState.gridScale || 1.0) - 0.1);
        document.getElementById("size-display").textContent = Math.round(appState.gridScale * 100) + "%";
    });

    // Slick mouse wheel zooming directly on canvas
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const scaleStep = 0.05;
        let scale = appState.gridScale || 1.0;
        if (e.deltaY < 0) {
            scale = Math.min(2.0, scale + scaleStep);
        } else {
            scale = Math.max(0.4, scale - scaleStep);
        }
        appState.gridScale = scale;
        document.getElementById("size-display").textContent = Math.round(scale * 100) + "%";
    }, { passive: false });

    updateDashboard();

    // Hover debounce logic
    function handleHoverChange(newHoveredIndex) {
        if (hoveredIndex === newHoveredIndex) return;

        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }

        hoveredIndex = newHoveredIndex;

        // Immediately kill any active sounds on chord switch to eliminate overlaps / buildup
        killAll();

        if (hoveredIndex !== null) {
            hoverTimer = setTimeout(() => {
                appState.activeChordIndex = hoveredIndex;
                updateDashboard();

                // Synth Mode: instantly switch sound if we are currently sustaining with an open hand
                if (isSustaining) {
                    startAbsoluteSustain(chords[hoveredIndex], appState.capo);
                    lastSustainedChordIndex = hoveredIndex;
                }
            }, CONFIG.HOVER_DELAY_MS);
        } else {
            hoverTimer = setTimeout(() => {
                appState.activeChordIndex = null;
                updateDashboard();
            }, CONFIG.HOVER_DELAY_MS);
        }
    }

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialOffset = { x: 0, y: 0 };

    // Accurate mouse mapping for object-fit: contain
    function getCanvasPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const canvasRatio = canvas.width / canvas.height;
        const rectRatio = rect.width / rect.height;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (canvasRatio > rectRatio) {
            // object-fit contain scales to fit width, letterboxing top/bottom
            renderWidth = rect.width;
            renderHeight = renderWidth / canvasRatio;
            offsetX = 0;
            offsetY = (rect.height - renderHeight) / 2;
        } else {
            // object-fit contain scales to fit height, pillarboxing sides
            renderHeight = rect.height;
            renderWidth = renderHeight * canvasRatio;
            offsetX = (rect.width - renderWidth) / 2;
            offsetY = 0;
        }

        const mouseX = (e.clientX - rect.left - offsetX) * (canvas.width / renderWidth);
        const mouseY = (e.clientY - rect.top - offsetY) * (canvas.height / renderHeight);

        return { mouseX, mouseY };
    }

    function getTouchCanvasPos(e, canvas) {
        if (!e.touches || e.touches.length === 0) return { mouseX: 0, mouseY: 0 };
        const touch = e.touches[0];
        return getCanvasPos({ clientX: touch.clientX, clientY: touch.clientY }, canvas);
    }

    canvas.addEventListener("mousedown", (e) => {
        const { mouseX, mouseY } = getCanvasPos(e, canvas);
        isDragging = true;
        dragStartX = mouseX;
        dragStartY = mouseY;
        initialOffset = { ...appState.gridOffset };
    });

    canvas.addEventListener("mouseup", () => {
        isDragging = false;
    });

    canvas.addEventListener("mousemove", (e) => {
        const { mouseX, mouseY } = getCanvasPos(e, canvas);

        if (isDragging) {
            appState.gridOffset.x = initialOffset.x + (mouseX - dragStartX);
            appState.gridOffset.y = initialOffset.y + (mouseY - dragStartY);
            return;
        }

        const boxes = generateChordBoxes(canvas);
        const hitBox = getBoxAtPosition(mouseX, mouseY, boxes);

        handleHoverChange(hitBox ? hitBox.index : null);
    });

    // Touch event listeners for mobile/tablet drag-and-drop
    canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
            const { mouseX, mouseY } = getTouchCanvasPos(e, canvas);
            isDragging = true;
            dragStartX = mouseX;
            dragStartY = mouseY;
            initialOffset = { ...appState.gridOffset };
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener("touchend", () => {
        isDragging = false;
    });

    canvas.addEventListener("touchmove", (e) => {
        if (isDragging && e.touches.length === 1) {
            const { mouseX, mouseY } = getTouchCanvasPos(e, canvas);
            appState.gridOffset.x = initialOffset.x + (mouseX - dragStartX);
            appState.gridOffset.y = initialOffset.y + (mouseY - dragStartY);
            e.preventDefault();
        }
    }, { passive: false });

    function animate() {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        // Render mirrored video, boxes, and strum line
        renderbox(video, ctx, canvas, flashOpacity);

        const result = detectHands(video);

        let leftHand = null;
        let rightHand = null;

        if (result && result.landmarks && result.landmarks.length > 0) {
            drawLandmarks(ctx, canvas, result);

            // Differentiate left and right hand based on mirrored screen X coordinate
            for (const hand of result.landmarks) {
                const palmX = (1 - hand[0].x);
                if (palmX < 0.5 && !leftHand) leftHand = hand;
                else if (palmX >= 0.5 && !rightHand) rightHand = hand;
            }

            // Left Hand: Chord Selection
            if (leftHand) {
                const indexFinger = leftHand[8];
                const pointerX = (1 - indexFinger.x) * canvas.width;
                const pointerY = indexFinger.y * canvas.height;
                const boxes = generateChordBoxes(canvas);
                const hitBox = getBoxAtPosition(pointerX, pointerY, boxes);
                handleHoverChange(hitBox ? hitBox.index : null);
            }
        }

        // Right Hand: Strumming & Synth State
        if (rightHand) {
            const state = getFistState(rightHand);
            const isFistClosed = state === "CLOSED";

            // Compute average Y coordinate of right hand landmarks for high-accuracy velocity tracking
            let currentHandY = 0;
            for (let pt of rightHand) {
                currentHandY += pt.y;
            }
            currentHandY /= rightHand.length;

            // Update Dashboard State
            document.getElementById("state-display").textContent = isFistClosed ? "Fade" : "Sustain";

            const now = Date.now();
            const dy = currentHandY - lastRightHandY;

            // 1. Continuous Sustain Trigger Logic
            if (!isFistClosed) {
                // Sustain mode is active
                if (!isSustaining || appState.activeChordIndex !== lastSustainedChordIndex) {
                    isSustaining = true;
                    if (appState.activeChordIndex !== null) {
                        startAbsoluteSustain(chords[appState.activeChordIndex], appState.capo);
                        lastSustainedChordIndex = appState.activeChordIndex;
                    } else {
                        killAll();
                        lastSustainedChordIndex = null;
                    }
                }
            } else {
                // Closed fist (Fade mode)
                if (isSustaining) {
                    // Just transitioned from Sustain (Open) to Fade (Closed) -> Kill sound immediately
                    isSustaining = false;
                    lastSustainedChordIndex = null;
                    killAll();
                }
            }

            // 2. Active Downstrum Detection (only in closed fist / fade mode)
            if (isFistClosed && lastRightHandY > 0 && dy > CONFIG.STRUM_VELOCITY_THRESHOLD) {
                if (now - lastStrumTime > CONFIG.STRUM_COOLDOWN_MS) {
                    lastStrumTime = now;
                    flashOpacity = 1.0;

                    // Instant commitment: Bypass hover delay on active strum
                    if (hoveredIndex !== null && appState.activeChordIndex !== hoveredIndex) {
                        if (hoverTimer) {
                            clearTimeout(hoverTimer);
                            hoverTimer = null;
                        }
                        appState.activeChordIndex = hoveredIndex;
                        updateDashboard();
                    }

                    if (appState.activeChordIndex !== null) {
                        playFadedChord(chords[appState.activeChordIndex], appState.capo);
                    }
                }
            }

            lastRightHandY = currentHandY;
        } else {
            // Update Dashboard State when hand is missing/undetected
            document.getElementById("state-display").textContent = "Undetected";

            // If right hand is lost/out of frame, turn off sustain
            if (isSustaining) {
                isSustaining = false;
                lastSustainedChordIndex = null;
                killAll();
            }
            lastRightHandY = 0;
        }

        // Decay flash opacity
        if (flashOpacity > 0) flashOpacity = Math.max(0, flashOpacity - 0.05);

        requestAnimationFrame(animate);
    }

    animate();
}

init();






