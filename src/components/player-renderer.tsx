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
		secondaryGlow: new THREE.Color('#ff00ff'),
		exhaustGlow: new THREE.Color('#ff6600'),
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

// Enhanced engine exhaust effect
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
	
	// Add a pulsing light to make exhaust more visible
	const lightRef = useRef<THREE.PointLight>(null);
	
	useFrame((state) => {
		if (meshRef.current) {
			// Animate exhaust flicker
			const baseScale = isBoosting ? 1.8 : 1.2; // Increased base size
			const randomFlicker = Math.random() * 0.3 + 0.9; // More random variation
			const flickerFreq = isBoosting ? 20 : 10; // Faster flicker
			const flicker = Math.sin(state.clock.elapsedTime * flickerFreq) * 0.15 + randomFlicker; // More pronounced flicker
			
			meshRef.current.scale.set(baseScale * flicker, baseScale * flicker, baseScale * flicker);
		}
		
		// Animate the point light
		if (lightRef.current) {
			const intensity = isBoosting ? 3.0 : 1.5;
			const pulseFactor = Math.sin(state.clock.elapsedTime * 15) * 0.5 + 1.0;
			lightRef.current.intensity = intensity * pulseFactor;
		}
	});
	
	return (
		<group position={positionVector}>
			{/* Inner bright core */}
			<mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.15, 0.4, 1.0, 16]} /> {/* Larger exhaust */}
				<meshStandardMaterial 
					emissive={color} 
					emissiveIntensity={isBoosting ? 4 : 3} // Increased intensity
					transparent 
					opacity={0.9} // Increased opacity
					toneMapped={false}
				/>
			</mesh>
			
			{/* Glowing light */}
			<pointLight 
				ref={lightRef}
				color={color} 
				intensity={isBoosting ? 3.0 : 1.5} 
				distance={isBoosting ? 8 : 5} 
				decay={2}
			/>
			
			{/* Particle effect */}
			<Sparkles 
				count={isBoosting ? 80 : 50} // Increased particles
				scale={[0.7, 0.7, 2.0]} // Larger area
				size={0.6} // Larger particles
				speed={0.4} // Faster animation
				color={color}
				opacity={0.8} // More visible
			/>
		</group>
	);
}

