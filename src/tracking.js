// tracking.js - MediaPipe Hands tracking module

import {
    FilesetResolver,
    HandLandmarker
} from "@mediapipe/tasks-vision";

let handLandmarker;


import {
    renderbox,
    drawLandmarks,
    setupCanvas
} from "./ui";

//ask permision and start the video stream 
export async function setupCamera() {
    const video = document.getElementById("webcam");

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 1.7777777778 }
        },
        audio: false
    });

    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadeddata = () => {
            video.play();
            resolve(video);
        };
    });
}


// =========================
// MEDIAPIPE INIT
// =========================

export async function setupHandTracking() {
    const vision =
        await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

    handLandmarker =
        await HandLandmarker.createFromOptions(
            vision,
            {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
                },

                runningMode: "VIDEO",
                numHands: 2
            }
        );
}


// =========================
// DETECT
// =========================

export function detectHands(video) {
    if (!handLandmarker)
        return null;

    return handLandmarker.detectForVideo(
        video,
        performance.now()
    );
}