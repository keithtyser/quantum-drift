import { createActions } from 'koota';
import * as THREE from 'three';
import { IsPlayer, Transform, IsCamera, IsTrack } from './traits';

export const actions = createActions((world) => ({
	spawnPlayer: () => world.spawn(IsPlayer, Transform),
	spawnCamera: (position: [number, number, number]) => {
		return world.spawn(Transform({ position: new THREE.Vector3(...position) }), IsCamera);
	},
	spawnTrack: () => {
		return world.spawn(IsTrack, Transform({ position: new THREE.Vector3(0, -0.5, 0) }));
	},
}));
