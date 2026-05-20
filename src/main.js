// main.js - Application entry point and coordination brain
console.log('FreeStrum Initialized!');

import './style.css'
import { setupCamera } from './tracking';
import { renderbox, setupCanvas, appState } from './ui';

async function init() {
    //setup cam 
    const video = await setupCamera();
    console.log("cam reay ", video)

    //setup canvas 
    const { canvas, ctx } = setupCanvas(video);
    console.log("canvas ready ", canvas);

    window.addEventListener("keydown", (e) => {
        const key = Number(e.key);

        if (key >= 1 && key <= 8) {
            appState.activeChordIndex = key - 1;
        }
    });

    function animate() {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
        renderbox(video, ctx, canvas);
        requestAnimationFrame(animate);
    }
    animate()
}

init();






