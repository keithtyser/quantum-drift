/**
 * Game controller for Quantum Drift
 * Manages game state, components, and game loop
 */

class Game {
    /**
     * Create a new game instance
     */
    constructor() {
        // Game state
        this.state = 'loading'; // loading, menu, playing, gameover
        this.lastTime = 0;
        this.paused = false;
        
        // Game objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.track = null;
        this.vehicle = null;
        this.particleSystem = null;
        this.quantumEffects = null;
        
        // Game settings
        this.settings = {
            cameraFollowDistance: 10,
            cameraHeight: 4,
            cameraLookAhead: 5
        };
        
        // OPTIMIZATION: Performance monitoring
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 0;
        
        // Initialize the game
        this.init();
    }
    
    /**
     * Initialize the game
     */
    async init() {
        this.setupThreeJS();
        this.setupEventListeners();
        this.setupGame();
        
        // Start the game loop
        this.gameLoop(0);
        
        // Simulate loading time
        setTimeout(() => {
            this.showMenu();
        }, 2000);
    }
    
    /**
     * Set up Three.js renderer, scene, and camera
     */
    setupThreeJS() {
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false, // OPTIMIZATION: Disable antialiasing
            powerPreference: 'high-performance' // OPTIMIZATION: Request high-performance GPU
        });
        
        // OPTIMIZATION: Set pixel ratio to 1 for better performance
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // OPTIMIZATION: Limit shadow map quality
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap; // OPTIMIZATION: Use faster shadow algorithm
        
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000820); // Deep space blue
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1500 // OPTIMIZATION: Reduced far plane from 3000 to 1500
        );
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // Add directional light (like a sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        
        // OPTIMIZATION: Lower shadow quality
        dirLight.shadow.mapSize.width = 1024; // Reduced from 2048
        dirLight.shadow.mapSize.height = 1024; // Reduced from 2048
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        
        this.scene.add(dirLight);
        
        // OPTIMIZATION: Add performance stats UI
        this.setupPerformanceUI();
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    /**
     * Set up performance monitoring UI
     */
    setupPerformanceUI() {
        const fpsDisplay = document.createElement('div');
        fpsDisplay.id = 'fps-display';
        fpsDisplay.style.position = 'fixed';
        fpsDisplay.style.top = '10px';
        fpsDisplay.style.right = '10px';
        fpsDisplay.style.padding = '5px';
        fpsDisplay.style.background = 'rgba(0,0,0,0.5)';
        fpsDisplay.style.color = '#0f0';
        fpsDisplay.style.fontFamily = 'monospace';
        fpsDisplay.style.zIndex = '1000';
        fpsDisplay.textContent = 'FPS: --';
        document.body.appendChild(fpsDisplay);
        
        // Add quality settings button
        const qualityBtn = document.createElement('button');
        qualityBtn.id = 'quality-toggle';
        qualityBtn.style.position = 'fixed';
        qualityBtn.style.top = '40px';
        qualityBtn.style.right = '10px';
        qualityBtn.style.padding = '5px';
        qualityBtn.style.zIndex = '1000';
        qualityBtn.textContent = 'Toggle Low Quality';
        qualityBtn.addEventListener('click', () => this.toggleLowQuality());
        document.body.appendChild(qualityBtn);
    }
    
    /**
     * Toggle between low and normal quality
     */
    toggleLowQuality() {
        const currentPixelRatio = this.renderer.getPixelRatio();
        
        if (currentPixelRatio === 1) {
            // Switch to low quality
            this.renderer.setPixelRatio(0.65);
            document.getElementById('quality-toggle').textContent = 'Toggle Normal Quality';
        } else {
            // Switch to normal quality
            this.renderer.setPixelRatio(1);
            document.getElementById('quality-toggle').textContent = 'Toggle Low Quality';
        }
    }
    
    /**
     * Set up game components
     */
    setupGame() {
        // Create particle system
        this.particleSystem = new ParticleSystem(this.scene);
        
        // Create quantum effects
        this.quantumEffects = new QuantumEffects(this.scene, this.camera, this.renderer);
        
        // Create track
        this.track = new Track(this.scene, this.particleSystem);
        
        // Create vehicle (after track so we can position it on the track)
        this.vehicle = new Vehicle(this.scene, this.particleSystem);
        
        // FIXED: Position vehicle better at start of track to avoid barriers completely
        // Use a larger offset and add height
        const startPosition = this.track.mainCurve.getPointAt(0.05);
        this.vehicle.position.copy(startPosition);
        this.vehicle.position.y += 3; // Lift significantly above track for clear starting position
        
        // Get tangent at start to orient vehicle correctly
        const startTangent = this.track.mainCurve.getTangentAt(0.05);
        const angle = Math.atan2(startTangent.x, startTangent.z);
        this.vehicle.rotation.y = angle;
        
        // Update vehicle mesh position and rotation
        this.vehicle.mesh.position.copy(this.vehicle.position);
        this.vehicle.mesh.rotation.y = this.vehicle.rotation.y;
    }
    
    /**
     * Set up event listeners for UI interaction
     */
    setupEventListeners() {
        // Start button
        document.getElementById('start-button').addEventListener('click', () => {
            this.startGame();
        });
        
        // Instructions button
        document.getElementById('instructions-button').addEventListener('click', () => {
            Utils.hideElement('menu-screen');
            Utils.showElement('instructions-screen');
        });
        
        // Back button (on instructions)
        document.getElementById('back-button').addEventListener('click', () => {
            Utils.hideElement('instructions-screen');
            Utils.showElement('menu-screen');
        });
        
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this.startGame();
        });
        
        // Pause/resume with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.state === 'playing') {
                this.togglePause();
            }
        });
    }
    
    /**
     * Show the menu screen
     */
    showMenu() {
        this.state = 'menu';
        Utils.hideElement('loading-screen');
        Utils.showElement('menu-screen');
    }
    
    /**
     * Start the game
     */
    startGame() {
        this.state = 'playing';
        Utils.hideElement('menu-screen');
        Utils.hideElement('instructions-screen');
        Utils.hideElement('game-over-screen');
        Utils.showElement('game-ui');
        
        // FIXED: Better reset of game state with larger offset from track start
        const startPosition = this.track.mainCurve.getPointAt(0.05);
        this.vehicle.position.copy(startPosition);
        this.vehicle.position.y += 3; // Lift significantly above track
        
        // Reset vehicle orientation
        const startTangent = this.track.mainCurve.getTangentAt(0.05);
        const angle = Math.atan2(startTangent.x, startTangent.z);
        this.vehicle.rotation.y = angle;
        this.vehicle.direction = new THREE.Vector3(startTangent.x, 0, startTangent.z).normalize();
        
        // Reset physics state
        this.vehicle.velocity = new THREE.Vector3(0, 0, 0);
        this.vehicle.speed = 0;
        this.vehicle.quantumParticles = 0;
        this.vehicle.distanceTraveled = 0;
        this.vehicle.isOnGround = true;
        
        // Make sure mesh is updated
        this.vehicle.mesh.position.copy(this.vehicle.position);
        this.vehicle.mesh.rotation.y = this.vehicle.rotation.y;
        
        // Update UI
        Utils.updateElementText('speed-value', '0');
        Utils.updateElementText('particles-count', '0');
    }
    
    /**
     * End the game
     */
    endGame() {
        this.state = 'gameover';
        Utils.hideElement('game-ui');
        Utils.showElement('game-over-screen');
        
        // Update final stats
        Utils.updateElementText('distance-value', Math.floor(this.vehicle.distanceTraveled));
        Utils.updateElementText('final-particles-count', this.vehicle.quantumParticles);
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.paused = !this.paused;
    }
    
    /**
     * Update camera to follow the vehicle
     */
    updateCamera() {
        // Calculate camera position
        // Position behind vehicle with offset based on speed
        const followDistance = this.settings.cameraFollowDistance + (this.vehicle.speed * 0.1);
        
        // Calculate target position for smooth following
        const vehiclePosition = this.vehicle.mesh.position;
        const vehicleDirection = this.vehicle.direction;
        
        // Position camera behind and above vehicle
        const idealOffset = new THREE.Vector3(
            -vehicleDirection.x * followDistance,
            this.settings.cameraHeight,
            -vehicleDirection.z * followDistance
        );
        
        // Look ahead based on speed
        const lookAhead = this.settings.cameraLookAhead + (this.vehicle.speed * 0.05);
        const lookAtPosition = new THREE.Vector3(
            vehiclePosition.x + vehicleDirection.x * lookAhead,
            vehiclePosition.y + 1,
            vehiclePosition.z + vehicleDirection.z * lookAhead
        );
        
        // Smooth camera movement
        const cameraPosition = new THREE.Vector3().addVectors(vehiclePosition, idealOffset);
        this.camera.position.lerp(cameraPosition, 0.1);
        
        // Look at position ahead of vehicle (smoother turns)
        this.camera.lookAt(lookAtPosition);
    }
    
    /**
     * Update FPS counter
     */
    updateFPS(timestamp) {
        this.frameCount++;
        
        const elapsed = timestamp - this.lastFpsUpdate;
        
        if (elapsed >= 1000) { // Update every second
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;
            
            // Update UI
            const fpsDisplay = document.getElementById('fps-display');
            if (fpsDisplay) {
                fpsDisplay.textContent = `FPS: ${this.fps}`;
                // Color code based on performance
                if (this.fps >= 50) {
                    fpsDisplay.style.color = '#0f0'; // Green
                } else if (this.fps >= 30) {
                    fpsDisplay.style.color = '#ff0'; // Yellow
                } else {
                    fpsDisplay.style.color = '#f00'; // Red
                }
            }
        }
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap delta time to avoid large jumps
        this.lastTime = timestamp;
        
        // Update FPS counter
        this.updateFPS(timestamp);
        
        // Skip updates if paused
        if (!this.paused && this.state === 'playing') {
            // Update game components
            this.vehicle.update(deltaTime, this.track);
            this.track.update(deltaTime, this.vehicle.speed, this.vehicle.position);
            this.particleSystem.update(deltaTime, this.vehicle.speed, this.vehicle.position);
            this.quantumEffects.update(deltaTime, this.vehicle.speed, this.vehicle.position);
            
            // Update camera
            this.updateCamera();
            
            // Check for game over conditions
            if (this.vehicle.position.y < -50) {
                this.endGame();
            }
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Continue the game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
}

// Export the Game class
window.Game = Game; 