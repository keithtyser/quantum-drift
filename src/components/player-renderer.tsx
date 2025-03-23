import { useGLTF, Trail, Sparkles } from '@react-three/drei';
import { Entity } from 'koota';
import { useQueryFirst } from 'koota/react';
import { useRef, MutableRefObject, useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Group } from 'three';
import src from '../assets/ships/fighter.glb?url';
import { IsPlayer, Transform, Ref, Movement } from '../traits';
import { useFrame } from '@react-three/fiber';
import { createGlowTexture } from '../utils/texture-generator';

// Quantum player visuals configuration
const QUANTUM_PLAYER = {
	COLORS: {
		primaryGlow: new THREE.Color('#00ffff'),
		exhaustGlow: new THREE.Color('#ff4400'),
		boostGlow: new THREE.Color('#ffaa00'),
		trailColor: new THREE.Color('#00ffff'),
		sparkleColor: new THREE.Color('#ffffff')
	},
	MATERIALS: {
		bodyMetalness: 0.8,
		bodyRoughness: 0.2,
		glassMetalness: 0.9,
		glassRoughness: 0.1
	}
};

// Engine exhaust effect with particle system
function QuantumExhaust({ 
	position, 
	color = QUANTUM_PLAYER.COLORS.exhaustGlow,
	isBoosting = false
}: {
	position: THREE.Vector3 | [number, number, number],
	color?: THREE.Color,
	isBoosting?: boolean
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const positionVector = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position);
	
	useFrame((state) => {
		if (meshRef.current) {
			// Animate exhaust flicker
			const baseScale = isBoosting ? 1.5 : 1.0;
			const randomFlicker = Math.random() * 0.2 + 0.9;
			const flickerFreq = isBoosting ? 15 : 8;
			const flicker = Math.sin(state.clock.elapsedTime * flickerFreq) * 0.1 + randomFlicker;
			
			meshRef.current.scale.set(baseScale * flicker, baseScale * flicker, baseScale * flicker);
		}
	});
	
	return (
		<group position={positionVector}>
			{/* Inner bright core */}
			<mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.1, 0.3, 0.8, 16]} />
				<meshStandardMaterial 
					emissive={color} 
					emissiveIntensity={isBoosting ? 3 : 2} 
					transparent 
					opacity={0.8}
					toneMapped={false}
				/>
			</mesh>
			
			{/* Particle effect */}
			<Sparkles 
				count={isBoosting ? 50 : 30}
				scale={[0.5, 0.5, 1.5]}
				size={0.5}
				speed={0.3}
				color={color}
				opacity={0.7}
			/>
		</group>
	);
}

// Quantum glow effect for the ship's edges
function ShipQuantumEdges({ parent }: { parent: THREE.Group }) {
	const edgesMaterial = new THREE.LineBasicMaterial({
		color: QUANTUM_PLAYER.COLORS.primaryGlow,
		linewidth: 1,
		transparent: true,
		opacity: 0.7
	});
	
	const [edges, setEdges] = useState<THREE.LineSegments[]>([]);
	
	// Create edge effect for the ship once the parent group is available
	useEffect(() => {
		if (!parent) return;
		
		const newEdges: THREE.LineSegments[] = [];
		
		// Find all meshes in the ship model
		parent.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				// Extract edges from each mesh
				const geometry = child.geometry;
				const edgesGeometry = new THREE.EdgesGeometry(geometry);
				const line = new THREE.LineSegments(edgesGeometry, edgesMaterial);
				
				// Match position and rotation of original mesh
				line.position.copy(child.position);
				line.rotation.copy(child.rotation);
				line.scale.copy(child.scale);
				
				// Add edge lines to the parent group
				parent.add(line);
				newEdges.push(line);
			}
		});
		
		setEdges(newEdges);
		
		// Cleanup
		return () => {
			newEdges.forEach(edge => {
				parent.remove(edge);
				edge.geometry.dispose();
			});
		};
	}, [parent]);
	
	// Animate edge glow
	useFrame((state) => {
		edges.forEach(edge => {
			if (edge.material) {
				const material = edge.material as THREE.LineBasicMaterial;
				material.opacity = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.4;
			}
		});
	});
	
	return null;
}

export function PlayerView({ entity }: { entity: Entity }) {
	const { scene } = useGLTF(src);
	const groupRef = useRef<Group | null>(null) as MutableRefObject<Group | null>;
	const [wheels, setWheels] = useState<THREE.Mesh[]>([]);
	const trailRef = useRef<THREE.Group>(null);
	const [isBoosting, setIsBoosting] = useState(false);
	
	// Clone the model and create the vehicle
	useEffect(() => {
		if (!groupRef.current) return;
		
		// Enhance ship materials with quantum effects
		scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				// Main body parts
				if (child.material instanceof THREE.MeshStandardMaterial) {
					child.material.metalness = QUANTUM_PLAYER.MATERIALS.bodyMetalness;
					child.material.roughness = QUANTUM_PLAYER.MATERIALS.bodyRoughness;
					
					// Add slight emissive glow to the body
					if (child.name.includes('body')) {
						child.material.emissive = QUANTUM_PLAYER.COLORS.primaryGlow;
						child.material.emissiveIntensity = 0.2;
					}
					
					// Glass/windshield parts
					if (child.name.includes('glass') || child.name.includes('window')) {
						child.material.metalness = QUANTUM_PLAYER.MATERIALS.glassMetalness;
						child.material.roughness = QUANTUM_PLAYER.MATERIALS.glassRoughness;
						child.material.transparent = true;
						child.material.opacity = 0.7;
					}
				}
			}
		});
		
		// Add wheel meshes - these are separate from the imported model
		const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32);
		const wheelMaterial = new THREE.MeshStandardMaterial({ 
			color: '#333333',
			emissive: QUANTUM_PLAYER.COLORS.primaryGlow,
			emissiveIntensity: 0.5,
			metalness: 0.9,
			roughness: 0.2
		});
		
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
			
			// Update boost state
			setIsBoosting(speed > 20);
		}, 16); // ~60fps
		
		return () => clearInterval(interval);
	}, [entity, wheels]);

	return (
		<group ref={setInitial} name="Player">
			<primitive object={scene} />
			
			{/* Add quantum-style edge highlighting */}
			{groupRef.current && <ShipQuantumEdges parent={groupRef.current} />}
			
			{/* Quantum exhaust effect */}
			<QuantumExhaust 
				position={[0, -0.2, -1]} 
				isBoosting={isBoosting}
			/>
			
			{/* Quantum energy trail */}
			<group ref={trailRef}>
				<Trail
					width={1}
					length={5}
					color={QUANTUM_PLAYER.COLORS.trailColor}
					attenuation={(width) => width * 0.5}
					local={false}
				>
					<mesh position={[0, -0.2, -1.2]}>
						<sphereGeometry args={[0.1, 8, 8]} />
						<meshBasicMaterial transparent opacity={0} />
					</mesh>
				</Trail>
			</group>
			
			{/* Quantum glow around the vehicle */}
			<Sparkles 
				count={50}
				scale={[2, 1, 2]}
				size={0.3}
				speed={0.2}
				color={QUANTUM_PLAYER.COLORS.primaryGlow}
				opacity={0.5}
			/>
		</group>
	);
}

// Query for the first player entity and render it
export function PlayerRenderer() {
	const player = useQueryFirst(IsPlayer, Transform);
	return player ? <PlayerView entity={player} /> : null;
}
