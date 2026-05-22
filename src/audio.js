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
        'D#4': 'Ds4.mp3',
        'E2': 'E2.mp3',
        'E3': 'E3.mp3',
        'E4': 'E4.mp3',
        'F2': 'F2.mp3',
        'F3': 'F3.mp3'
    },
    release: 1, // Base release, overridden dynamically during muting
    baseUrl: "/samples/guitar-acoustic/",
    onload: () => {
        isAudioReady = true;
        console.log("Acoustic Guitar Samples Loaded!");
    }
});

// Wire the signal chain
guitarSynth.chain(eq, chorus, reverb, Tone.Destination);

guitarSynth.volume.value = 0;

// 3. The Infinite Sustain Oscillator System
let activeSustainSessions = []; // Array of active { gainNode, oscillators }

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
    if (!isAudioReady) return;
    
    if (activeNotes.length > 0) {
        try {
            // Apply a sharp, fractional volume clamp to actively sustaining channels
            guitarSynth.triggerRelease(activeNotes, `+${CONFIG.CHOKE_RELEASE_TIME}`);
        } catch (e) {
            console.error("Error in release:", e);
        }
        activeNotes = [];
    }
    
    stopAbsoluteSustain();
}

export function startAbsoluteSustain(chord, capo = 0) {
    if (!isAudioReady) return;
    
    // Smoothly fade out all existing active sessions
    stopAbsoluteSustain();
    
    const now = Tone.now();
    const notes = buildChordNotes(chord, capo);
    console.log("Absolute sustain starting for notes:", notes);
    
    // Create a new gain node for this session
    const gainNode = new Tone.Gain(0.0).chain(eq, chorus, reverb, Tone.Destination);
    
    // Smooth fade-in to prevent sharp clicks
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(CONFIG.SUSTAIN_VOLUME || 0.15, now + 0.1);
    
    const oscillators = notes.map(note => {
        const osc = new Tone.Oscillator({
            frequency: note,
            type: CONFIG.SUSTAIN_WAVEFORM || "triangle"
        }).connect(gainNode);
        
        osc.start(now);
        return osc;
    });
    
    activeSustainSessions.push({ gainNode, oscillators });
}

export function stopAbsoluteSustain() {
    if (activeSustainSessions.length === 0) return;
    
    const now = Tone.now();
    const fadeTime = CONFIG.SUSTAIN_RELEASE_TIME || 0.25;
    
    // Fade out and dispose all current sessions
    activeSustainSessions.forEach(session => {
        const { gainNode, oscillators } = session;
        
        try {
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.linearRampToValueAtTime(0.0, now + fadeTime);
            
            oscillators.forEach(osc => {
                try {
                    osc.stop(now + fadeTime);
                } catch (e) {
                    console.error("Error stopping oscillator:", e);
                }
            });
            
            // Clean up resources after fade out has completed
            setTimeout(() => {
                oscillators.forEach(osc => {
                    try {
                        osc.disconnect();
                    } catch (e) {}
                });
                try {
                    gainNode.disconnect();
                } catch (e) {}
            }, (fadeTime + 0.2) * 1000);
        } catch (e) {
            console.error("Error disposing sustain session:", e);
        }
    });
    
    activeSustainSessions = [];
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
