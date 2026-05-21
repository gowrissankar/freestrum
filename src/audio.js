// audio.js - Tone.js guitar chord polyphonic audio engine

import * as Tone from "tone"
import { NOTE_NAMES } from "./state"

// A gorgeous, highly-audible polyphonic pluck synth using Tone.Synth
export const guitarSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "triangle" // Softer, warmer pluck sound than sine/square
    },
    envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.8, // Increased sustain to hold the chord
        release: 0.5  // Smoother release when switching chords
    }
}).toDestination();

// Adjust the volume to prevent clipping while maintaining high audibility
guitarSynth.volume.value = -4;

// Automatically resume/start AudioContext on very first user click or keydown
if (typeof window !== "undefined") {
    const resumeAudio = async () => {
        await Tone.start();
        console.log("Tone.js AudioContext active!");
        window.removeEventListener("click", resumeAudio);
        window.removeEventListener("keydown", resumeAudio);
    };
    window.addEventListener("click", resumeAudio);
    window.addEventListener("keydown", resumeAudio);
}

function getIntervals(quality) {
    const intervalMap = {
        maj: [0, 4, 7],
        min: [0, 3, 7],
        "7": [0, 4, 7, 10],
        maj7: [0, 4, 7, 11],
        min7: [0, 3, 7, 10],
        dim: [0, 3, 6],
        aug: [0, 4, 8]
    };

    return (intervalMap[quality] ?? intervalMap.maj);
}

export function buildChordNotes(chord, capo = 0) {
    const root = (chord.note + capo) % 12;
    const intervals = getIntervals(chord.quality);

    return intervals.map(
        (step, i) => {
            const note =
                (root + step) % 12;

            const octave =
                3 + Math.floor(i / 3);

            return (
                NOTE_NAMES[note] +
                octave
            );
        }
    );
}

let activeNotes = [];

export function startChord(chord, capo = 0) {
    if (activeNotes.length > 0) {
        guitarSynth.triggerRelease(activeNotes);
    }
    
    const notes = buildChordNotes(chord, capo);
    console.log("Starting chord notes:", notes);
    
    guitarSynth.triggerAttack(notes);
    activeNotes = notes;
}

export function stopChord() {
    if (activeNotes.length > 0) {
        guitarSynth.triggerRelease(activeNotes);
        activeNotes = [];
    }
}
