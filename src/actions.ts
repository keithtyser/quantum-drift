import { createActions } from 'koota';
import * as THREE from 'three';
import { IsPlayer, Transform, IsCamera, IsTrack, Movement, Input, MaxSpeed } from './traits';
import { spawnInitialTrack } from './systems/track-manager';

export const actions = createActions((world) => ({
	spawnPlayer: () => world.spawn(
		IsPlayer, 
		Transform({
			position: new THREE.Vector3(0, 0.5, 0),
			rotation: new THREE.Euler(0, 0, 0),
			scale: new THREE.Vector3(1, 1, 1),
		}),
		Movement({
			velocity: new THREE.Vector3(0, 0, 0),
			thrust: 10, // Increased thrust for vehicle movement
			damping: 0.98, // Slightly reduced damping for smoother deceleration
			force: new THREE.Vector3(0, 0, 0),
		}),
		Input,
		MaxSpeed({
			maxSpeed: 30, // Vehicle max speed
		})
	),
	spawnCamera: (position: [number, number, number]) => {
		return world.spawn(Transform({ position: new THREE.Vector3(...position) }), IsCamera);
	},
	spawnTrack: () => {
		// Create a basic track entity as a reference ground plane
		const trackEntity = world.spawn(IsTrack, Transform({ position: new THREE.Vector3(0, -0.5, 0) }));
		
		// Initialize procedural track segments
		spawnInitialTrack(world);
		
		return trackEntity;
	},
}));
