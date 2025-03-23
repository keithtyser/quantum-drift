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
	
	// Log for debugging
	useEffect(() => {
		if (entity.has(Transform)) {
			const transform = entity.get(Transform)!;
			console.log("Camera entity position:", transform.position.toArray());
		}
	}, [entity]);
	
	const setInitial = useCallback(
		(cameraRef: ComponentRef<typeof PerspectiveCamera> | null) => {
			if (!cameraRef) return;
			
			console.log("Setting up camera reference");
			setCamera(cameraRef);
			
			// Store a reference to the camera in the entity
			entity.add(Ref(cameraRef));
			
			// Log position for debugging
			if (entity.has(Transform)) {
				const transform = entity.get(Transform)!;
				console.log("Camera initialized at position:", transform.position.toArray());
			}
		},
		[entity]
	);
	
	// Manual position sync for debugging - shouldn't be needed but helps diagnose issues
	useEffect(() => {
		if (!camera || !entity.has(Transform)) return;
		
		const syncTransform = () => {
			const transform = entity.get(Transform);
			if (!transform) return;
			
			// Force the camera position to match the entity
			camera.position.copy(transform.position);
			camera.rotation.copy(transform.rotation);
		};
		
		// More frequent sync for debugging
		const intervalId = setInterval(syncTransform, 16); // 60fps
		
		return () => clearInterval(intervalId);
	}, [camera, entity]);
	
	// Update FOV based on player speed and log player entity status
	useFrame(() => {
		if (!camera) return;
		
		// Find player entity
		const player = world.queryFirst(IsPlayer, Movement);
		
		// Log camera and player relationship for debugging
		if (frameCount % 60 === 0) {
			console.log("Camera following: Player found =", !!player);
			if (player && camera) {
				const playerPosition = player.get(Transform)?.position;
				if (playerPosition) {
					const distance = playerPosition.distanceTo(camera.position);
					console.log(`Camera distance to player: ${distance.toFixed(2)}`);
				}
			}
		}
		
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

// Track frame count for logging
let frameCount = 0;

export function CameraRenderer() {
	const camera = useQueryFirst(IsCamera, Transform);
	console.log("CameraRenderer - Camera entity found:", !!camera);
	
	// Increment frame count for logging purposes
	useFrame(() => {
		frameCount++;
	});
	
	if (!camera) return null;
	return <CameraView entity={camera} />;
}
