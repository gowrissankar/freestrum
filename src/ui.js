// ui.js - Coordinate canvas rendering, UI layer, and grid-hover collision check

// the canvas layer 

export function setupCanvas(video) {
    const canvas = document.getElementById("overlay");
    const ctx = canvas.getContext("2d");

    //adjust size 
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    return { canvas, ctx };

}

export function renderFrame(video, ctx, canvas) {
    //miriror 
    ctx.save();
    ctx.translate(canvas.width, 0); //move origin 
    ctx.scale(-1, 1);  //flip x axis 

    //erase prev frame 
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    ctx.restore();

}


import { chords, NOTE_NAMES, appState } from './state';
import { CONFIG } from './constants';



//========= UI label ==========
function getChordLabel(chord, capo) {
    const shiftedNote =
        (chord.note + capo) % 12;

    const noteName =
        NOTE_NAMES[shiftedNote];

    const suffixMap = {
        maj: "",
        min: "m",
        "7": "7"
    };

    return (
        noteName + suffixMap[chord.quality]
    );
}


//========= display boxes =========
export function generateChordBoxes(canvas) {
    const boxes = [];

    const {
        GRID_COLS: cols,
        GRID_ROWS: rows,
        GRID_GAP: gap,
        GRID_X_PERCENT: xPercent,
        GRID_Y_PERCENT: yPercent,
        GRID_WIDTH_PERCENT: widthPercent,
        GRID_HEIGHT_PERCENT: heightPercent
    } = CONFIG;

    const scale = appState.gridScale || 1.0;

    const regionX =
        canvas.width * xPercent + (appState.gridOffset?.x || 0);

    const regionY =
        canvas.height * yPercent + (appState.gridOffset?.y || 0);

    const regionW =
        canvas.width * widthPercent * scale;

    const regionH =
        canvas.height * heightPercent * scale;

    const cellW =
        (regionW - gap * (cols - 1)) / cols;

    const cellH =
        (regionH - gap * (rows - 1)) / rows;

    for (let i = 0; i < chords.length; i++) {
        // Zig-zag priority layout: columns populated left-to-right, row 0 then row 1 per column:
        // 1 3 5 7 9
        // 2 4 6 8 10
        const col = Math.floor(i / 2);
        const row = i % 2;

        boxes.push({
            ...chords[i],
            index: i,

            x:
                regionX +
                col * (cellW + gap),

            y:
                regionY +
                row * (cellH + gap),

            w: cellW,
            h: cellH
        });
    }

    return boxes;
}


//=========chord grid===========
export function drawChordGrid(ctx, boxes) {
    ctx.lineWidth = 2;
    ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const box of boxes) {
        const isActive =
            box.index ===
            appState.activeChordIndex;

        // Sleek cyan wireframe UI
        ctx.strokeStyle = isActive ? CONFIG.COLOR_GRID_ACTIVE_BORDER : CONFIG.COLOR_GRID_INACTIVE_BORDER;
        ctx.fillStyle = isActive ? CONFIG.COLOR_GRID_ACTIVE_BG : CONFIG.COLOR_GRID_INACTIVE_BG;

        // Square boxes touching each other
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        const label =
            getChordLabel(
                box,
                appState.showTransposed ? appState.capo : 0
            );

        ctx.fillStyle = isActive ? "#ffffff" : "rgba(255, 255, 255, 0.9)";
        
        ctx.fillText(
            label,
            box.x + box.w / 2,
            box.y + box.h / 2
        );
    }
}

//============box render=============
export function renderbox(
    video,
    ctx,
    canvas,
    flashOpacity = 0
) {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // mirror webcam only
    ctx.save();
    ctx.translate(
        canvas.width,
        0
    );
    ctx.scale(-1, 1);

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.restore();

    const boxes = generateChordBoxes(canvas);

    drawChordGrid(ctx, boxes);

    // Premium subtle full-screen flash effect on strum
    if (flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity * 0.18})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}



//===========collision det==========
export function getBoxAtPosition(x, y, boxes) {
    for (const box of boxes) {
        const insideX =
            x >= box.x &&
            x <= box.x + box.w;

        const insideY =
            y >= box.y &&
            y <= box.y + box.h;

        if (insideX && insideY) {
            return box;
        }
    }

    return null;
}




const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring
    [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
];

export function drawLandmarks(
    ctx,
    canvas,
    result
) {
    if (!result) return;

    ctx.fillStyle = CONFIG.COLOR_SKELETON;
    ctx.strokeStyle = CONFIG.COLOR_SKELETON;
    ctx.lineWidth = 2;

    for (const hand of result.landmarks) {
        // Draw connections (skeleton)
        for (const [i, j] of HAND_CONNECTIONS) {
            const p1 = hand[i];
            const p2 = hand[j];

            const x1 = (1 - p1.x) * canvas.width;
            const y1 = p1.y * canvas.height;
            const x2 = (1 - p2.x) * canvas.width;
            const y2 = p2.y * canvas.height;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Draw points
        for (const point of hand) {
            const x = (1 - point.x) * canvas.width;
            const y = point.y * canvas.height;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}