import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { Scene } from './Scene.js';
import { Vehicle } from './Vehicle.js';
import { Track } from './Track.js';
import { InputHandler } from './InputHandler.js';

export class Game {
    constructor() {
        this.scene = null;
        this.vehicle = null;
        this.track = null;
        this.inputHandler = null;
        this.clock = new THREE.Clock();
    }

    init() {
        console.log("Game initialization started");
        
        // Initialize scene
        this.scene = new Scene();
        this.scene.init();

        // Initialize track
        this.track = new Track();
        this.track.init(this.scene.scene);

        // Initialize vehicle
        this.vehicle = new Vehicle();
        this.vehicle.init(this.scene.scene, this.scene.camera);

        // Initialize input handler
        this.inputHandler = new InputHandler(this.vehicle);
        
        console.log("Game initialization completed");
    }

    update() {
        const deltaTime = this.clock.getDelta();
        
        // Update input
        this.inputHandler.update();
        
        // Update vehicle
        this.vehicle.update(deltaTime);
    }

    render() {
        this.scene.render();
    }
} 