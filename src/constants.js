// constants.js - Configurable parameters for the FreeStrum application

export const CONFIG = {
    // UI Layout
    GRID_COLS: 5,
    GRID_ROWS: 2,
    GRID_GAP: 0,
    GRID_X_PERCENT: 0.02,
    GRID_Y_PERCENT: 0.55,
    GRID_WIDTH_PERCENT: 0.8,
    GRID_HEIGHT_PERCENT: 0.3,

    // Colors
    COLOR_GRID_ACTIVE_BORDER: "rgba(255, 255, 255, 0.95)",
    COLOR_GRID_INACTIVE_BORDER: "rgba(255, 255, 255, 0.15)",
    COLOR_GRID_ACTIVE_BG: "rgba(255, 255, 255, 0.12)",
    COLOR_GRID_INACTIVE_BG: "rgba(10, 10, 10, 0.15)", // Highly transparent background
    COLOR_SKELETON: "rgba(255, 255, 255, 0.3)",
    COLOR_STRUM_LINE: "rgba(255, 255, 255, 0.5)",
    COLOR_STRUM_FLASH: "rgba(255, 255, 255, 0.15)",

    // Timing and Interactions
    HOVER_DELAY_MS: 100,
    STRUM_COOLDOWN_MS: 300,

    // Strum Velocity Threshold (Y delta in normalized coordinate per frame to trigger strum)
    STRUM_VELOCITY_THRESHOLD: 0.03,

    // Audio Engine Tuning
    FADE_STRUM_DURATION: 2.5, // Natural acoustic ring out time
    CHOKE_RELEASE_TIME: 0.1,  // Sharp dampening time for fist mute
    REVERB_DECAY_TIME: 1.5,   // Room ambient decay simulation

    // Fist Detection Threshold (Distance from palm to fingertips)
    // If average distance is below this, the fist is considered "CLOSED"
    // Values are typically between 0.1 and 0.4 based on MediaPipe normalized coords
    FIST_THRESHOLD: 0.2,

    // Infinite Sustain Oscillator Tuning
    SUSTAIN_VOLUME: 0.65,         // Volume level (0.0 to 1.0) for the infinite sustain oscillators
    SUSTAIN_RELEASE_TIME: 0.25,   // Fade out duration in seconds when releasing sustain
    SUSTAIN_WAVEFORM: "triangle"  // Waveform type ("sine", "triangle", "square", "sawtooth")
};
