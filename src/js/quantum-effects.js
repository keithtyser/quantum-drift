/**
 * Quantum effects for Quantum Drift game
 * Handles visual effects that simulate quantum physics phenomena
 */

class QuantumEffects {
    /**
     * Create a new quantum effects system
     * @param {THREE.Scene} scene - The three.js scene
     * @param {THREE.Camera} camera - The three.js camera
     * @param {THREE.WebGLRenderer} renderer - The three.js renderer
     */
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Effect settings
        this.distortionIntensity = 0;
        this.timeWarpIntensity = 0;
        this.colorShiftIntensity = 0;
        
        // Post-processing effects
        this.setupPostProcessing();
        
        // Quantum environment effects
        this.setupEnvironmentEffects();
        
        // OPTIMIZATION: Add frame counter for throttling updates
        this.frameCount = 0;
    }
    
    /**
     * Set up post-processing effects
     * Note: In a real implementation, you'd use a library like three.js EffectComposer
     * This simplified version just sets placeholders
     */
    setupPostProcessing() {
        // In a real implementation, you would set up effects like:
        // - RGB Shift for quantum color distortion
        // - Motion blur for time dilation
        // - Bloom for energy particles
        // - Film grain for quantum uncertainty
        this.postProcessingInitialized = true;
    }
    
    /**
     * Set up quantum environment effects in the 3D scene
     */
    setupEnvironmentEffects() {
        // Create quantum fog
        this.scene.fog = new THREE.FogExp2(0x000820, 0.002);
        
        // Create a skybox with nebula-like textures
        // OPTIMIZATION: Reduced skybox geometry complexity
        const skyGeometry = new THREE.SphereGeometry(2000, 16, 16); // Reduced from 32, 32
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x000820,
            side: THREE.BackSide,
            fog: false
        });
        this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skybox);
        
        // Create quantum stars (distant particles)
        this.createQuantumStars();
        
        // Create quantum field lines
        this.createFieldLines();
    }
    
    /**
     * Create distant stars/particles for the cosmic environment
     */
    createQuantumStars() {
        const starsGeometry = new THREE.BufferGeometry();
        // OPTIMIZATION: Reduced star count from 5000 to 2000
        const starsCount = 2000;
        
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        
        for (let i = 0; i < starsCount; i++) {
            // Position stars in a large sphere around the scene
            const radius = 1000 + Math.random() * 1000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // Random colors for stars
            const hue = Math.random() * 360;
            const color = new THREE.Color(`hsl(${hue}, 100%, 70%)`);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Random sizes
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starsMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }
    
    /**
     * Create quantum field visualization lines
     */
    createFieldLines() {
        // OPTIMIZATION: Reduced from 50 to 20 lines
        const linesCount = 20;
        this.fieldLines = [];
        
        for (let i = 0; i < linesCount; i++) {
            // Create a curved line using sine waves
            const points = [];
            const lineLength = 300;
            // OPTIMIZATION: Reduced segments from 50 to 30
            const segments = 30;
            
            const phaseX = Math.random() * Math.PI * 2;
            const phaseY = Math.random() * Math.PI * 2;
            const phaseZ = Math.random() * Math.PI * 2;
            
            const frequencyX = 0.01 + Math.random() * 0.02;
            const frequencyY = 0.01 + Math.random() * 0.02;
            const frequencyZ = 0.01 + Math.random() * 0.02;
            
            const amplitudeX = 20 + Math.random() * 30;
            const amplitudeY = 20 + Math.random() * 30;
            const amplitudeZ = 20 + Math.random() * 30;
            
            for (let j = 0; j < segments; j++) {
                const t = j / segments;
                const x = Math.sin(t * Math.PI * 2 * frequencyX + phaseX) * amplitudeX;
                const y = Math.sin(t * Math.PI * 2 * frequencyY + phaseY) * amplitudeY;
                const z = lineLength * (t - 0.5) + Math.sin(t * Math.PI * 2 * frequencyZ + phaseZ) * amplitudeZ;
                
                points.push(new THREE.Vector3(x, y, z));
            }
            
            const curve = new THREE.CatmullRomCurve3(points);
            // OPTIMIZATION: Reduced points from 100 to 50
            const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
            
            // Random color for each line
            const hue = Math.random() * 60 + 180; // Blue to cyan range
            const material = new THREE.LineBasicMaterial({
                color: new THREE.Color(`hsl(${hue}, 100%, 60%)`),
                transparent: true,
                opacity: 0.5
            });
            
            const line = new THREE.Line(geometry, material);
            
            // Random position and rotation
            line.position.set(
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500
            );
            
            line.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // Store properties for animation
            line.userData = {
                speed: 0.2 + Math.random() * 0.5,
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                phaseOffset: Math.random() * Math.PI * 2
            };
            
            this.scene.add(line);
            this.fieldLines.push(line);
        }
    }
    
    /**
     * Create a quantum distortion effect at a position
     * @param {THREE.Vector3} position - Position for the effect
     * @param {number} intensity - Effect intensity
     */
    createDistortionEffect(position, intensity) {
        // OPTIMIZATION: Less complex geometry
        const geometry = new THREE.RingGeometry(0.1, 5, 16); // Reduced segments from 32
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.lookAt(this.camera.position); // Face camera
        
        // Store animation properties
        ring.userData = {
            expansionRate: 10 + intensity * 20,
            life: 1.0,
            decay: 0.07 // OPTIMIZATION: Faster decay (was 0.05)
        };
        
        this.scene.add(ring);
        
        // Animate the ring
        const animate = () => {
            // Expand ring
            ring.scale.x += ring.userData.expansionRate * 0.01;
            ring.scale.y += ring.userData.expansionRate * 0.01;
            
            // Fade out
            material.opacity -= ring.userData.decay;
            
            // Remove when fully transparent
            if (material.opacity <= 0) {
                this.scene.remove(ring);
                return;
            }
            
            // Continue animation
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Apply quantum distortion to camera based on speed
     * @param {number} speed - Current player speed
     */
    applyCameraDistortion(speed) {
        // Calculate distortion intensity based on speed
        // OPTIMIZATION: Higher threshold for distortion effects
        const maxDistortionSpeed = 40;
        this.distortionIntensity = Utils.clamp(speed / maxDistortionSpeed, 0, 1);
        
        // Apply camera effects - only at higher speeds
        if (this.distortionIntensity > 0.5) { // OPTIMIZATION: Increased threshold from 0.4 to 0.5
            const time = performance.now() * 0.001;
            
            // Subtle camera shake
            const shakeAmount = this.distortionIntensity * 0.05;
            this.camera.position.x += Math.sin(time * 10) * shakeAmount;
            this.camera.position.y += Math.cos(time * 15) * shakeAmount;
            
            // Field of view increases with speed
            const baseFOV = 75;
            const maxFOVIncrease = 15; // OPTIMIZATION: Reduced from 20
            this.camera.fov = baseFOV + this.distortionIntensity * maxFOVIncrease;
            this.camera.updateProjectionMatrix();
        } else {
            // Reset camera FOV at lower speeds
            if (this.camera.fov !== 75) {
                this.camera.fov = 75;
                this.camera.updateProjectionMatrix();
            }
        }
    }
    
    /**
     * Update quantum environment effects
     * @param {number} deltaTime - Time since last update
     * @param {number} speed - Current player speed
     * @param {THREE.Vector3} playerPosition - Player position
     */
    updateEnvironmentEffects(deltaTime, speed, playerPosition) {
        // OPTIMIZATION: Throttle updates based on frame count
        const skipFrame = this.frameCount % 2 !== 0;
        
        // Update stars (twinkle effect) - less frequently
        if (this.stars && !skipFrame) {
            const time = performance.now() * 0.001;
            const sizes = this.stars.geometry.attributes.size.array;
            
            // OPTIMIZATION: Update only a portion of stars each frame
            const updateCount = Math.min(200, sizes.length);
            const startIndex = (Math.floor(time * 10) % 10) * updateCount;
            
            for (let i = 0; i < updateCount; i++) {
                const index = (startIndex + i) % sizes.length;
                // Make stars twinkle by changing their size
                const phase = time + index * 0.1;
                sizes[index] = Math.max(0.2, Math.sin(phase) * 0.5 + 1);
            }
            
            this.stars.geometry.attributes.size.needsUpdate = true;
            
            // Rotate stars slowly - OPTIMIZATION: Reduced rotation speed
            this.stars.rotation.y += deltaTime * 0.005;
        }
        
        // Update field lines
        const updateAllLines = speed > 30; // Full updates at high speeds
        
        for (let i = 0; i < this.fieldLines.length; i++) {
            // OPTIMIZATION: Update only a subset of lines each frame at lower speeds
            if (!updateAllLines && i % 4 !== (this.frameCount % 4)) continue;
            
            const line = this.fieldLines[i];
            
            // Move field lines
            line.position.z += line.userData.speed * deltaTime * (10 + speed * 0.5);
            
            // Wrap around when too far
            if (line.position.z > 500) {
                line.position.z = -500;
            }
            
            // Rotate field lines - less rotation at lower speeds
            if (speed > 15) {
                line.rotation.x += line.userData.rotationSpeed * deltaTime;
                line.rotation.z += line.userData.rotationSpeed * 0.5 * deltaTime;
            }
            
            // Increase visibility and movement with speed
            const intensityFactor = Utils.clamp(speed / 30, 0.2, 1);
            line.material.opacity = 0.3 + intensityFactor * 0.4;
            line.userData.speed = 0.2 + intensityFactor * 0.8;
        }
        
        // Update fog density based on speed
        // Dense fog at high speeds creates a "tunnel vision" effect
        // OPTIMIZATION: Update fog less frequently
        if (!skipFrame && speed > 20) {
            this.scene.fog.density = 0.002 + Utils.clamp(speed / 50, 0, 0.5) * 0.005;
        }
    }
    
    /**
     * Apply all quantum effects
     * @param {number} deltaTime - Time since last update
     * @param {number} speed - Current player speed
     * @param {THREE.Vector3} playerPosition - Player position
     */
    update(deltaTime, speed, playerPosition) {
        // Increment frame counter for throttling
        this.frameCount++;
        
        // Apply camera effects
        this.applyCameraDistortion(speed);
        
        // Update environment effects
        this.updateEnvironmentEffects(deltaTime, speed, playerPosition);
        
        // OPTIMIZATION: Create distortion effects less frequently and at higher speeds
        if (speed > 35 && Math.random() < 0.03) { // Reduced probability from 0.05 to 0.03
            // Create effect slightly ahead of player
            const effectPosition = playerPosition.clone().add(
                new THREE.Vector3(
                    Math.random() * 10 - 5,
                    Math.random() * 5,
                    Math.random() * 10 - 5
                )
            );
            
            this.createDistortionEffect(effectPosition, speed / 50);
        }
    }
}

// Export the QuantumEffects class
window.QuantumEffects = QuantumEffects; 