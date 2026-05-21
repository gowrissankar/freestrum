// constants.js - Configurable parameters for the FreeStrum application

export const CONFIG = {
    // UI Layout
    GRID_COLS: 5,
    GRID_ROWS: 2,
    GRID_GAP: 0,
    GRID_X_PERCENT: 0.1,
    GRID_Y_PERCENT: 0.5,
    GRID_WIDTH_PERCENT: 0.8,
    GRID_HEIGHT_PERCENT: 0.3,

    // Colors
    COLOR_GRID_ACTIVE_BORDER: "rgba(0, 229, 255, 1)",
    COLOR_GRID_INACTIVE_BORDER: "rgba(0, 229, 255, 0.5)",
    COLOR_GRID_ACTIVE_BG: "rgba(0, 229, 255, 0.3)",
    COLOR_GRID_INACTIVE_BG: "rgba(0, 0, 0, 0.4)",
    COLOR_SKELETON: "#ff6b6b",
    COLOR_STRUM_LINE: "rgba(255, 200, 0, 0.8)",
    COLOR_STRUM_FLASH: "rgba(255, 255, 255, 0.9)",

    // Timing and Interactions
    HOVER_DELAY_MS: 250,
    STRUM_COOLDOWN_MS: 300,

    // Strum Line Position (Y-axis percentage, 0.0 to 1.0)
    STRUM_LINE_Y: 0.65,

    // Fist Detection Threshold (Distance from palm to fingertips)
    // If average distance is below this, the fist is considered "CLOSED"
    // Values are typically between 0.1 and 0.4 based on MediaPipe normalized coords
    FIST_THRESHOLD: 0.2
};
