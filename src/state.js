// state.js - Global application state and chord definitions

export const NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B"
];

// Exactly 10 chords to be displayed in a 2x5 grid
export const chords = [
    { note: 0, quality: "maj" }, // C
    { note: 2, quality: "maj" }, // D
    { note: 4, quality: "maj" }, // E
    { note: 5, quality: "maj" }, // F
    { note: 7, quality: "maj" }, // G

    { note: 9, quality: "maj" }, // A
    { note: 2, quality: "min" }, // Dm
    { note: 4, quality: "min" }, // Em
    { note: 9, quality: "min" }, // Am
    { note: 11, quality: "7" }   // B7
];

export const appState = {
    capo: 0,
    activeChordIndex: null,
    gridOffset: { x: 0, y: 0 }, // Used for draggable UI
    gridScale: 1.0,
    showTransposed: false
};
