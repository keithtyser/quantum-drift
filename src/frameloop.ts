import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { syncView } from './systems/sync-view';
import { updateTime } from './systems/update-time';
import { moveEntities } from './systems/move-entities';
import { pollInput } from './systems/poll-input';
import { convertInputToMovement } from './systems/apply-input';
import { applyForce } from './systems/apply-force';
import { limitSpeed } from './systems/limit-speed';
import { cameraFollowPlayer } from './systems/camera-follow-player';
import { updateTrackSegments } from './systems/track-manager';

export function GameLoop() {
	const world = useWorld();

	useFrame(() => {
		// Start
		updateTime(world);

		// Input handling
		pollInput(world);
		
		// Physics updates
		convertInputToMovement(world);
		applyForce(world);
		moveEntities(world);
		limitSpeed(world);
		
		// Track updates
		updateTrackSegments(world);
		
		// Camera updates
		cameraFollowPlayer(world);

		// Sync view state
		syncView(world);
	});

	return null;
}
