// state.js - Global application state and chord definitions

export const NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B"
];

export const chords = [
    { note: 7, quality: "maj" }, // G
    { note: 0, quality: "maj" }, // C
    { note: 2, quality: "maj" }, // D
    { note: 4, quality: "min" }, // Em
    { note: 9, quality: "min" }, // Am

    { note: 5, quality: "maj" }, // F
    { note: 4, quality: "maj" }, // E
    { note: 9, quality: "maj" }, // A
    { note: 2, quality: "min" }, // Dm
    { note: 11, quality: "7" }   // B7
];

export const appState = {
    capo: 0,
    activeChordIndex: null,
    gridOffset: { x: 0, y: 0 }, // Used for draggable UI
    gridScale: 0.5,
    showTransposed: false
};
