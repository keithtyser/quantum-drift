import { World } from 'koota';
import { Transform, Ref } from '../traits';
import * as THREE from 'three';

export function syncView(world: World) {
	// Log entities for debugging - only every 100 frames to avoid spam
	const frameCount = Math.floor(performance.now() / 16) % 100; // ~60fps
	
	if (frameCount === 0) {
		// Debug log every few seconds
		console.log(`Syncing entities with visual references`);
	}

	world.query(Transform, Ref).updateEach(([transform, view]) => {
		// Ensure valid objects
		if (!view || !transform) return;
		
		// Check if the object exists in the scene
		if (!view.parent) {
			console.warn("View reference not parented in the scene");
		}
		
		// Copy transform data to the view
		view.position.copy(transform.position);
		view.rotation.copy(transform.rotation);
		view.scale.copy(transform.scale);
		
		// Force matrix update to ensure consistent rendering
		view.updateMatrix();
		view.updateMatrixWorld(true);
	});
}
