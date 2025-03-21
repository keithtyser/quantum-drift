import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Vehicle {
    constructor() {
        // Vehicle mesh
        this.mesh = null;
        
        // Physics properties
        this.position = new THREE.Vector3(0, 0.5, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        
        // Movement parameters
        this.maxSpeed = 30;
        this.accelerationRate = 10;
        this.brakingRate = 15;
        this.steeringRate = 2.5;
        this.drag = 0.95;
        
        // Control state
        this.controls = {
            accelerate: false,
            brake: false,
            turnLeft: false,
            turnRight: false
        };
    }

    init(scene, camera) {
        // Create a simple vehicle model
        // You would replace this with a more complex model in a real game
        const bodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 3);
        const bodyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x3333ff
        });
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
        
        // Add wheels
        this.addWheels(scene);
        
        // Store the camera reference
        this.camera = camera;
        
        // Position the camera behind and above the vehicle
        this.updateCamera();
    }
    
    addWheels(scene) {
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const wheelMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x222222
        });
        
        // Wheel positions relative to the vehicle body
        const wheelPositions = [
            new THREE.Vector3(-0.7, -0.2, 0.8), // Front left
            new THREE.Vector3(0.7, -0.2, 0.8),  // Front right
            new THREE.Vector3(-0.7, -0.2, -0.8), // Rear left
            new THREE.Vector3(0.7, -0.2, -0.8)   // Rear right
        ];
        
        this.wheels = [];
        
        for (const position of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2; // Rotate to correct orientation
            wheel.position.copy(position);
            this.mesh.add(wheel);
            this.wheels.push(wheel);
        }
    }
    
    updateCamera() {
        if (!this.camera) return;
        
        // Get vehicle's forward direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyEuler(this.rotation);
        
        // Position the camera much closer behind and above the vehicle
        const cameraOffset = new THREE.Vector3(0, 3, 5);
        cameraOffset.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        this.camera.position.copy(this.position).add(cameraOffset);
        this.camera.lookAt(this.position);
    }

    update(deltaTime) {
        // Apply controls to update acceleration
        this.updateAcceleration(deltaTime);
        
        // Apply physics (acceleration affects velocity, velocity affects position)
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
        
        // Apply drag
        this.velocity.multiplyScalar(this.drag);
        
        // Limit maximum speed
        const speed = this.velocity.length();
        if (speed > this.maxSpeed) {
            this.velocity.multiplyScalar(this.maxSpeed / speed);
        }
        
        // Update position
        const movement = this.velocity.clone().multiplyScalar(deltaTime);
        this.position.add(movement);
        
        // Update mesh position and rotation
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        // Update camera position
        this.updateCamera();
    }
    
    updateAcceleration(deltaTime) {
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Get forward direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyEuler(this.rotation);
        
        // Apply acceleration based on controls
        if (this.controls.accelerate) {
            this.acceleration.add(forward.multiplyScalar(this.accelerationRate));
        }
        
        if (this.controls.brake) {
            const backward = forward.clone().multiplyScalar(-1);
            
            // If moving forward, apply braking
            if (this.velocity.dot(forward) > 0) {
                this.acceleration.add(backward.multiplyScalar(this.brakingRate));
            } else {
                // Otherwise, accelerate backwards
                this.acceleration.add(backward.multiplyScalar(this.accelerationRate * 0.5));
            }
        }
        
        // Apply steering based on controls
        if (this.controls.turnLeft) {
            this.rotation.y += this.steeringRate * deltaTime;
        }
        
        if (this.controls.turnRight) {
            this.rotation.y -= this.steeringRate * deltaTime;
        }
    }
    
    setControl(control, value) {
        if (this.controls.hasOwnProperty(control)) {
            this.controls[control] = value;
        }
    }
} 