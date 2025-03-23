import { useQueryFirst } from 'koota/react';
import { IsCamera, Ref, Transform, Movement, IsPlayer } from '../traits';
import { PerspectiveCamera } from '@react-three/drei';
import { Entity } from 'koota';
import { ComponentRef, useCallback, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorld } from 'koota/react';

const BASE_FOV = 70; // Base field of view
const MAX_FOV_INCREASE = 15; // Maximum FOV increase at max speed
const MAX_SPEED_REFERENCE = 30; // Speed at which max FOV is reached

function CameraView({ entity }: { entity: Entity }) {
	const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
	const world = useWorld();
	
	const setInitial = useCallback(
		(cameraRef: ComponentRef<typeof PerspectiveCamera> | null) => {
			if (!cameraRef) return;
			setCamera(cameraRef);
			entity.add(Ref(cameraRef));
		},
		[entity]
	);
	
	// Update FOV based on player speed
	useFrame(() => {
		if (!camera) return;
		
		// Find player entity
		const player = world.queryFirst(IsPlayer, Movement);
		
		if (player && player.has(Movement)) {
			const movement = player.get(Movement)!;
			const speed = movement.velocity.length();
			
			// Calculate dynamic FOV based on speed
			const speedFactor = Math.min(speed / MAX_SPEED_REFERENCE, 1);
			const targetFOV = BASE_FOV + (MAX_FOV_INCREASE * speedFactor);
			
			// Smoothly adjust FOV
			camera.fov += (targetFOV - camera.fov) * 0.05;
			camera.updateProjectionMatrix();
		}
	});

	return <PerspectiveCamera ref={setInitial} makeDefault fov={BASE_FOV} near={0.1} far={1000} />;
}

export function CameraRenderer() {
	const camera = useQueryFirst(IsCamera, Transform);
	if (!camera) return null;
	return <CameraView entity={camera} />;
}
