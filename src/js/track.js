/**
 * Track generator for Quantum Drift game
 * Creates procedurally generated racing tracks that morph based on player speed
 */

class Track {
    /**
     * Create a new track
     * @param {THREE.Scene} scene - The three.js scene
     * @param {ParticleSystem} particleSystem - Particle system for collectibles
     */
    constructor(scene, particleSystem) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        this.segments = [];
        this.trackMeshes = [];
        this.trackWidth = 20;
        this.baseTrackWidth = this.trackWidth;
        this.segmentLength = 30;
        this.totalSegments = 60;
        this.trackCurvature = 0.5; // How much the track curves
        this.heightVariation = 0.3; // How much elevation changes
        
        // Track materials
        this.trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x333344,
            roughness: 0.4,
            metalness: 0.8,
            emissive: 0x222233,
            side: THREE.DoubleSide
        });
        
        this.gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        
        this.barrierMaterial = new THREE.MeshStandardMaterial({
            color: 0x6600ff,
            emissive: 0x330066,
            transparent: true,
            opacity: 0.7
        });
        
        // Track lighting
        this.lights = [];
        
        // Generate the track
        this.generateTrack();
    }
    
    /**
     * Generate track segments with procedural variation
     */
    generateTrack() {
        // Create a path for the track
        const points = [];
        let prevDirection = new THREE.Vector3(1, 0, 0);
        let currentPosition = new THREE.Vector3(0, 0, 0);
        
        // Create a closed loop track
        for (let i = 0; i < this.totalSegments; i++) {
            // Progress as a ratio of the complete track
            const ratio = i / this.totalSegments;
            
            // Create curves in the track 
            // Using sine waves with different frequencies for natural-looking curves
            const angle = Math.PI * 2 * ratio; // Position around a circle
            
            // Calculate position based on curved path
            let newX = Math.cos(angle) * 300;
            let newZ = Math.sin(angle) * 300;
            
            // Add some variation to make it more interesting
            newX += Math.sin(angle * 3) * 50;
            newZ += Math.cos(angle * 3) * 50;
            
            // Add height variation
            const height = Math.sin(angle * 2) * 20 + Math.cos(angle * 5) * 10;
            
            const position = new THREE.Vector3(newX, height, newZ);
            points.push(position);
            
            // Create track segment data
            this.segments.push({
                position: position.clone(),
                width: this.trackWidth,
                originalPosition: position.clone(), // For resetting/reference
                index: i,
                normalized: ratio
            });
        }
        
        // Create a smooth curve through the points
        const curve = new THREE.CatmullRomCurve3(points);
        curve.closed = true;
        
        // Create the track geometry from the curve
        this.createTrackGeometry(curve);
        
        // Add quantum particle collectibles along the track
        this.placeCollectibles();
        
        // Add lights along the track
        this.placeLights();
    }
    
    /**
     * Create the track mesh geometry based on the curve
     * @param {THREE.Curve} curve - The curve to build the track along
     */
    createTrackGeometry(curve) {
        // Create track surface
        const trackShape = new THREE.Shape();
        trackShape.moveTo(-this.trackWidth / 2, 0);
        trackShape.lineTo(this.trackWidth / 2, 0);
        
        const extrudeSettings = {
            steps: this.totalSegments,
            bevelEnabled: false,
            extrudePath: curve
        };
        
        const trackGeometry = new THREE.ExtrudeGeometry(trackShape, extrudeSettings);
        const trackMesh = new THREE.Mesh(trackGeometry, this.trackMaterial);
        trackMesh.receiveShadow = true;
        trackMesh.castShadow = false;
        this.scene.add(trackMesh);
        this.trackMeshes.push(trackMesh);
        
        // Add grid overlay on track
        const gridMesh = new THREE.Mesh(trackGeometry.clone(), this.gridMaterial);
        gridMesh.position.y += 0.01; // Slight offset to prevent z-fighting
        this.scene.add(gridMesh);
        this.trackMeshes.push(gridMesh);
        
        // Create track barriers
        const barrierShape = new THREE.Shape();
        barrierShape.moveTo(-1, 0);
        barrierShape.lineTo(-1, 1); // Reduced height from 2 to 1
        barrierShape.lineTo(1, 1); // Reduced height from 2 to 1
        barrierShape.lineTo(1, 0);
        
        // Left barrier
        const leftBarrierCurve = curve.clone();
        const leftBarrierPoints = leftBarrierCurve.getPoints(this.totalSegments);
        
        for (let i = 0; i < leftBarrierPoints.length; i++) {
            // Create normal vector to offset barrier from track edge
            const tangent = leftBarrierCurve.getTangent(i / (leftBarrierPoints.length - 1));
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            
            // Move barriers much further away from track
            leftBarrierPoints[i].add(normal.multiplyScalar(this.trackWidth / 2 + 5)); // Increased from +2 to +5
        }
        
        const leftBarrierCurveFinal = new THREE.CatmullRomCurve3(leftBarrierPoints);
        leftBarrierCurveFinal.closed = true;
        
        const leftBarrierExtrudeSettings = {
            steps: this.totalSegments,
            bevelEnabled: false,
            extrudePath: leftBarrierCurveFinal
        };
        
        const leftBarrierGeometry = new THREE.ExtrudeGeometry(barrierShape, leftBarrierExtrudeSettings);
        const leftBarrierMesh = new THREE.Mesh(leftBarrierGeometry, this.barrierMaterial);
        leftBarrierMesh.castShadow = true;
        this.scene.add(leftBarrierMesh);
        this.trackMeshes.push(leftBarrierMesh);
        
        // Right barrier (similar to left but with inverted normal)
        const rightBarrierCurve = curve.clone();
        const rightBarrierPoints = rightBarrierCurve.getPoints(this.totalSegments);
        
        for (let i = 0; i < rightBarrierPoints.length; i++) {
            const tangent = rightBarrierCurve.getTangent(i / (rightBarrierPoints.length - 1));
            const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
            
            // Move barriers much further away from track
            rightBarrierPoints[i].add(normal.multiplyScalar(this.trackWidth / 2 + 5)); // Increased from +2 to +5
        }
        
        const rightBarrierCurveFinal = new THREE.CatmullRomCurve3(rightBarrierPoints);
        rightBarrierCurveFinal.closed = true;
        
        const rightBarrierExtrudeSettings = {
            steps: this.totalSegments,
            bevelEnabled: false,
            extrudePath: rightBarrierCurveFinal
        };
        
        const rightBarrierGeometry = new THREE.ExtrudeGeometry(barrierShape, rightBarrierExtrudeSettings);
        const rightBarrierMesh = new THREE.Mesh(rightBarrierGeometry, this.barrierMaterial);
        rightBarrierMesh.castShadow = true;
        this.scene.add(rightBarrierMesh);
        this.trackMeshes.push(rightBarrierMesh);
        
        // Store the main curve for future reference (finding positions along track, etc.)
        this.mainCurve = curve;
    }
    
    /**
     * Place collectible quantum particles along the track
     */
    placeCollectibles() {
        // Place collectibles along the track in interesting patterns
        const collectiblesCount = 20;
        
        for (let i = 0; i < collectiblesCount; i++) {
            // Get a position along the track
            const trackRatio = i / collectiblesCount;
            const position = this.mainCurve.getPointAt(trackRatio);
            
            // Get the tangent to position collectibles properly
            const tangent = this.mainCurve.getTangentAt(trackRatio);
            
            // Calculate position offset from center of track
            let offsetX, offsetZ;
            
            // Create different patterns of collectibles
            const pattern = Math.floor(i / 5) % 3;
            
            if (pattern === 0) {
                // Zig-zag pattern
                const zigzag = (i % 5) / 2 - 1; // -1 to 1
                offsetX = tangent.z * zigzag * this.trackWidth * 0.3;
                offsetZ = -tangent.x * zigzag * this.trackWidth * 0.3;
            } else if (pattern === 1) {
                // Circular pattern
                const angle = (i % 5) * Math.PI * 2 / 5;
                offsetX = Math.cos(angle) * this.trackWidth * 0.3;
                offsetZ = Math.sin(angle) * this.trackWidth * 0.3;
            } else {
                // Straight line
                offsetX = ((i % 5) / 4 - 0.5) * this.trackWidth * 0.6;
                offsetZ = 0;
            }
            
            // Create collectible at calculated position
            const collectiblePosition = new THREE.Vector3(
                position.x + offsetX,
                position.y + 1.5, // Height above track
                position.z + offsetZ
            );
            
            // Value based on difficulty of collection
            const value = 1 + Math.floor(Math.random() * 3);
            
            // Create the collectible
            this.particleSystem.createCollectible(collectiblePosition, value);
        }
    }
    
    /**
     * Place lights along the track
     */
    placeLights() {
        const lightCount = 10;
        
        for (let i = 0; i < lightCount; i++) {
            const trackRatio = i / lightCount;
            const position = this.mainCurve.getPointAt(trackRatio);
            
            // Create a light at this position
            const light = new THREE.PointLight(0x00ffff, 3, 30);
            light.position.set(
                position.x,
                position.y + 5,
                position.z
            );
            light.castShadow = false;
            this.scene.add(light);
            this.lights.push(light);
            
            // Add a small glowing sphere as a visual representation of the light
            const lightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.7
            });
            const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
            lightMesh.position.copy(light.position);
            this.scene.add(lightMesh);
        }
    }
    
    /**
     * Apply quantum distortion to track based on player speed
     * @param {number} speed - Current player speed
     * @param {THREE.Vector3} playerPosition - Player's current position
     */
    applyQuantumDistortion(speed, playerPosition) {
        // Calculate distortion amount based on speed
        const distortionFactor = Utils.clamp((speed - 20) / 40, 0, 1);
        
        // No noticeable distortion at low speeds
        if (distortionFactor < 0.1) {
            return;
        }
        
        // Update the track width based on speed
        this.trackWidth = this.baseTrackWidth * (1 + Math.sin(performance.now() * 0.0005) * distortionFactor * 0.2);
        
        // Only update a subset of lights each frame
        const time = performance.now() * 0.001;
        const updateCount = Math.min(3, this.lights.length);
        const startIndex = Math.floor(time) % this.lights.length;
        
        for (let i = 0; i < updateCount; i++) {
            const lightIndex = (startIndex + i) % this.lights.length;
            const light = this.lights[lightIndex];
            
            const pulseRate = 1 + distortionFactor * 2;
            const intensity = 3 + Math.sin(time * pulseRate + lightIndex) * distortionFactor * 5;
            light.intensity = intensity;
            
            // Change color based on speed - only at very high speeds
            if (distortionFactor > 0.7) {
                const hue = (time * 10 * distortionFactor) % 360;
                light.color.set(`hsl(${hue}, 100%, 50%)`);
            }
        }
    }
    
    /**
     * Check if vehicle is on the track
     * @param {THREE.Vector3} position - The position to check
     * @returns {boolean} Whether the position is on the track
     */
    isOnTrack(position) {
        // Find the closest point on the track curve
        const closestPoint = this.getClosestPointOnTrack(position);
        
        // Calculate distance from position to closest point
        const distance = position.distanceTo(closestPoint);
        
        // Check if within track bounds
        return distance <= this.trackWidth / 2;
    }
    
    /**
     * Get the closest point on the track to the given position
     * @param {THREE.Vector3} position - The position to check
     * @returns {THREE.Vector3} The closest point on the track
     */
    getClosestPointOnTrack(position) {
        let closestPoint = null;
        let closestDistance = Infinity;
        
        // Sample points along the curve
        const samples = 50;
        
        for (let i = 0; i < samples; i++) {
            const t = i / samples;
            const pointOnCurve = this.mainCurve.getPointAt(t);
            const distance = position.distanceTo(pointOnCurve);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = pointOnCurve;
            }
        }
        
        return closestPoint;
    }
    
    /**
     * Update the track
     * @param {number} deltaTime - Time since last update
     * @param {number} speed - Current player speed
     * @param {THREE.Vector3} playerPosition - Player's current position
     */
    update(deltaTime, speed, playerPosition) {
        // Apply quantum distortion effects based on speed
        if (speed > 20 || Math.floor(performance.now() / 100) % 2 === 0) {
            this.applyQuantumDistortion(speed, playerPosition);
        }
    }
}

// Export the Track class
window.Track = Track; 