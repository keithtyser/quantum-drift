import { Canvas } from '@react-three/fiber';
import { CameraRenderer } from './components/camera-renderer';
import { PlayerRenderer } from './components/player-renderer';
import { TrackRenderer } from './components/track-renderer';
import { PostProcessing } from './components/postprocessing';
import { GameLoop } from './frameloop';
import { Startup } from './startup';
import { Color } from 'three';

export function App() {
	return (
		<>
			<Canvas style={{ background: 'white' }} shadows={true} gl={{ alpha: false }}>
				<color attach="background" args={[new Color('#87CEEB')]} />
				<Startup initialCameraPosition={[0, 5, 10]} />
				<GameLoop />

				<CameraRenderer />
				<PlayerRenderer />
				<TrackRenderer />

				<ambientLight intensity={1.02} />
				<directionalLight position={[10, 10, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
				<directionalLight position={[-10, 10, -10]} intensity={0.5} />
				
				<PostProcessing />
			</Canvas>
		</>
	);
}
