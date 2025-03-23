import { useEffect, useRef, useState } from 'react';
import { useWorld } from 'koota/react';
import { actions } from './actions';

/**
 * Initializes the world and spawns necessary entities
 */
export function Startup({ initialCameraPosition }: { initialCameraPosition: [number, number, number] }) {
	const world = useWorld();
	// Use a ref instead of state to track initialization across StrictMode remounts
	const initializationAttempted = useRef(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// Skip if world is not yet available
		if (!world) return;

		console.log("==========================================");
		console.log("           STARTUP USE EFFECT            ");
		console.log("  Initialization attempted:", initializationAttempted.current);
		console.log("==========================================");
		
		// Return early if initialization was already attempted
		// This helps with React StrictMode double-mounting
		if (initializationAttempted.current) {
			console.log("Startup already attempted, skipping initialization");
			return;
		}

		// Mark initialization as attempted
		initializationAttempted.current = true;
		
		try {
			console.log("==========================================");
			console.log("              GAME STARTUP                ");
			console.log("==========================================");
			
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
			
			// Check if player entity was created successfully
			if (!playerEntity) {
				console.error("Player entity creation failed - returned undefined/null");
				throw new Error("Failed to create player entity");
			}
			
			console.log("Game initialization complete");
			console.log("==========================================");
		} catch (err) {
			console.error("Error during game initialization:", err);
			setError(err instanceof Error ? err : new Error(String(err)));
		}
	}, [world, initialCameraPosition]);

	// Display error if initialization failed
	if (error) {
		return (
			<div style={{ 
				position: 'absolute', 
				top: '50%', 
				left: '50%', 
				transform: 'translate(-50%, -50%)',
				background: 'rgba(255,0,0,0.8)',
				padding: '20px',
				borderRadius: '8px',
				color: 'white',
				maxWidth: '80%',
				zIndex: 1000
			}}>
				<h2>Game Initialization Error</h2>
				<p>{error.message}</p>
				<pre>{error.stack}</pre>
			</div>
		);
	}

	return null;
}
