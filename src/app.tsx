import { Canvas } from '@react-three/fiber';
import { CameraRenderer } from './components/camera-renderer';
import { PlayerRenderer } from './components/player-renderer';
import { TrackRenderer } from './components/track-renderer';
import { PostProcessing } from './components/postprocessing';
import { GameLoop } from './frameloop';
import { Startup } from './startup';
import { Color } from 'three';
import { DebugControls, debugState } from './components/debug-controls';
import { OrbitControls, Stats } from '@react-three/drei';
import { QuantumEffects } from './components/quantum-effects';

export function App() {
	console.log("App component rendering");
	
	return (
		<>
			<Canvas 
				style={{ background: '#000033' }}
				shadows={true} 
				gl={{ alpha: false, antialias: true }}
				camera={{ position: [0, 10, 20], fov: 60 }}
			>
				{/* Enable OrbitControls for debugging */}
				<OrbitControls 
					enablePan={true}
					enableZoom={true}
					enableRotate={true}
					target={[0, 0, -10]}
				/>
				
				{/* Sky blue color for the background */}
				<color attach="background" args={[new Color('#1a1a33')]} />
				
				{/* World coordinate axes helper */}
				<axesHelper args={[10]} />
				
				{/* Debug sphere to confirm rendering works */}
				<mesh position={[0, 0, 0]} castShadow receiveShadow>
					<sphereGeometry args={[1, 16, 16]} />
					<meshStandardMaterial color="hotpink" emissive="#400040" emissiveIntensity={0.5} />
				</mesh>
				
				{/* Debug ground plane with a grid pattern */}
				<mesh position={[0, -1, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
					<planeGeometry args={[100, 100]} />
					<meshStandardMaterial color="#444444" />
				</mesh>
				
				<Startup initialCameraPosition={[0, 5, 10]} />
				<GameLoop />

				<CameraRenderer />
				<PlayerRenderer />
				<TrackRenderer />
                
				{/* Add quantum visual effects (conditionally rendered via component) */}
				<QuantumEffects />

				{/* Increased lighting for better visibility */}
				<ambientLight intensity={1.5} /> 
				<directionalLight 
					position={[10, 10, 10]} 
					intensity={2.0} 
					castShadow 
					shadow-mapSize={[2048, 2048]} 
				/>
				<directionalLight position={[-10, 10, -10]} intensity={1.0} />
				<hemisphereLight args={['#8888ff', '#333333', 0.8]} />
				
				<PostProcessing />
				
				{/* Show stats if enabled */}
				{debugState.showFPS && <Stats />}
			</Canvas>
			
			{/* Render debug controls outside of Canvas so they're always visible */}
			<DebugControls />
		</>
	);
}
