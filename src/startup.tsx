import { useEffect, useState } from 'react';
import { useWorld } from 'koota/react';
import { actions } from './actions';
import { Vector3 } from 'three';

/**
 * Initializes the world and spawns necessary entities
 */
export function Startup({ initialCameraPosition }: { initialCameraPosition: [number, number, number] }) {
	const world = useWorld();
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (world && !initialized) {
			console.log("==========================================");
			console.log("              GAME STARTUP                ");
			console.log("==========================================");
			
			try {
				// Create the actions object with the world
				const gameActions = actions(world);
				
				// Create procedural track
				console.log("Spawning procedural track");
				const trackEntity = gameActions.spawnTrack();
				console.log(`Track entity spawned: ${trackEntity?.id}`);
				
				// Camera position debugging
				console.log(`Spawning camera at position: (${initialCameraPosition[0]}, ${initialCameraPosition[1]}, ${initialCameraPosition[2]})`);
				
				// Spawn camera using the actions API
				const cameraEntity = gameActions.spawnCamera(initialCameraPosition);
				console.log(`Camera spawned: ${cameraEntity?.id}`);
				
				// Spawn player using the actions API
				console.log("Spawning player entity");
				const playerEntity = gameActions.spawnPlayer();
				console.log(`Player spawned: ${playerEntity?.id}`);
				
				console.log("Game initialization complete");
				console.log("==========================================");
				
				setInitialized(true);
			} catch (error) {
				console.error("Error during game initialization:", error);
			}
		}
	}, [world, initialized, initialCameraPosition]);

	return null;
}
