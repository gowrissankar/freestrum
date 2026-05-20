# FreeStrum 🎸
An interactive, spatial air-guitar instrument that maps hand gestures captured by your webcam to two separate digital inputs: a virtual chord selection keyboard and a motion strum trigger.

This repository is initialized with a structured layout allowing you to write your own modules for video mirroring, MediaPipe hand tracking, Tone.js polyphonic audio orchestration, and coordinate collision checks.

---

## 📂 Project File Structure
```
freestrum/
├── index.html          # HTML shell hosting video, canvas, & app container
├── package.json        # Project metadata & npm dependencies (Vite, MediaPipe, Tone.js)
├── vite.config.js      # Bundler & dev-server configuration
├── README.md           # This setup & architecture guide
└── src/
    ├── main.js         # Core orchestrator tying tracking, UI, & audio systems together
    ├── tracking.js     # Webcam stream acquisition & MediaPipe Hand landmark processor
    ├── audio.js        # Tone.js polyphonic synthesizer & guitar strum audio engine
    ├── ui.js           # Canvas visualization, grid collision checking, & mirroring
    └── style.css       # Custom modern CSS stylesheet
```

---

## 📦 Dependencies
To build the application, the project relies on the following lightweight packages:

1. **`vite`** (DevDependency: `^5.0.0`)
   - **Purpose**: A ultra-fast, modern frontend build tool. It provides a lightning-fast Hot Module Replacement (HMR) dev server, which is essential for rapid spatial parameter tweaking.
2. **`@mediapipe/tasks-vision`** (Dependency: `^0.10.8`)
   - **Purpose**: Google’s official, state-of-the-art machine learning suite for web browsers. It provides pre-compiled WASM binaries and highly accurate, near zero-latency Hand Landmark Detection, returning 21 landmark coordinate coordinates per hand.
3. **`tone`** (Dependency: `^14.7.77`)
   - **Purpose**: A comprehensive Web Audio API framework. It handles multi-voice polyphony, synth generation, envelope scheduling, and high-fidelity sound synthesis, allowing you to play beautiful acoustic/synth guitar chords simultaneously.

---

## 🚀 Step-by-Step Setup Guide

Follow these steps to set up and run your development environment locally:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ is recommended).

### Step 1: Install Dependencies
Open your terminal in the `freestrum` directory and run:
```bash
npm install
```
This will fetch Vite, Tone.js, and MediaPipe and install them in the `node_modules` folder.

### Step 2: Start the Development Server
Once installation is complete, start the local development server:
```bash
npm run dev
```
Vite will compile your modules and launch a hot-reloading development server, usually opening automatically at:
`http://localhost:3000`

---

## 🛠️ Implementation Strategy (Build order)
To develop this application on your own, it is recommended to tackle the modules in the following order:

1. **Video & Mirror Canvas (`ui.js` & `style.css`)**:
   - Programmatic webcam feed acquisition.
   - Drawing the video frame onto a `<canvas>` element while horizontally mirroring it (`ctx.translate(canvas.width, 0); ctx.scale(-1, 1);`).
   - Slicing the canvas coordinates $(0,0) \to (1,1)$ to draw the Left-Hand Chord boxes (e.g., C, Dm, Em, G) on the left 40% of the screen.

2. **MediaPipe Hand Tracking (`tracking.js`)**:
   - Initializing the MediaPipe `FilesetResolver` and `HandLandmarker`.
   - Running landmark detection frame-by-frame on the live video stream.
   - Distinguishing the Left hand from the Right hand and outputting normalized coordinate markers (Index tip: Landmark `8`; Wrist: Landmark `0`).

3. **Audio Engine (`audio.js`)**:
   - Instantiating Tone.js Synthesizers or Polyphonic Samplers.
   - Defining the MIDI notes/chords mapping corresponding to your grid (e.g., C major: `[C4, E4, G4, C5]`).
   - Writing a play function that strums through a chord by staggering note triggers slightly (e.g., `synth.triggerAttackRelease(note, duration, time + offset)`).

4. **Event Coordination & Strum Detection (`main.js`)**:
   - **Left-Hand Hover**: Map the left index finger landmark to active grid box boundaries. Update your active chord state.
   - **Right-Hand Strum Velocity**: Store historical coordinates of the right wrist. Calculate velocity as the distance between the current frame's position and previous frames' positions:
     $$\text{Velocity} = \frac{\sqrt{(x_t - x_{t-1})^2 + (y_t - y_{t-1})^2}}{\Delta t}$$
   - Compare the velocity value against a tunable threshold. If it spikes, trigger the active chord!
