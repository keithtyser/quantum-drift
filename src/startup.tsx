import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useWorld, useActions } from 'koota/react';
import { sortEntitiesByDistance } from './utils/sort-entities-by-distance';
import { actions } from './actions';
import { resetTrack } from './systems/track-manager';
import { updateSpatialHashing } from './systems/update-spatial-hashing';

export function Startup() {
	const world = useWorld();
	const { spawnCamera, spawnPlayer, spawnTrack } = useActions(actions);

	// When component mounts, spawn initial entities
	useEffect(() => {
		// Spawn camera
		const camera = spawnCamera([0, 4, 15]);
		// Spawn player
		const player = spawnPlayer();
		// Spawn ground track
		const track = spawnTrack();

		// Clean up entities when component unmounts
		return () => {
			player.destroy();
			track.destroy();
			camera.destroy();
			// Reset track manager state to clean up any track segments
			resetTrack();
		};
	}, [spawnCamera, spawnPlayer, spawnTrack]);

	// Update spatial hashing
	useFrame(() => {
		updateSpatialHashing(world);
	});

	return null;
}
