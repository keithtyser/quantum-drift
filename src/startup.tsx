import { useEffect } from 'react';
import { useWorld, useActions } from 'koota/react';
import { actions } from './actions';
import { DebugControls } from './components/debug-controls';

/**
 * Initializes the world and spawns necessary entities
 */
export function Startup({ initialCameraPosition = [0, 5, 10] }: { initialCameraPosition?: [number, number, number] }) {
	const world = useWorld();
	const { spawnCamera, spawnPlayer, spawnTrack } = useActions(actions);

	useEffect(() => {
		// Initialize world with required entities
		if (world) {
			console.log('Starting up game...');

			// Spawn entities
			const trackEntity = spawnTrack();
			const playerEntity = spawnPlayer();
			spawnCamera(initialCameraPosition);
			
			console.log('Entities spawned:', {
				track: trackEntity?.id,
				player: playerEntity?.id
			});

			// Reset player when double tap 'r' key
			let lastRKeyTime = 0;
			document.addEventListener('keydown', (e) => {
				if (e.key === 'r') {
					const now = Date.now();
					if (now - lastRKeyTime < 500) { // 500ms window for double tap
						console.log('Double-tap R detected - reset player would go here');
						// This would need a resetPlayer action to be implemented
					}
					lastRKeyTime = now;
				}
			});
		}
	}, [world, spawnCamera, spawnPlayer, spawnTrack, initialCameraPosition]);

	// We've moved the game loop logic to frameloop.ts, so we don't need it here

	return <DebugControls />;
}
