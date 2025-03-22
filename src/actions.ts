import { createActions } from 'koota';
import * as THREE from 'three';
import { IsPlayer, Transform, IsCamera, IsTrack, Movement, Input, MaxSpeed } from './traits';
import { spawnInitialTrack } from './systems/track-manager';

// Log actions for debugging
const logAction = (action: string, ...args: any[]) => {
	console.log(`[ACTION] ${action}`, ...args);
};

export const actions = createActions((world) => ({
	spawnPlayer: () => {
		logAction('spawnPlayer');
		
		// Spawn player with more height to prevent falling through track
		return world.spawn(
			IsPlayer, 
			Transform({
				position: new THREE.Vector3(0, 1.0, 0), // Increased height
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
		);
	},
	spawnCamera: (position: [number, number, number]) => {
		logAction('spawnCamera', position);
		
		return world.spawn(
			IsCamera, 
			Transform({ 
				position: new THREE.Vector3(...position),
				rotation: new THREE.Euler(0, 0, 0),
				scale: new THREE.Vector3(1, 1, 1),
			})
		);
	},
	spawnTrack: () => {
		logAction('spawnTrack');
		
		// Create a basic track entity as a reference ground plane
		const trackEntity = world.spawn(
			IsTrack, 
			Transform({ 
				position: new THREE.Vector3(0, -0.5, 0),
				rotation: new THREE.Euler(0, 0, 0),
				scale: new THREE.Vector3(1, 1, 1),
			})
		);
		
		// Initialize procedural track segments
		console.log('Initializing procedural track segments');
		spawnInitialTrack(world);
		
		return trackEntity;
	},
}));
