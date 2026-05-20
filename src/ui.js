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


export const chords = [
    { note: 0, quality: "maj", active: false }, // C
    { note: 7, quality: "maj", active: false }, // G
    { note: 9, quality: "min", active: false }, // Am
    { note: 5, quality: "maj", active: false }, // F

    { note: 2, quality: "min", active: false }, // Dm
    { note: 4, quality: "min", active: false }, // Em
    { note: 9, quality: "maj", active: false }, // A
    { note: 4, quality: "maj", active: false }  // E
];

// semitone → note names // mapping ot numbers 
const NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B"
];


export const appState = {
    capo: 0,
    activeChordIndex: null
};


//=========layout===========
const gridConfig = {
    cols: 4,
    rows: 2,
    gap: 12,

    xPercent: 0.05,
    yPercent: 0.10,
    widthPercent: 0.40,
    heightPercent: 0.30
};


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
        canvas.width * xPercent;

    const regionY =
        canvas.height * yPercent;

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

        ctx.strokeStyle =
            isActive ? "lime" : "white";

        ctx.fillStyle = "white";

        ctx.strokeRect(
            box.x,
            box.y,
            box.w,
            box.h
        );

        const label =
            getChordLabel(
                box,
                appState.capo
            );

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

    const boxes =
        generateChordBoxes(canvas);

    drawChordGrid(
        ctx,
        boxes
    );
}


