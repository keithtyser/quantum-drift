import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { syncView } from './systems/sync-view';
import { updateTime } from './systems/update-time';
import { moveEntities } from './systems/move-entities';
import { pollInput } from './systems/poll-input';
import { convertInputToMovement } from './systems/apply-input';
import { limitSpeed } from './systems/limit-speed';
import { cameraFollowPlayer } from './systems/camera-follow-player';

export function GameLoop() {
	const world = useWorld();

	useFrame(() => {
		// Start
		updateTime(world);

		// Input handling
		pollInput(world);
		
		// Physics updates - note we're skipping applyForce since we now directly modify velocity
		convertInputToMovement(world);
		moveEntities(world);
		limitSpeed(world);
		
		// Camera updates
		cameraFollowPlayer(world);

		// Sync view state
		syncView(world);
	});

	return null;
}