// Enhanced edge highlighting for better visibility
function ShipQuantumEdges({ parent }: { parent: THREE.Group }) {
	const edgesMaterial = new THREE.LineBasicMaterial({
		color: QUANTUM_PLAYER.COLORS.primaryGlow,
		linewidth: 2, // Thicker lines (note: HTML5 WebGL has limited linewidth support)
		transparent: true,
		opacity: 0.8, // Increased opacity
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
	
	// Enhanced animation for edge glow
	useFrame((state) => {
		edges.forEach(edge => {
			if (edge.material) {
				const material = edge.material as THREE.LineBasicMaterial;
				// More pronounced pulse
				material.opacity = Math.sin(state.clock.elapsedTime * 3) * 0.4 + 0.6;
				
				// Pulse the color slightly for extra effect
				const color = material.color as THREE.Color;
				const hue = (state.clock.elapsedTime * 0.05) % 1;
				color.setHSL(hue, 1, 0.5); // Cycle through colors slowly
			}
		});
	});
	
	return null;
}

// Add a quantum shield effect around the player
function QuantumShield({ radius = 1.5 }: { radius?: number }) {
	const shieldRef = useRef<THREE.Mesh>(null);
	
	// Animate the shield
	useFrame((state) => {
		if (shieldRef.current) {
			// Pulse the shield scale
			const pulseFactor = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1;
			shieldRef.current.scale.set(pulseFactor, pulseFactor, pulseFactor);
			
			// Rotate the shield slowly
			shieldRef.current.rotation.y += 0.01;
			shieldRef.current.rotation.z += 0.005;
		}
	});
	
	return (
		<mesh ref={shieldRef}>
			<sphereGeometry args={[radius, 32, 32]} />
			<meshStandardMaterial 
				color={QUANTUM_PLAYER.COLORS.secondaryGlow}
				emissive={QUANTUM_PLAYER.COLORS.secondaryGlow}
				emissiveIntensity={2}
				transparent
				opacity={0.15}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
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
					
					// Add strong emissive glow to the body
					if (child.name.includes('body')) {
						child.material.emissive = QUANTUM_PLAYER.COLORS.primaryGlow;
						child.material.emissiveIntensity = 0.5; // Increased from 0.2
					}
					
					// Glass/windshield parts
					if (child.name.includes('glass') || child.name.includes('window')) {
						child.material.metalness = QUANTUM_PLAYER.MATERIALS.glassMetalness;
						child.material.roughness = QUANTUM_PLAYER.MATERIALS.glassRoughness;
						child.material.transparent = true;
						child.material.opacity = 0.8; // Increased from 0.7
						
						// Add glow to glass
						child.material.emissive = QUANTUM_PLAYER.COLORS.secondaryGlow;
						child.material.emissiveIntensity = 1.0;
					}
				}
			}
		});
		
		// Add wheel meshes - these are separate from the imported model
		const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32);
		const wheelMaterial = new THREE.MeshStandardMaterial({ 
			color: '#444444', // Slightly lighter
			emissive: QUANTUM_PLAYER.COLORS.primaryGlow,
			emissiveIntensity: 1.0, // Increased from 0.5
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
		
		// Add the ship model to the group
		groupRef.current.add(scene);
		
		return () => {
			// Clean up
			newWheels.forEach(wheel => {
				groupRef.current?.remove(wheel);
				wheel.geometry.dispose();
				(wheel.material as THREE.Material).dispose();
			});
			
			groupRef.current?.remove(scene);
		};
	}, [scene]);

	// Set up initial state with useCallback - this is the critical function
	const setInitial = useCallback(
		(group: Group | null) => {
			if (!group) return;
			groupRef.current = group;

			console.log("Setting up player model reference");
			
			// Add the reference to the entity
			entity.add(Ref(group));
			
			// Log current transform position
			if (entity.has(Transform)) {
				const transform = entity.get(Transform)!;
				console.log("Player initial position:", transform.position.toArray());
			}
		},
		[entity]
	);
	
	// Update vehicle effects based on movement
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

	// Manually sync the position from Transform directly
	useEffect(() => {
		if (!groupRef.current || !entity.has(Transform)) return;
		
		const syncTransform = () => {
			const transform = entity.get(Transform);
			if (!transform) return;

			// Manual sync for debugging - shouldn't be needed but helps diagnose issues
			groupRef.current!.position.copy(transform.position);
			groupRef.current!.rotation.copy(transform.rotation);
			groupRef.current!.scale.copy(transform.scale);
		};
		
		const intervalId = setInterval(syncTransform, 16); // 60fps
		
		return () => clearInterval(intervalId);
	}, [entity, groupRef.current]);

	return (
		<group ref={setInitial} name="Player">
			{/* We now add the model in the useEffect to ensure proper reference handling */}
			
			{/* Quantum shield effect */}
			<QuantumShield radius={1.8} />
			
			{/* Quantum exhaust effect */}
			<QuantumExhaust 
				position={[0, -0.2, -1]} 
				isBoosting={isBoosting}
			/>
			
			{/* Quantum energy trail */}
			<group ref={trailRef}>
				<Trail
					width={1.5} // Wider trail
					length={8} // Longer trail
					color={QUANTUM_PLAYER.COLORS.trailColor}
					attenuation={(width) => width * 0.3} // Slower attenuation
					local={false}
				>
					<mesh position={[0, -0.2, -1.2]}>
						<sphereGeometry args={[0.1, 8, 8]} />
						<meshBasicMaterial transparent opacity={0} />
					</mesh>
				</Trail>
			</group>
			
			{/* Enhanced quantum glow around the vehicle */}
			<Sparkles 
				count={80} // Increased from 50
				scale={[3, 1.5, 3]} // Larger area
				size={0.4} // Larger particles
				speed={0.3} // Slightly faster
				color={QUANTUM_PLAYER.COLORS.primaryGlow}
				opacity={0.7} // More visible
			/>
			
			{/* Add a point light to make player more visible */}
			<pointLight 
				color={QUANTUM_PLAYER.COLORS.primaryGlow} 
				intensity={1.0} 
				distance={8} 
				decay={2}
			/>
		</group>
	);
}

// Query for the first player entity and render it
export function PlayerRenderer() {
	const player = useQueryFirst(IsPlayer, Transform);
	return player ? <PlayerView entity={player} /> : null;
}
