import { useGLTF } from '@react-three/drei';
import { Entity } from 'koota';
import { useQueryFirst } from 'koota/react';
import { useRef, MutableRefObject, useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Group } from 'three';
import src from '../assets/ships/fighter.glb?url';
import { IsPlayer, Transform, Ref, Movement } from '../traits';

export function PlayerView({ entity }: { entity: Entity }) {
	const { scene } = useGLTF(src);
	const groupRef = useRef<Group | null>(null) as MutableRefObject<Group | null>;
	const [wheels, setWheels] = useState<THREE.Mesh[]>([]);
	
	// Clone the model and create the vehicle
	useEffect(() => {
		if (!groupRef.current) return;
		
		// Add wheel meshes - these are separate from the imported model
		const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32);
		const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#333333' });
		
		const wheelPositions = [
			new THREE.Vector3(0.7, -0.4, 0.8), // front right
			new THREE.Vector3(-0.7, -0.4, 0.8), // front left
			new THREE.Vector3(0.7, -0.4, -0.8), // rear right
			new THREE.Vector3(-0.7, -0.4, -0.8), // rear left
		];
		
		const newWheels = wheelPositions.map((position) => {
			const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
			wheel.position.copy(position);
			wheel.rotation.set(Math.PI / 2, 0, 0); // Rotate to the correct orientation
			groupRef.current?.add(wheel);
			return wheel;
		});
		
		setWheels(newWheels);
		
		// Adjust the model position and rotation
		scene.position.set(0, 0, 0);
		scene.rotation.set(0, Math.PI, 0); // Facing forward
		scene.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
		
		return () => {
			newWheels.forEach(wheel => {
				groupRef.current?.remove(wheel);
				wheel.geometry.dispose();
				(wheel.material as THREE.Material).dispose();
			});
		};
	}, [scene, groupRef.current]);

	// Set up initial state with useCallback
	const setInitial = useCallback(
		(group: Group | null) => {
			if (!group) return;
			groupRef.current = group;

			// Initialize with default position at origin
			entity.add(Ref(scene));
			if (!entity.has(Transform)) {
				entity.set(Transform, {
					position: new THREE.Vector3(0, 0.5, 0),
					rotation: new THREE.Euler(0, 0, 0),
					scale: new THREE.Vector3(1, 1, 1),
				});
			}
		},
		[entity, scene]
	);

	// Update wheel rotation based on movement
	useEffect(() => {
		if (!entity.has(Movement) || wheels.length === 0) return;
		
		const interval = setInterval(() => {
			const movement = entity.get(Movement);
			if (!movement) return;
			
			// Calculate rotation speed based on velocity
			const speed = movement.velocity.length();
			const rotationSpeed = speed * 0.1;
			
			// Rotate wheels
			wheels.forEach(wheel => {
				wheel.rotation.x += rotationSpeed;
			});
		}, 16); // ~60fps
		
		return () => clearInterval(interval);
	}, [entity, wheels]);

	return (
		<group ref={setInitial}>
			<primitive object={scene} />
			{/* Exhaust effect */}
			<mesh position={[0, -0.2, -1]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.1, 0.3, 0.8, 16]} />
				<meshStandardMaterial emissive="#ff4400" emissiveIntensity={2} transparent opacity={0.6} />
			</mesh>
		</group>
	);
}

// Query for the first player entity and render it
export function PlayerRenderer() {
	const player = useQueryFirst(IsPlayer, Transform);
	return player ? <PlayerView entity={player} /> : null;
}
