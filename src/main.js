// main.js - Application entry point and coordination brain
console.log('FreeStrum Initialized!');

import './style.css'
import { setupCamera } from './tracking';

async function initialise_cam() {
    //setup cam 
    const video = await setupCamera();
    console.log("cam reay ", video)

}





