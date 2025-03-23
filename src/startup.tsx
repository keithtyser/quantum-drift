import { useEffect, useRef, useState } from 'react';
import { useWorld } from 'koota/react';
import { isWorldInitialized } from './world';
import { IsPlayer, IsCamera } from './traits';

/**
 * Component that verifies world initialization rather than performing it
 * Initialization is now done in world.ts before React rendering
 */
export function Startup({ initialCameraPosition }: { initialCameraPosition: [number, number, number] }) {
	const world = useWorld();
	const [error, setError] = useState<Error | null>(null);
	const checkPerformed = useRef(false);

	useEffect(() => {
		// Skip if world is not yet available
		if (!world || checkPerformed.current) return;
		
		checkPerformed.current = true;
		
		console.log("Startup component - Verifying world initialization...");
		
		try {
			// Verify world is properly initialized
			if (!isWorldInitialized()) {
				throw new Error("World not properly initialized before component rendering");
			}
			
			// Additional verification could be done here
			const playerCount = world.query(IsPlayer).length;
			const cameraCount = world.query(IsCamera).length;
			
			console.log(`Verification complete: Found ${playerCount} player entities and ${cameraCount} camera entities`);
			
			if (playerCount === 0) {
				console.warn("No player entities found during verification!");
			}
			
			if (cameraCount === 0) {
				console.warn("No camera entities found during verification!");
			}
		} catch (err) {
			console.error("Error during startup verification:", err);
			setError(err instanceof Error ? err : new Error(String(err)));
		}
	}, [world]);

	// Display error if initialization check failed
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
