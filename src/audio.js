// audio.js - Tone.js acoustic guitar sampler and audio engine

import * as Tone from "tone";
import { NOTE_NAMES } from "./state";
import { CONFIG } from "./constants";

export let isAudioReady = false;

// 1. Post-Processing Signal Chain Architecture
// Node A: Wood Resonance Shaper (boost mid, slight dip high)
const eq = new Tone.EQ3({
    low: 1,
    mid: 3,
    high: -2
});

// Node B: Spatial Spreader (Subtle Chorus)
const chorus = new Tone.Chorus({
    frequency: 1.5,
    delayTime: 3.5,
    depth: 0.2,
    wet: 0.15
}).start(); // Chorus must be started

// Node C: Ambient Room Decay
const reverb = new Tone.Reverb({
    decay: CONFIG.REVERB_DECAY_TIME,
    wet: 0.25
});

// 2. The Acoustic Guitar Sampler
export const guitarSynth = new Tone.Sampler({
    urls: {
        'F4': 'F4.mp3',
        'F#2': 'Fs2.mp3',
        'F#3': 'Fs3.mp3',
        'F#4': 'Fs4.mp3',
        'G2': 'G2.mp3',
        'G3': 'G3.mp3',
        'G4': 'G4.mp3',
        'G#2': 'Gs2.mp3',
        'G#3': 'Gs3.mp3',
        'G#4': 'Gs4.mp3',
        'A2': 'A2.mp3',
        'A3': 'A3.mp3',
        'A4': 'A4.mp3',
        'A#2': 'As2.mp3',
        'A#3': 'As3.mp3',
        'A#4': 'As4.mp3',
        'B2': 'B2.mp3',
        'B3': 'B3.mp3',
        'B4': 'B4.mp3',
        'C3': 'C3.mp3',
        'C4': 'C4.mp3',
        'C5': 'C5.mp3',
        'C#3': 'Cs3.mp3',
        'C#4': 'Cs4.mp3',
        'C#5': 'Cs5.mp3',
        'D2': 'D2.mp3',
        'D3': 'D3.mp3',
        'D4': 'D4.mp3',
        'D5': 'D5.mp3',
        'D#2': 'Ds2.mp3',
        'D#3': 'Ds3.mp3',
        'D#4': 'Ds3.mp3',
        'E2': 'E2.mp3',
        'E3': 'E3.mp3',
        'E4': 'E4.mp3',
        'F2': 'F2.mp3',
        'F3': 'F3.mp3'
    },
    release: 1, // Base release, overridden dynamically during muting
    baseUrl: "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/",
    onload: () => {
        isAudioReady = true;
        console.log("Acoustic Guitar Samples Loaded!");
    }
});

// Wire the signal chain
guitarSynth.chain(eq, chorus, reverb, Tone.Destination);

guitarSynth.volume.value = 0;

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

    // Mimic string layout across octaves
    return intervals.map(
        (step, i) => {
            const note = (root + step) % 12;
            const octave = 3 + Math.floor(i / 3);
            return (NOTE_NAMES[note] + octave);
        }
    );
}

let activeNotes = [];

// The Continuous Choke Trigger (Fist Mute)
export function killAll() {
    if (!isAudioReady || activeNotes.length === 0) return;
    try {
        // Apply a sharp, fractional volume clamp to actively sustaining channels
        guitarSynth.triggerRelease(activeNotes, `+${CONFIG.CHOKE_RELEASE_TIME}`);
    } catch (e) {
        console.error("Error in release:", e);
    }
    activeNotes = [];
}

// Used for OPEN fist (Sustain)
export function startSustainedChord(chord, capo = 0) {
    if (!isAudioReady) return;
    killAll();
    const notes = buildChordNotes(chord, capo);
    console.log("Sustaining acoustic notes:", notes);
    
    // Spread the strum slightly to mimic human finger sweep
    const now = Tone.now();
    notes.forEach((note, i) => {
        guitarSynth.triggerAttack(note, now + (i * 0.025)); 
    });
    
    activeNotes = notes;
}

// Used for CLOSED fist (Fade/Normal Strum)
export function playFadedChord(chord, capo = 0) {
    if (!isAudioReady) return;
    killAll();
    const notes = buildChordNotes(chord, capo);
    console.log("Strumming acoustic fading notes:", notes);
    
    // Spread the strum slightly
    const now = Tone.now();
    notes.forEach((note, i) => {
        guitarSynth.triggerAttackRelease(note, CONFIG.FADE_STRUM_DURATION, now + (i * 0.025));
    });
    
    activeNotes = notes;
}

export function stopChord() {
    killAll();
}
