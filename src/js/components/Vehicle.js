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
        this.maxSpeed = 200;         // Increased from 30 to 200
        this.accelerationRate = 150; // Increased from 10 to 150
        this.brakingRate = 80;       // Increased from 15 to 80
        this.steeringRate = 4.5;     // Increased from 2.5 to 4.5
        this.drag = 0.98;            // Increased from 0.95 to 0.98 for less drag
        
        // Boundary parameters
        this.boundaryForce = 40;     // Force applied to keep vehicle on track
        this.trackWidth = 10;        // Match this with the Track width
        this.trackLength = 100;      // Match this with the Track length
        
        // Control state
        this.controls = {
            accelerate: false,
            brake: false,
            turnLeft: false,
            turnRight: false
        };
        
        // Speedometer element
        this.speedometerElement = this.createSpeedometerElement();
    }
    
    createSpeedometerElement() {
        // Create speedometer element
        const speedometer = document.createElement('div');
        speedometer.id = 'speedometer';
        speedometer.style.position = 'absolute';
        speedometer.style.bottom = '20px';
        speedometer.style.right = '20px';
        speedometer.style.padding = '10px';
        speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        speedometer.style.color = 'white';
        speedometer.style.fontFamily = 'Arial, sans-serif';
        speedometer.style.borderRadius = '5px';
        speedometer.textContent = 'Speed: 0 km/h';
        document.body.appendChild(speedometer);
        return speedometer;
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
        
        // Apply boundary forces to keep vehicle on track
        this.applyBoundaryForces();
        
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
        
        // Update speedometer
        this.updateSpeedometer(speed);
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
    
    updateSpeedometer(speed) {
        // Convert speed to km/h (multiplying by 10 to make it feel more realistic)
        const speedKmh = Math.round(speed * 10);
        this.speedometerElement.textContent = `Speed: ${speedKmh} km/h`;
    }
    
    applyBoundaryForces() {
        // Calculate distance from track center (x-axis)
        const trackHalfWidth = this.trackWidth / 2;
        const distanceFromCenter = Math.abs(this.position.x);
        
        // Apply force to push vehicle back toward track
        if (distanceFromCenter > trackHalfWidth) {
            // Direction to center
            const directionToCenter = new THREE.Vector3(-Math.sign(this.position.x), 0, 0);
            
            // Force increases the further you are from track
            const boundaryForce = (distanceFromCenter - trackHalfWidth) * this.boundaryForce;
            
            // Apply force
            this.acceleration.add(directionToCenter.multiplyScalar(boundaryForce));
            
            // Add friction when off track to slow down
            this.velocity.multiplyScalar(0.95);
        }
        
        // Handle Z-axis bounds (track length)
        if (this.position.z < -this.trackLength || this.position.z > 5) {
            // Turn the vehicle around if it goes too far
            if (this.position.z < -this.trackLength) {
                const turnaroundForce = new THREE.Vector3(0, 0, 1).multiplyScalar(this.boundaryForce / 2);
                this.acceleration.add(turnaroundForce);
            }
            else if (this.position.z > 5) {
                const turnaroundForce = new THREE.Vector3(0, 0, -1).multiplyScalar(this.boundaryForce / 2);
                this.acceleration.add(turnaroundForce);
            }
        }
    }
    
    setControl(control, value) {
        if (this.controls.hasOwnProperty(control)) {
            this.controls[control] = value;
        }
    }
} 