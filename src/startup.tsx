import { useFrame } from '@react-three/fiber';
import { useActions, useWorld } from 'koota/react';
import { useEffect } from 'react';
import { actions } from './actions';
import { updateSpatialHashing } from './systems/update-spatial-hashing';

export function Startup({
	initialCameraPosition = [0, 4, 15],
}: {
	initialCameraPosition?: [number, number, number];
}) {
	const { spawnPlayer, spawnCamera, spawnTrack } = useActions(actions);
	const world = useWorld();

	useEffect(() => {
		// Spawn camera
		const camera = spawnCamera(initialCameraPosition);

		// Spawn player vehicle
		const player = spawnPlayer();
		
		// Spawn track
		const track = spawnTrack();

		return () => {
			player.destroy();
			track.destroy();
			camera.destroy();
		};
	}, [spawnPlayer, spawnCamera, spawnTrack, initialCameraPosition]);

	useFrame(() => {
		updateSpatialHashing(world);
	});

	return null;
}
