import { Canvas } from '@react-three/fiber';
import { CameraRenderer } from './components/camera-renderer';
import { PlayerRenderer } from './components/player-renderer';
import { TrackRenderer } from './components/track-renderer';
import { PostProcessing } from './components/postprocessing';
import { GameLoop } from './frameloop';
import { Startup } from './startup';
import { Color } from 'three';
import { DebugControls } from './components/debug-controls';
import { OrbitControls, Stats, SoftShadows, Environment, Sky, Grid } from '@react-three/drei';
import { useState, useEffect } from 'react';

// Controls state available across the app
export const controlsState = {
	orbitControlsEnabled: false
};

export function App() {
	console.log("App component rendering");
	const [orbitEnabled, setOrbitEnabled] = useState(controlsState.orbitControlsEnabled);
	const [showHelp, setShowHelp] = useState(true);
	
	// Set up keyboard shortcut to toggle orbit controls - press 'O' to toggle
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'o') {
				controlsState.orbitControlsEnabled = !controlsState.orbitControlsEnabled;
				setOrbitEnabled(controlsState.orbitControlsEnabled);
				console.log(`Orbit controls ${controlsState.orbitControlsEnabled ? 'enabled' : 'disabled'}`);
			}
			
			// Any key press will dismiss the help overlay
			if (showHelp) {
				setShowHelp(false);
			}
		};
		
		window.addEventListener('keydown', handleKeyDown);
		
		// Auto-hide help message after 10 seconds
		const helpTimer = setTimeout(() => {
			setShowHelp(false);
		}, 10000);
		
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			clearTimeout(helpTimer);
		};
	}, [showHelp]);
	
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
				camera={{ position: [0, 8, 15], fov: 70 }}
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
				
				{/* OrbitControls for debugging - only enabled in debug mode */}
				{orbitEnabled && (
					<OrbitControls 
						enablePan={true}
						enableZoom={true}
						enableRotate={true}
						target={[0, 0, -10]}
					/>
				)}
				
				<color attach="background" args={[new Color('#000025')]} />
				
				{/* World coordinate axes helper */}
				<axesHelper args={[10]} />
				
				{/* Quantum grid for better orientation */}
				<Grid 
					position={[0, -0.01, 0]}
					args={[100, 100]} 
					cellSize={5}
					cellThickness={0.5}
					cellColor="#00ffff"
					sectionSize={20}
					sectionThickness={1}
					sectionColor="#ff00ff"
					fadeDistance={100}
					infiniteGrid
				/>
				
				{/* Debug sphere to confirm rendering works */}
				<mesh position={[0, 2, 0]} castShadow receiveShadow>
					<sphereGeometry args={[1, 32, 32]} />
					<meshStandardMaterial 
						color="#ff00ff" 
						emissive="#ff00ff"
						emissiveIntensity={0.5}
						roughness={0.2}
						metalness={0.8}
					/>
					<pointLight 
						position={[0, 0, 0]} 
						color="#ff00ff" 
						intensity={1} 
						distance={5}
					/>
				</mesh>
				
				<Startup initialCameraPosition={[0, 5, 10]} />
				<GameLoop />

				<CameraRenderer />
				<PlayerRenderer />
				<TrackRenderer />

				{/* Primary ambient light */}
				<ambientLight intensity={0.3} color="#6060ff" />
				
				{/* Main directional light (sun) */}
				<directionalLight 
					position={[10, 20, 10]} 
					intensity={2.0} 
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
					intensity={0.8} 
					color="#8080ff"
				/>
				
				{/* Dynamic point lights for atmosphere */}
				<pointLight 
					position={[0, 15, -30]} 
					intensity={2.0} 
					color="#00ffff" 
					distance={70} 
					decay={2}
				/>
				
				<pointLight 
					position={[-20, 5, -20]} 
					intensity={1.5} 
					color="#ff00ff" 
					distance={50} 
					decay={2}
				/>
				
				{/* Additional quantum atmosphere lights */}
				<pointLight 
					position={[20, 5, -40]} 
					intensity={1.5} 
					color="#00ffaa" 
					distance={60} 
					decay={2}
				/>
				
				<pointLight 
					position={[0, 3, -5]} 
					intensity={1.0} 
					color="#ffff00" 
					distance={30} 
					decay={2}
				/>
				
				<PostProcessing />
				
				{/* Show stats */}
				<Stats />
			</Canvas>
			
			{/* Render debug controls outside of Canvas so they're always visible */}
			<DebugControls />

			{/* OrbitControls status indicator */}
			{orbitEnabled && (
				<div style={{
					position: 'absolute',
					top: '10px',
					right: '10px',
					background: 'rgba(0,0,0,0.5)',
					color: '#fff',
					padding: '5px 10px',
					borderRadius: '4px',
					fontSize: '12px'
				}}>
					Orbit Controls: ON (Press 'O' to toggle)
				</div>
			)}
			
			{/* Help overlay */}
			{showHelp && (
				<div style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					background: 'rgba(0,0,0,0.8)',
					color: '#00ffff',
					padding: '20px 30px',
					borderRadius: '8px',
					fontSize: '16px',
					textAlign: 'center',
					boxShadow: '0 0 20px #ff00ff',
					zIndex: 100,
					maxWidth: '500px'
				}}>
					<h2 style={{ color: '#ff00ff', marginBottom: '15px' }}>Quantum Drift Controls</h2>
					<p style={{ marginBottom: '15px' }}>Use the following keys to navigate:</p>
					<div style={{ textAlign: 'left', marginBottom: '20px' }}>
						<div style={{ marginBottom: '8px' }}><span style={{ color: '#ffff00' }}>W</span> - Accelerate forward</div>
						<div style={{ marginBottom: '8px' }}><span style={{ color: '#ffff00' }}>S</span> - Brake/Reverse</div>
						<div style={{ marginBottom: '8px' }}><span style={{ color: '#ffff00' }}>A/D</span> - Steer left/right</div>
						<div style={{ marginBottom: '8px' }}><span style={{ color: '#ffff00' }}>SPACE</span> - Boost</div>
						<div style={{ marginBottom: '8px' }}><span style={{ color: '#ffff00' }}>Q/R</span> - Roll left/right</div>
					</div>
					<p style={{ fontSize: '14px', color: '#aaaaaa' }}>Press any key to dismiss this message</p>
				</div>
			)}
		</>
	);
}
