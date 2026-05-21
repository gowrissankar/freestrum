// main.js - Application entry point and coordination brain
console.log('FreeStrum Initialized!');

import './style.css'
import { setupCamera, detectHands, setupHandTracking } from './tracking';
import { renderbox, setupCanvas, generateChordBoxes, getBoxAtPosition, drawLandmarks } from './ui';
import { startSustainedChord, playFadedChord, killAll } from "./audio";
import { appState, chords, NOTE_NAMES } from "./state";
import { CONFIG } from "./constants";

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
    // Setup camera 
    const video = await setupCamera();
    console.log("Cam ready", video);

    // Setup MediaPipe Hand Tracking
    await setupHandTracking();
    console.log("Hand tracking ready");

    // Setup canvas 
    const { canvas, ctx } = setupCanvas(video);
    console.log("Canvas ready", canvas);

    let hoverTimer = null;
    let hoveredIndex = null;
    
    // Strum State
    let lastStrumY = 0;
    let lastStrumTime = 0;
    let isSustaining = false;
    let flashOpacity = 0;

    // Dashboard Updates
    function updateDashboard() {
        document.getElementById("capo-display").textContent = appState.capo;
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
    
    updateDashboard();

    // Hover debounce logic
    function handleHoverChange(newHoveredIndex) {
        if (hoveredIndex === newHoveredIndex) return;

        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }

        hoveredIndex = newHoveredIndex;

        if (hoveredIndex !== null) {
            hoverTimer = setTimeout(() => {
                appState.activeChordIndex = hoveredIndex;
                updateDashboard();
                
                // Synth Mode: instantly switch sound if we are currently sustaining with an open hand
                if (isSustaining) {
                    startSustainedChord(chords[hoveredIndex], appState.capo);
                }
            }, CONFIG.HOVER_DELAY_MS);
        } else {
            hoverTimer = setTimeout(() => {
                appState.activeChordIndex = null;
                updateDashboard();
                killAll(); // Stop sound if we leave the grid completely
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

    function animate() {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        
        // Render mirrored video, boxes, and strum line
        renderbox(video, ctx, canvas, flashOpacity);
        
        const result = detectHands(video);
        
        if (result && result.landmarks && result.landmarks.length > 0) {
            drawLandmarks(ctx, canvas, result);
            
            let leftHand = null;
            let rightHand = null;

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

            // Right Hand: Strumming & Synth State
            if (rightHand) {
                const state = getFistState(rightHand);
                const isFistClosed = state === "CLOSED";
                const rightHandY = rightHand[0].y; // Palm Y coordinate

                // Update Dashboard State
                document.getElementById("state-display").textContent = isFistClosed ? "Fade (Closed)" : "Sustain (Open)";

                // Detect Downstrum
                const now = Date.now();
                if (lastStrumY < CONFIG.STRUM_LINE_Y && rightHandY >= CONFIG.STRUM_LINE_Y) {
                    if (now - lastStrumTime > CONFIG.STRUM_COOLDOWN_MS) {
                        lastStrumTime = now;
                        flashOpacity = 1.0; 
                        
                        if (appState.activeChordIndex !== null) {
                            if (isFistClosed) {
                                playFadedChord(chords[appState.activeChordIndex], appState.capo);
                                isSustaining = false;
                            } else {
                                startSustainedChord(chords[appState.activeChordIndex], appState.capo);
                                isSustaining = true;
                            }
                        }
                    }
                }
                
                // If hand was open (sustaining) and now closes -> trigger fade out release
                if (isSustaining && isFistClosed) {
                    isSustaining = false;
                    killAll(); 
                }

                lastStrumY = rightHandY;
            }
        }

        // Decay flash opacity
        if (flashOpacity > 0) flashOpacity = Math.max(0, flashOpacity - 0.05);

        requestAnimationFrame(animate);
    }

    animate();
}

init();






