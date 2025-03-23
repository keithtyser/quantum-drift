import { useRef, useEffect, MutableRefObject } from 'react';
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration, 
  Noise, 
  Vignette, 
  GodRays,
  DepthOfField,
  SMAA
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Quantum theme configuration
const QUANTUM_CONFIG = {
  bloomIntensity: 1.5,
  bloomLevels: 6,
  chromaticOffset: 0.004,
  noiseIntensity: 0.2,
  vignetteIntensity: 0.5,
  godRayIntensity: 0.8,
  dofFocusDistance: 0.0,
  dofFocalLength: 0.02,
  dofBokehScale: 2.0
};

export function PostProcessing() {
  const { scene, camera } = useThree();
  const sunRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;
  const speedRef = useRef<number>(0);
  
  // Create a sun light source for god rays
  useEffect(() => {
    if (!sunRef.current) {
      const sunGeometry = new THREE.SphereGeometry(10, 16, 16);
      const sunMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff00ff') });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.position.set(0, 50, -100);
      scene.add(sun);
      sunRef.current = sun;
    }
    
    return () => {
      if (sunRef.current) {
        scene.remove(sunRef.current);
      }
    };
  }, [scene]);
  
  // Animate chromatic aberration based on speed
  useFrame((state, delta) => {
    // Simulate speed changes (in a real implementation, this would come from game state)
    speedRef.current = Math.sin(state.clock.elapsedTime * 0.5) * 0.5 + 0.5;
  });
  
  return (
    <EffectComposer multisampling={8}>
      {/* Anti-aliasing for smoother edges */}
      <SMAA />
      
      {/* Depth of field for focusing on important elements */}
      <DepthOfField
        focusDistance={QUANTUM_CONFIG.dofFocusDistance}
        focalLength={QUANTUM_CONFIG.dofFocalLength}
        bokehScale={QUANTUM_CONFIG.dofBokehScale}
        height={480}
      />
      
      {/* God rays for dramatic lighting through quantum fields */}
      {sunRef.current && (
        <GodRays
          sun={sunRef.current}
          blendFunction={BlendFunction.SCREEN}
          samples={60}
          density={0.96}
          decay={0.92}
          weight={QUANTUM_CONFIG.godRayIntensity}
          exposure={0.6}
          clampMax={1.0}
          kernelSize={KernelSize.LARGE}
          blur={true}
        />
      )}
      
      {/* Bloom effect for glowing quantum elements */}
      <Bloom 
        intensity={QUANTUM_CONFIG.bloomIntensity}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        kernelSize={KernelSize.HUGE}
      />
      
      {/* Chromatic aberration for quantum distortion */}
      <ChromaticAberration
        offset={new THREE.Vector2(
          QUANTUM_CONFIG.chromaticOffset * (1 + speedRef.current),
          QUANTUM_CONFIG.chromaticOffset * (1 + speedRef.current)
        )}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={true}
        modulationOffset={0.5}
      />
      
      {/* Quantum noise field */}
      <Noise
        premultiply={true}
        blendFunction={BlendFunction.SOFT_LIGHT}
        opacity={QUANTUM_CONFIG.noiseIntensity}
      />
      
      {/* Vignette to focus attention on the center of action */}
      <Vignette
        offset={0.5}
        darkness={QUANTUM_CONFIG.vignetteIntensity}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
