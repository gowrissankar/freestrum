// tracking.js - MediaPipe Hands tracking module


//ask permision and start the video stream 
export async function setupCamera() {
    const video = document.getElementById("webcam");

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    });

    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.play();
            resolve(video);
        };
    });
}