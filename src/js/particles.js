/**
 * Particle system for Quantum Drift game
 * Handles both decorative particle effects and collectible quantum particles
 */

class ParticleSystem {
    /**
     * Create a new particle system
     * @param {THREE.Scene} scene - The three.js scene to add particles to
     */
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.collectibles = [];
        
        // Create particle materials with different glow effects
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.2,
            color: 0x00ffff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });
        
        this.collectibleMaterial = new THREE.PointsMaterial({
            size: 1.0,
            color: 0xff00ff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });
        
        // Sprite for collectible particles
        const textureLoader = new THREE.TextureLoader();
        // Create placeholder for particle texture (would load actual texture in production)
        this.particleTexture = null;
        
        // Set up base particle systems - OPTIMIZED: reduced from 2000 to 800 particles
        this.setupAmbientParticles(800);
        
        // Performance optimization: Limit max particles
        this.maxTrailParticles = 100;
        
        // For performance tracking
        this.lastParticleCreationTime = 0;
    }
    
    /**
     * Set up ambient background particles
     * @param {number} count - Number of particles to create
     */
    setupAmbientParticles(count) {
        // Create geometry for particles
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        // Distribute particles in a large volume around the track
        const range = 1000;
        for (let i = 0; i < count; i++) {
            // Position
            positions[i * 3] = Utils.random(-range, range); // x
            positions[i * 3 + 1] = Utils.random(-range/4, range/4); // y
            positions[i * 3 + 2] = Utils.random(-range, range); // z
            
            // Color (cyan to purple gradient)
            const ratio = Math.random();
            colors[i * 3] = Utils.lerp(0, 1, ratio); // r
            colors[i * 3 + 1] = Utils.lerp(1, 0, ratio); // g
            colors[i * 3 + 2] = 1; // b
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create the particle system
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });
        
        this.ambientParticles = new THREE.Points(particlesGeometry, particleMaterial);
        this.scene.add(this.ambientParticles);
    }
    
    /**
     * Create a quantum trail behind the player's vehicle
     * @param {THREE.Vector3} position - Position to emit from
     * @param {THREE.Vector3} velocity - Current velocity vector
     * @param {number} speed - Current speed value (affects emission rate)
     */
    createQuantumTrail(position, velocity, speed) {
        // OPTIMIZATION: Throttle particle creation based on time
        const now = performance.now();
        if (now - this.lastParticleCreationTime < 100) return; // Only create particles every 100ms
        this.lastParticleCreationTime = now;
        
        // OPTIMIZATION: Limit particle creation based on speed even more aggressively
        if (Math.random() > Utils.clamp(speed / 20, 0.05, 0.4)) return;
        
        // OPTIMIZATION: Check if we've hit our particle limit
        if (this.particles.length >= this.maxTrailParticles) {
            // Remove oldest particles first
            this.particles.splice(0, Math.ceil(this.particles.length * 0.2));
        }
        
        // Create particles behind the vehicle - OPTIMIZED: reduced count
        const count = Math.min(Math.floor(Utils.clamp(speed, 1, 3)), 3);
        
        for (let i = 0; i < count; i++) {
            // Calculate emission point with slight randomness
            const offset = new THREE.Vector3(
                Utils.random(-0.5, 0.5),
                Utils.random(-0.5, 0.5),
                Utils.random(-0.5, 0.5)
            );
            
            // Create particle at vehicle position with offset
            const particle = {
                position: position.clone().add(offset),
                velocity: velocity.clone().multiplyScalar(-0.1).add(offset.multiplyScalar(0.05)),
                color: Utils.getColorFromValue(speed / 50),
                size: Utils.random(0.1, 0.5),
                life: 1.0,
                decay: Utils.random(0.02, 0.05) // OPTIMIZED: faster decay
            };
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create collectible quantum particles along the track
     * @param {THREE.Vector3} position - Position to place the collectible
     * @param {number} value - Value/power of the quantum particle
     * @returns {Object} The created collectible object
     */
    createCollectible(position, value = 1) {
        const collectible = {
            position: position.clone(),
            basePosition: position.clone(), // Original position for floating animation
            value: value,
            size: 0.5 + value * 0.5, // Size based on value
            collected: false,
            id: this.collectibles.length,
            phase: Math.random() * Math.PI * 2, // Random starting phase for animation
            mesh: null
        };
        
        // Create visual representation - OPTIMIZATION: Reduce geometry complexity
        const geometry = new THREE.SphereGeometry(collectible.size, 8, 8); // Reduced segments from 16 to 8
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(`hsl(${280 + value * 30}, 100%, 70%)`),
            emissive: new THREE.Color(`hsl(${280 + value * 30}, 100%, 50%)`),
            transparent: true,
            opacity: 0.8,
            shininess: 100
        });
        
        collectible.mesh = new THREE.Mesh(geometry, material);
        collectible.mesh.position.copy(position);
        this.scene.add(collectible.mesh);
        
        // Add glow effect - OPTIMIZATION: Simpler glow geometry
        const glowGeometry = new THREE.SphereGeometry(collectible.size * 1.5, 8, 8); // Reduced segments
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(`hsl(${280 + value * 30}, 100%, 70%)`),
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        collectible.mesh.add(glowMesh);
        
        this.collectibles.push(collectible);
        return collectible;
    }
    
    /**
     * Check if vehicle has collected any quantum particles
     * @param {THREE.Vector3} position - Vehicle position
     * @param {number} radius - Collection radius
     * @returns {Object|null} Collected particle or null
     */
    checkCollisions(position, radius) {
        for (let i = 0; i < this.collectibles.length; i++) {
            const collectible = this.collectibles[i];
            if (collectible.collected) continue;
            
            const distance = Utils.distance(position, collectible.position);
            if (distance < radius + collectible.size) {
                // Mark as collected
                collectible.collected = true;
                
                // Hide the mesh
                this.scene.remove(collectible.mesh);
                
                // Create collection effect
                this.createCollectionEffect(collectible.position);
                
                return collectible;
            }
        }
        
        return null;
    }
    
    /**
     * Create visual effect when particle is collected
     * @param {THREE.Vector3} position - Position of collected particle
     */
    createCollectionEffect(position) {
        // OPTIMIZATION: Create fewer burst particles
        const particleCount = 10; // Reduced from 20
        
        for (let i = 0; i < particleCount; i++) {
            const direction = new THREE.Vector3(
                Utils.random(-1, 1),
                Utils.random(-1, 1),
                Utils.random(-1, 1)
            ).normalize();
            
            const particle = {
                position: position.clone(),
                velocity: direction.multiplyScalar(Utils.random(0.1, 0.3)),
                color: new THREE.Color(0xff00ff),
                size: Utils.random(0.2, 0.4),
                life: 1.0,
                decay: Utils.random(0.04, 0.08) // OPTIMIZED: faster decay
            };
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Update all particle systems
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} speed - Current vehicle speed
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, speed, playerPosition) {
        // Update ambient particles (subtle movement)
        if (this.ambientParticles) {
            // OPTIMIZATION: Reduce rotation speed
            this.ambientParticles.rotation.y += deltaTime * 0.005 * Utils.clamp(speed, 0.1, 1.5);
            
            // OPTIMIZATION: Only distort particles at very high speeds and less frequently
            if (speed > 20) {
                const distortionFactor = Utils.clamp((speed - 20) / 30, 0, 0.7);
                const time = performance.now() * 0.001;
                
                const positions = this.ambientParticles.geometry.attributes.position.array;
                const count = positions.length / 3;
                
                // OPTIMIZATION: Process fewer particles
                for (let i = 0; i < count; i += 15) { // Process only 1/15 of particles each frame
                    const ix = i * 3;
                    const iy = i * 3 + 1;
                    
                    // Apply quantum distortion using noise
                    positions[iy] += Math.sin(time + positions[ix] * 0.01) * distortionFactor * 0.3;
                }
                
                this.ambientParticles.geometry.attributes.position.needsUpdate = true;
            }
        }
        
        // Update trail particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.position.add(particle.velocity);
            
            // Update life
            particle.life -= particle.decay;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
        }
        
        // OPTIMIZATION: Update collectible particles less frequently for distant objects
        const time = performance.now() * 0.001;
        for (let i = 0; i < this.collectibles.length; i++) {
            const collectible = this.collectibles[i];
            if (collectible.collected || !collectible.mesh) continue;
            
            // Skip updates for particles far from player
            const distanceToPlayer = playerPosition.distanceTo(collectible.position);
            if (distanceToPlayer > 100) continue;
            
            // Floating animation
            collectible.mesh.position.y = collectible.basePosition.y + 
                Math.sin(time * 2 + collectible.phase) * 0.3;
                
            // OPTIMIZATION: Slower rotation
            collectible.mesh.rotation.y += deltaTime * 0.3;
            
            // Pulse glow effect - only update when close to player
            if (collectible.mesh.children[0] && distanceToPlayer < 50) {
                const pulseFactor = 0.7 + Math.sin(time * 3 + collectible.phase) * 0.3;
                collectible.mesh.children[0].scale.set(pulseFactor, pulseFactor, pulseFactor);
            }
        }
    }
}

// Export the ParticleSystem class
window.ParticleSystem = ParticleSystem; 