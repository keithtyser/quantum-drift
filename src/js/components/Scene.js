import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Scene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }

    init() {
        console.log('Initializing scene...');
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
            
            console.log('Scene created');

            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                1000
            );
            this.camera.position.set(0, 2, 5);
            this.camera.lookAt(0, 0, 0);
            
            console.log('Camera created');

            // Create renderer with preserveDrawingBuffer for better compatibility
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                preserveDrawingBuffer: true,
                alpha: true
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0x87CEEB, 1); // Set a clear color
            document.body.appendChild(this.renderer.domElement);
            
            console.log('Renderer created and added to DOM');

            // Add a simple test cube to verify rendering
            const testCube = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            testCube.position.set(0, 0, -5);
            this.scene.add(testCube);
            
            console.log('Test cube added');

            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            this.scene.add(ambientLight);
            
            console.log('Ambient light added');

            // Add directional light
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(10, 20, 15);
            this.scene.add(directionalLight);
            
            console.log('Directional light added');

            // Handle window resize
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            console.log('Scene initialization complete');
        } catch (error) {
            console.error('Scene initialization error:', error);
            throw error;
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('Render error:', error);
        }
    }
} 