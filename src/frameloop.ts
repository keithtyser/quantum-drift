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
import { enforceTrackBoundaries } from './systems/track-boundary';
import { updateSpatialHashing } from './systems/update-spatial-hashing';
import { IsPlayer, Transform } from './traits';

export function GameLoop() {
	const world = useWorld();
	let frameCount = 0;

	useFrame(() => {
		if (!world) return;
		
		// Only log every 100 frames to avoid console spam
		frameCount++;
		if (frameCount % 100 === 0) {
			console.log(`Frame ${frameCount} executing...`);
		}

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
		
		// Track boundary collision detection
		enforceTrackBoundaries(world);
		
		// Spatial hashing for optimized collision detection
		updateSpatialHashing(world);
		
		// Camera updates
		cameraFollowPlayer(world);

		// Sync view state
		syncView(world);
		
		// Debug output every 60 frames
		if (frameCount % 60 === 0) {
			const player = world.queryFirst(IsPlayer, Transform);
			if (player) {
				const transform = player.get(Transform);
				console.log('Player position:', transform?.position.toArray());
			}
		}
	});

	return null;
}
