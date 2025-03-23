import { World } from 'koota';
import { Transform, Ref } from '../traits';
import * as THREE from 'three';

// For tracking frame count
let frameCount = 0;
let syncStats = {
	total: 0,
	successful: 0,
	errors: 0
};

export function syncView(world: World) {
	frameCount++;
	let entitiesProcessed = 0;
	
	// Log entities for debugging - only periodically to avoid spam
	if (frameCount % 60 === 0) {
		console.log(`SyncView: Beginning view synchronization - Frame ${frameCount}`);
		console.log(`SyncView Stats: Total=${syncStats.total}, Successful=${syncStats.successful}, Errors=${syncStats.errors}`);
		
		// Show total entities with Transform and Ref traits
		const entitiesWithTransform = world.query(Transform).length;
		const entitiesWithRef = world.query(Ref).length;
		const entitiesWithBoth = world.query(Transform, Ref).length;
		
		console.log(`SyncView: Entities with Transform=${entitiesWithTransform}, with Ref=${entitiesWithRef}, with both=${entitiesWithBoth}`);
	}

	// Reset counters for this frame
	syncStats.total = 0;
	syncStats.successful = 0;
	syncStats.errors = 0;

	world.query(Transform, Ref).updateEach(([transform, view]) => {
		syncStats.total++;
		entitiesProcessed++;
		
		try {
			// Skip if any component is null or undefined
			if (!view || !transform) {
				console.warn("SyncView: Missing transform or view reference");
				syncStats.errors++;
				return;
			}
			
			// Check if the view object exists in the scene graph
			if (!view.parent) {
				if (frameCount % 60 === 0) {
					console.warn("SyncView: View reference not parented in the scene");
				}
				syncStats.errors++;
				return;
			}
			
			// Copy transform data to the view
			view.position.copy(transform.position);
			view.rotation.copy(transform.rotation);
			view.scale.copy(transform.scale);
			
			// Force matrix update to ensure consistent rendering
			view.updateMatrix();
			view.updateMatrixWorld(true);
			
			syncStats.successful++;
		} catch (error) {
			console.error("SyncView: Error synchronizing view:", error);
			syncStats.errors++;
		}
	});
	
	// Detailed logging every 60 frames
	if (frameCount % 60 === 0) {
		console.log(`SyncView: Processed ${entitiesProcessed} entities this frame`);
		
		// If we processed no entities, something might be wrong
		if (entitiesProcessed === 0) {
			console.warn("SyncView: No entities were processed! This may indicate a problem.");
		}
	}
}
