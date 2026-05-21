// main.js - Application entry point and coordination brain
console.log('FreeStrum Initialized!');

import './style.css'
import { setupCamera, detectHands, setupHandTracking } from './tracking';
import { renderbox, setupCanvas, generateChordBoxes, getBoxAtPosition, drawLandmarks } from './ui';
import { startChord, stopChord } from "./audio";
import { appState, chords } from "./state";

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
    const HOVER_DELAY_MS = 250;

    // Hover debounce logic
    function handleHoverChange(newHoveredIndex) {
        if (hoveredIndex === newHoveredIndex) return;

        // Clear existing timer if moving to a different box
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }

        hoveredIndex = newHoveredIndex;

        if (hoveredIndex !== null) {
            // Start timer for the new chord
            hoverTimer = setTimeout(() => {
                appState.activeChordIndex = hoveredIndex;
                startChord(chords[hoveredIndex], appState.capo);
            }, HOVER_DELAY_MS);
        } else {
            // If moved outside any box, stop playing after a short delay
            hoverTimer = setTimeout(() => {
                appState.activeChordIndex = null;
                stopChord();
            }, HOVER_DELAY_MS);
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

        if (rectRatio > canvasRatio) {
            renderHeight = rect.height;
            renderWidth = renderHeight * canvasRatio;
            offsetX = (rect.width - renderWidth) / 2;
            offsetY = 0;
        } else {
            renderWidth = rect.width;
            renderHeight = renderWidth / canvasRatio;
            offsetX = 0;
            offsetY = (rect.height - renderHeight) / 2;
        }

        const mouseX = (e.clientX - rect.left - offsetX) * (canvas.width / renderWidth);
        const mouseY = (e.clientY - rect.top - offsetY) * (canvas.height / renderHeight);

        return { mouseX, mouseY };
    }

    canvas.addEventListener("mousedown", (e) => {
        const { mouseX, mouseY } = getCanvasPos(e, canvas);
        const boxes = generateChordBoxes(canvas);
        const hitBox = getBoxAtPosition(mouseX, mouseY, boxes);

        if (hitBox || true) { // Allow dragging from anywhere for now
            isDragging = true;
            dragStartX = mouseX;
            dragStartY = mouseY;
            initialOffset = { ...appState.gridOffset };
        }
    });

    canvas.addEventListener("mouseup", () => {
        isDragging = false;
    });

    canvas.addEventListener("mousemove", (e) => {
        const { mouseX, mouseY } = getCanvasPos(e, canvas);

        if (isDragging) {
            appState.gridOffset.x = initialOffset.x + (mouseX - dragStartX);
            appState.gridOffset.y = initialOffset.y + (mouseY - dragStartY);
            return; // Pause hover sounds while moving the grid
        }

        const boxes = generateChordBoxes(canvas);
        const hitBox = getBoxAtPosition(mouseX, mouseY, boxes);

        handleHoverChange(hitBox ? hitBox.index : null);
    });

    // Keyboard support for testing chords
    window.addEventListener("keydown", (e) => {
        const key = Number(e.key);
        if (key >= 1 && key <= 8) {
            const index = key - 1;
            appState.activeChordIndex = index;
            startChord(chords[index], appState.capo);
        }
    });

    window.addEventListener("keyup", (e) => {
        const key = Number(e.key);
        if (key >= 1 && key <= 8) {
            // Only stop if the lifted key matches the active chord
            if (appState.activeChordIndex === key - 1) {
                appState.activeChordIndex = null;
                stopChord();
            }
        }
    });

    function animate() {
        // Dynamically resize canvas
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        
        // Render mirrored video and boxes
        renderbox(video, ctx, canvas);
        
        // Run hand detection
        const result = detectHands(video);
        
        // If hands are detected
        if (result && result.landmarks && result.landmarks.length > 0) {
            drawLandmarks(ctx, canvas, result);
            
            // Track the index finger tip (landmark 8) of the first detected hand
            const indexFinger = result.landmarks[0][8];
            
            // Mirror the X coordinate because the canvas is mirrored horizontally
            const pointerX = (1 - indexFinger.x) * canvas.width;
            const pointerY = indexFinger.y * canvas.height;
            
            const boxes = generateChordBoxes(canvas);
            const hitBox = getBoxAtPosition(pointerX, pointerY, boxes);
            
            handleHoverChange(hitBox ? hitBox.index : null);
        }

        requestAnimationFrame(animate);
    }

    animate();
}

init();






