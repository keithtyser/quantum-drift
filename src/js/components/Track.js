import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class Track {
    constructor() {
        this.trackMesh = null;
    }

    init(scene) {
        // Create a straight track
        const trackLength = 100;
        const trackWidth = 10;
        
        // Create track geometry
        const trackGeometry = new THREE.PlaneGeometry(trackWidth, trackLength);
        
        // Create track material - use darker color for better contrast
        const trackMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222
        });
        
        // Create track mesh
        this.trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        this.trackMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        this.trackMesh.position.z = -trackLength / 2; // Position so track extends forward
        
        // Add track to scene
        scene.add(this.trackMesh);
        
        // Add side lines for the track
        this.addTrackLines(scene, trackLength, trackWidth);
        
        // Add environment elements
        this.addEnvironment(scene);
    }
    
    addTrackLines(scene, trackLength, trackWidth) {
        // Create material for track lines - brighter white
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // Create line geometry
        const lineGeometry = new THREE.BoxGeometry(0.3, 0.1, trackLength);
        
        // Create left line
        const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
        leftLine.position.set(-trackWidth / 2 + 0.5, 0.01, -trackLength / 2);
        scene.add(leftLine);
        
        // Create right line
        const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
        rightLine.position.set(trackWidth / 2 - 0.5, 0.01, -trackLength / 2);
        scene.add(rightLine);
        
        // Create center dashed line
        for (let i = 0; i < trackLength; i += 3) {
            const dashGeometry = new THREE.BoxGeometry(0.3, 0.1, 1);
            const dash = new THREE.Mesh(dashGeometry, lineMaterial);
            dash.position.set(0, 0.01, -i);
            scene.add(dash);
        }
    }
    
    addEnvironment(scene) {
        // Add a ground plane - brighter green
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        scene.add(ground);
        
        // Add simple skybox
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87ceeb,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        scene.add(sky);
    }
} 