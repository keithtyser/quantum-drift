import { Canvas } from '@react-three/fiber';
import { CameraRenderer } from './components/camera-renderer';
import { PlayerRenderer } from './components/player-renderer';
import { TrackRenderer } from './components/track-renderer';
import { PostProcessing } from './components/postprocessing';
import { GameLoop } from './frameloop';
import { Startup } from './startup';
import { Color } from 'three';
import { DebugControls } from './components/debug-controls';
import { OrbitControls, Stats, SoftShadows, Environment, Sky } from '@react-three/drei';

export function App() {
	console.log("App component rendering");
	
	return (
		<>
			<Canvas 
				style={{ background: 'black' }} 
				shadows="soft"
				gl={{ 
					alpha: false, 
					antialias: true,
					logarithmicDepthBuffer: true
				}}
				camera={{ position: [0, 10, 20], fov: 60 }}
			>
				{/* Enhanced shadows for better visual quality */}
				<SoftShadows 
					size={25}
					focus={0.5}
					samples={20}
				/>
				
				{/* Environment lighting */}
				<Environment preset="night" />
				
				{/* Quantum sky */}
				<Sky 
					distance={450000} 
					sunPosition={[0, 1, 0]} 
					inclination={0.1}
					azimuth={0.25}
					rayleigh={1}
					turbidity={10}
				/>
				
				{/* Enable OrbitControls for debugging */}
				<OrbitControls 
					enablePan={true}
					enableZoom={true}
					enableRotate={true}
					target={[0, 0, -10]}
				/>
				
				<color attach="background" args={[new Color('#000025')]} />
				
				{/* World coordinate axes helper */}
				<axesHelper args={[10]} />
				
				{/* Debug sphere to confirm rendering works */}
				<mesh position={[0, 0, 0]}>
					<sphereGeometry args={[1, 16, 16]} />
					<meshStandardMaterial color="hotpink" />
				</mesh>
				
				{/* Debug ground plane */}
				<mesh position={[0, -1, 0]} rotation={[-Math.PI/2, 0, 0]}>
					<planeGeometry args={[100, 100]} />
					<meshStandardMaterial color="#444444" />
				</mesh>
				
				<Startup initialCameraPosition={[0, 5, 10]} />
				<GameLoop />

				<CameraRenderer />
				<PlayerRenderer />
				<TrackRenderer />

				{/* Primary ambient light */}
				<ambientLight intensity={0.2} color="#6060ff" />
				
				{/* Main directional light (sun) */}
				<directionalLight 
					position={[10, 20, 10]} 
					intensity={1.5} 
					castShadow 
					shadow-mapSize={[2048, 2048]}
					shadow-camera-left={-20}
					shadow-camera-right={20}
					shadow-camera-top={20}
					shadow-camera-bottom={-20}
					shadow-camera-far={50}
					color="#ffffdd"
				/>
				
				{/* Secondary directional light for fill */}
				<directionalLight 
					position={[-10, 10, -10]} 
					intensity={0.5} 
					color="#8080ff"
				/>
				
				{/* Dynamic point lights for atmosphere */}
				<pointLight 
					position={[0, 15, -30]} 
					intensity={1.5} 
					color="#00ffff" 
					distance={50} 
					decay={2}
				/>
				
				<pointLight 
					position={[-20, 5, -20]} 
					intensity={1} 
					color="#ff00ff" 
					distance={40} 
					decay={2}
				/>
				
				<PostProcessing />
				
				{/* Show stats */}
				<Stats />
			</Canvas>
			
			{/* Render debug controls outside of Canvas so they're always visible */}
			<DebugControls />
		</>
	);
}
