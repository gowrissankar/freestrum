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


//=========layout===========
const gridConfig = {
    cols: 5,
    rows: 2,
    gap: 0,

    xPercent: 0.1,
    yPercent: 0.5,
    widthPercent: 0.8,
    heightPercent: 0.3
};

export function drawCapoLabel(ctx, boxes) {
    if (boxes.length === 0) return;

    const lastBox = boxes[boxes.length - 1];

    const gridBottom =
        lastBox.y + lastBox.h;

    ctx.fillStyle = "white";
    ctx.font = "22px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.fillText(
        `Capo: ${appState.capo}`,
        boxes[0].x,
        gridBottom + 20
    );
}

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
        cols,
        rows,
        gap,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent
    } = gridConfig;

    const regionX =
        canvas.width * xPercent + (appState.gridOffset?.x || 0);

    const regionY =
        canvas.height * yPercent + (appState.gridOffset?.y || 0);

    const regionW =
        canvas.width * widthPercent;

    const regionH =
        canvas.height * heightPercent;

    const cellW =
        (regionW - gap * (cols - 1)) / cols;

    const cellH =
        (regionH - gap * (rows - 1)) / rows;

    for (let i = 0; i < chords.length; i++) {
        const row =
            Math.floor(i / cols);

        const col =
            i % cols;

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
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const box of boxes) {
        const isActive =
            box.index ===
            appState.activeChordIndex;

        // Sleek cyan wireframe UI
        ctx.strokeStyle = isActive ? "rgba(0, 229, 255, 1)" : "rgba(0, 229, 255, 0.5)";
        ctx.fillStyle = isActive ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 0, 0, 0.4)";

        // Square boxes touching each other
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        const label =
            getChordLabel(
                box,
                appState.capo
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
    canvas
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
    drawCapoLabel(ctx, boxes);

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

    ctx.fillStyle = "#ff6b6b";
    ctx.strokeStyle = "#ff6b6b";
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