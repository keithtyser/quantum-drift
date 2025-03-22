import { Canvas } from '@react-three/fiber';
import { CameraRenderer } from './components/camera-renderer';
import { PlayerRenderer } from './components/player-renderer';
import { TrackRenderer } from './components/track-renderer';
import { PostProcessing } from './components/postprocessing';
import { GameLoop } from './frameloop';
import { Startup } from './startup';
import { Color } from 'three';
import { DebugControls } from './components/debug-controls';
import { OrbitControls, Stats } from '@react-three/drei';

export function App() {
	console.log("App component rendering");
	
	return (
		<>
			<Canvas 
				style={{ background: 'black' }} 
				shadows={true} 
				gl={{ alpha: false, antialias: true }}
				camera={{ position: [0, 10, 20], fov: 60 }}
				onCreated={({ camera }) => {
					// Make camera available for frustum culling
					window.currentCamera = camera;
				}}
			>
				{/* Enable OrbitControls for debugging */}
				<OrbitControls 
					enablePan={true}
					enableZoom={true}
					enableRotate={true}
					target={[0, 0, -10]}
				/>
				
				<color attach="background" args={[new Color('#87CEEB')]} />
				
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

				<ambientLight intensity={1.02} />
				<directionalLight position={[10, 10, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
				<directionalLight position={[-10, 10, -10]} intensity={0.5} />
				
				<PostProcessing />
				
				{/* Show stats */}
				<Stats />
			</Canvas>
			
			{/* Render debug controls outside of Canvas so they're always visible */}
			<DebugControls />
		</>
	);
}
