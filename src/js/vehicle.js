/**
 * Vehicle class for Quantum Drift game
 * Handles player vehicle physics, controls, and visual effects
 */

class Vehicle {
    /**
     * Create a new player vehicle
     * @param {THREE.Scene} scene - The three.js scene
     * @param {ParticleSystem} particleSystem - Particle system for effects
     */
    constructor(scene, particleSystem) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        
        // Vehicle properties
        this.position = new THREE.Vector3(0, 1, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.accelerationVector = new THREE.Vector3(0, 0, 0);
        this.direction = new THREE.Vector3(0, 0, 1);
        this.speed = 0;
        this.maxSpeed = 50;
        this.baseMaxSpeed = this.maxSpeed;
        this.accelerationRate = 0.5;
        this.acceleration = this.accelerationRate;
        this.deceleration = 0.2;
        this.handling = 2.0;
        this.gravity = 20;
        this.mass = 1;
        
        // Vehicle state
        this.isGrounded = true;
        this.quantumParticles = 0;
        this.distanceTraveled = 0;
        this.quantumLevel = 0; // Power level from collected particles
        
        // Controls state
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            boost: false
        };
        
        // Create vehicle mesh
        this.createVehicle();
        
        // Set up input handlers
        this.setupInputHandlers();
    }
    
    /**
     * Create the vehicle mesh and add it to the scene
     */
    createVehicle() {
        // Create a vehicle model
        // For simplicity, we'll use a basic shape
        // In a full game, you would load a detailed model
        
        // Create vehicle body
        const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00aaaa,
            metalness: 0.8,
            roughness: 0.2
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        
        // Create the overall vehicle group
        this.mesh = new THREE.Group();
        this.mesh.add(this.body);
        
        // Add front section
        const frontGeometry = new THREE.ConeGeometry(1, 2, 4);
        frontGeometry.rotateX(Math.PI / 2);
        const frontMesh = new THREE.Mesh(frontGeometry, bodyMaterial);
        frontMesh.position.set(0, 0, -2);
        this.mesh.add(frontMesh);
        
        // Add wings
        const wingGeometry = new THREE.BoxGeometry(4, 0.1, 1);
        const wingMaterial = new THREE.MeshStandardMaterial({
            color: 0x6600ff,
            emissive: 0x330066
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-1.5, 0, 0.5);
        this.mesh.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(1.5, 0, 0.5);
        this.mesh.add(rightWing);
        
        // Add engine glow
        const engineGeometry = new THREE.CylinderGeometry(0.3, 0.5, 0.5, 16);
        engineGeometry.rotateX(Math.PI / 2);
        const engineMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.7
        });
        
        this.engineLeft = new THREE.Mesh(engineGeometry, engineMaterial);
        this.engineLeft.position.set(-0.7, -0.2, 2);
        this.mesh.add(this.engineLeft);
        
        this.engineRight = new THREE.Mesh(engineGeometry, engineMaterial);
        this.engineRight.position.set(0.7, -0.2, 2);
        this.mesh.add(this.engineRight);
        
        // Add quantum aura effect
        const auraGeometry = new THREE.SphereGeometry(2.5, 16, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        this.aura = new THREE.Mesh(auraGeometry, auraMaterial);
        this.mesh.add(this.aura);
        this.aura.visible = false; // Only show when quantum effects are active
        
        // Add lights
        this.headlight = new THREE.PointLight(0x00ffff, 2, 10);
        this.headlight.position.set(0, 0, -3);
        this.mesh.add(this.headlight);
        
        // Position the vehicle
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    /**
     * Set up keyboard input handlers
     */
    setupInputHandlers() {
        // FIXED: Ensure keyboard handlers work by directly attaching them to document
        // Create bound handler functions
        this.keyDownHandler = (event) => {
            // FIXED: Prevent default to avoid browser scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(event.key)) {
                event.preventDefault();
            }
            
            switch (event.key) {
                case 'ArrowUp':
                case 'w':
                    this.controls.forward = true;
                    console.log("Forward key pressed", this.controls); // Debug
                    break;
                case 'ArrowDown':
                case 's':
                    this.controls.backward = true;
                    console.log("Backward key pressed", this.controls); // Debug
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.controls.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.controls.right = true;
                    break;
                case ' ':
                    this.controls.boost = true;
                    break;
            }
        };
        
        this.keyUpHandler = (event) => {
            switch (event.key) {
                case 'ArrowUp':
                case 'w':
                    this.controls.forward = false;
                    break;
                case 'ArrowDown':
                case 's':
                    this.controls.backward = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.controls.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.controls.right = false;
                    break;
                case ' ':
                    this.controls.boost = false;
                    break;
            }
        };
        
        // Attach listeners directly
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
        
        // FIXED: Also add listeners to game container for when it has focus
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.addEventListener('keydown', this.keyDownHandler);
            gameContainer.addEventListener('keyup', this.keyUpHandler);
            
            // Make game container focusable
            gameContainer.tabIndex = 0;
            gameContainer.focus();
        }
    }
    
    /**
     * Collect a quantum particle
     * @param {Object} collectible - The collected particle
     */
    collectQuantumParticle(collectible) {
        this.quantumParticles += collectible.value;
        
        // Increase quantum level for special effects
        this.quantumLevel = Math.min(this.quantumLevel + 0.1, 1.0);
        
        // Temporary speed boost
        this.maxSpeed = this.baseMaxSpeed * (1 + this.quantumLevel * 0.5);
        
        // Update UI
        Utils.updateElementText('particles-count', this.quantumParticles);
    }
    
    /**
     * Apply physics to vehicle movement
     * @param {number} deltaTime - Time since last update
     * @param {Track} track - The track for collision detection
     */
    updatePhysics(deltaTime, track) {
        // FIXED: Debug controls
        console.log("Controls:", 
            "F:" + this.controls.forward, 
            "B:" + this.controls.backward, 
            "L:" + this.controls.left, 
            "R:" + this.controls.right);
        
        // Apply input controls
        let accelerationFactor = 0;
        
        // FIXED: CRITICAL FIX - Make sure accelerationRate is set properly and used consistently
        // Set default value in case it somehow got unset
        if (typeof this.accelerationRate !== 'number' || isNaN(this.accelerationRate)) {
            this.accelerationRate = 1.0;
            console.log("Reset accelerationRate to default value");
        }
        
        // FIXED: Drastically increased acceleration for better responsiveness
        if (this.controls.forward) {
            accelerationFactor = 5.0; // Fixed value instead of using this.accelerationRate
            console.log("Applying forward acceleration:", accelerationFactor);
        } else if (this.controls.backward) {
            accelerationFactor = -3.0; // Fixed value instead of using this.accelerationRate
            console.log("Applying backward acceleration:", accelerationFactor);
        } else {
            // Apply deceleration when no input
            if (this.speed > 0) {
                accelerationFactor = -this.deceleration;
            } else if (this.speed < 0) {
                accelerationFactor = this.deceleration;
            }
        }
        
        // Debug output
        console.log("Acceleration factor:", accelerationFactor, "Speed:", this.speed);
        
        // Apply boost if active and have quantum particles
        if (this.controls.boost && this.quantumParticles > 0 && this.speed > 0) {
            // Consume quantum particles for boost
            if (Math.random() < 0.05) {
                this.quantumParticles = Math.max(0, this.quantumParticles - 1);
                Utils.updateElementText('particles-count', this.quantumParticles);
            }
            
            // Apply additional acceleration
            accelerationFactor *= 2.0;
            
            // Show quantum aura during boost
            this.aura.visible = true;
            this.aura.material.opacity = 0.3 + Math.sin(performance.now() * 0.005) * 0.2;
        } else {
            // Fade out aura
            if (this.aura.visible) {
                this.aura.material.opacity -= deltaTime;
                if (this.aura.material.opacity <= 0.1) {
                    this.aura.visible = false;
                }
            }
        }
        
        // FIXED: Update speed with fixed delta time to ensure consistent acceleration
        // This prevents very small or large deltaTime values from causing issues
        const normalizedDeltaTime = Math.min(Math.max(deltaTime, 0.01), 0.05);
        
        // Update speed with the acceleration factor
        this.speed += accelerationFactor * normalizedDeltaTime;
        
        // Apply speed limits
        this.speed = Utils.clamp(this.speed, -this.maxSpeed / 2, this.maxSpeed);
        
        // FIXED: Small initial push if speed is very low and trying to accelerate
        if (Math.abs(this.speed) < 0.1 && accelerationFactor !== 0) {
            this.speed = accelerationFactor > 0 ? 0.5 : -0.5;
        }
        
        // Turning
        let turnFactor = 0;
        // FIXED: Corrected the left/right direction to fix reversed controls
        if (this.controls.left) {
            turnFactor = this.handling; // Changed from negative to positive
        } else if (this.controls.right) {
            turnFactor = -this.handling; // Changed from positive to negative
        }
        
        // FIXED: Better turning response at all speeds
        // More responsive at low speeds, more stable at high speeds
        const speedRatio = Math.min(Math.abs(this.speed) / 15, 1.0);
        turnFactor *= (1 - speedRatio * 0.3);
        
        // Apply turning
        this.rotation.y += turnFactor * deltaTime;
        
        // Calculate movement direction
        this.direction.set(
            Math.sin(this.rotation.y),
            0,
            Math.cos(this.rotation.y)
        ).normalize();
        
        // Update position based on speed and direction
        const moveDelta = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(moveDelta);
        
        // Track distance traveled (only when moving forward)
        if (this.speed > 0) {
            this.distanceTraveled += moveDelta.length();
        }
        
        // FIXED: Apply gravity to keep vehicle on track
        const gravitationalForce = 9.8 * deltaTime;
        
        // Check if on track
        const onTrack = track.isOnTrack(this.position);
        if (!onTrack) {
            // FIXED: Better off-track handling
            // Slow down more gradually when off track
            this.speed *= 0.97;
            
            // Push back towards track more gently
            const closestPoint = track.getClosestPointOnTrack(this.position);
            const pushDirection = new THREE.Vector3()
                .subVectors(closestPoint, this.position)
                .normalize();
            
            // FIXED: More gentle push with distance factor
            const distanceToTrack = this.position.distanceTo(closestPoint);
            const pushFactor = Math.min(distanceToTrack * 0.5, 5.0); // Stronger push when further away
            
            this.position.add(pushDirection.multiplyScalar(pushFactor * deltaTime));
            
            // FIXED: Only add elevation to help get unstuck if we're below track level
            if (this.speed < 1.0 && this.position.y < closestPoint.y) {
                this.position.y += 0.05;
            } else {
                // FIXED: Apply gravity when above track level
                this.position.y -= gravitationalForce;
            }
        } else {
            // FIXED: Find the track height at current position
            const trackPoint = track.getClosestPointOnTrack(this.position);
            const targetHeight = trackPoint.y + 1.0; // Hover 1 unit above track
            
            // FIXED: Apply smoother height adjustment
            if (this.position.y > targetHeight + 0.1) {
                // Apply gravity when too high
                this.position.y -= gravitationalForce * 2;
            } else if (this.position.y < targetHeight - 0.1) {
                // Float up when too low
                this.position.y += gravitationalForce;
            } else {
                // Maintain height when close to target
                this.position.y = targetHeight;
            }
        }
        
        // FIXED: Clamp max height to prevent infinite floating
        this.position.y = Math.min(this.position.y, 30);
        
        // Update vehicle mesh position and rotation
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation.y;
        
        // Apply tilt based on turning
        this.mesh.rotation.z = turnFactor * 0.1 * (this.speed / this.maxSpeed); // Sign changed due to reversed turning
        
        // Update engine glow based on speed
        const engineIntensity = Utils.clamp(this.speed / this.maxSpeed, 0.2, 1);
        this.engineLeft.material.opacity = engineIntensity * 0.7;
        this.engineRight.material.opacity = engineIntensity * 0.7;
        
        // Create quantum trail behind vehicle
        if (this.speed > 5) {
            this.particleSystem.createQuantumTrail(
                this.position, 
                this.direction.clone().multiplyScalar(this.speed),
                this.speed
            );
        }
        
        // Update speed display in UI
        Utils.updateElementText('speed-value', Math.floor(Math.abs(this.speed)));
    }
    
    /**
     * Update the vehicle
     * @param {number} deltaTime - Time since last update
     * @param {Track} track - The track for collision detection
     */
    update(deltaTime, track) {
        // Update physics
        this.updatePhysics(deltaTime, track);
        
        // Check for collectible collisions
        const collectedParticle = this.particleSystem.checkCollisions(this.position, 2);
        if (collectedParticle) {
            this.collectQuantumParticle(collectedParticle);
        }
        
        // Apply quantum visual effects based on speed
        this.applyQuantumEffects(deltaTime);
    }
    
    /**
     * Apply visual quantum effects based on speed
     * @param {number} deltaTime - Time since last update
     */
    applyQuantumEffects(deltaTime) {
        // Calculate quantum effect intensity based on speed
        const intensity = Utils.clamp(this.speed / this.maxSpeed, 0, 1);
        
        // Only apply significant effects at higher speeds
        if (intensity > 0.5) {
            // Color shift effect
            const time = performance.now() * 0.001;
            const hue = (time * 50 * intensity) % 360;
            
            this.body.material.emissive.set(new THREE.Color(`hsl(${hue}, 100%, ${intensity * 30}%)`));
            this.headlight.color.set(new THREE.Color(`hsl(${hue}, 100%, 50%)`));
            
            // Scale effect - vehicle appears to stretch at high speeds
            const stretchFactor = 1 + (intensity - 0.5) * 0.3;
            this.body.scale.z = stretchFactor;
            
            // Engine trail gets more intense
            this.engineLeft.scale.z = 1 + intensity;
            this.engineRight.scale.z = 1 + intensity;
        } else {
            // Reset effects at lower speeds
            this.body.material.emissive.set(new THREE.Color(0x00aaaa));
            this.headlight.color.set(new THREE.Color(0x00ffff));
            this.body.scale.z = 1;
            this.engineLeft.scale.z = 1;
            this.engineRight.scale.z = 1;
        }
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        // This method is kept for compatibility with existing code
        // The implementation is now directly in the setupInputHandlers method
        if (this.keyDownHandler) {
            this.keyDownHandler(event);
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        // This method is kept for compatibility with existing code
        // The implementation is now directly in the setupInputHandlers method
        if (this.keyUpHandler) {
            this.keyUpHandler(event);
        }
    }
}

// Export the Vehicle class
window.Vehicle = Vehicle; 