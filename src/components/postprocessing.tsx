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

// Enhanced quantum theme configuration
const QUANTUM_CONFIG = {
  bloomIntensity: 2.0,
  bloomLevels: 8,
  chromaticOffset: 0.003,
  noiseIntensity: 0.15,
  vignetteIntensity: 0.4,
  godRayIntensity: 1.0,
  dofFocusDistance: 0.015,
  dofFocalLength: 0.015,
  dofBokehScale: 2.5
};

export function PostProcessing() {
  const { scene, camera } = useThree();
  const sunRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;
  const speedRef = useRef<number>(0);
  
  // Create a sun light source for god rays
  useEffect(() => {
    if (!sunRef.current) {
      const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color('#ff00ff'),
        transparent: true,
        opacity: 0.9 
      });
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.position.set(0, 50, -120);
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
    
    // Make the sun pulse for more dynamic lighting
    if (sunRef.current) {
      const pulseFactor = (Math.sin(state.clock.elapsedTime * 0.3) * 0.2 + 1.0);
      sunRef.current.scale.set(pulseFactor, pulseFactor, pulseFactor);
      
      // Slowly rotate the sun position for moving god rays
      const angle = state.clock.elapsedTime * 0.05;
      const radius = 70;
      sunRef.current.position.x = Math.sin(angle) * radius;
      sunRef.current.position.z = -120 + Math.cos(angle) * radius * 0.5;
    }
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
          samples={100}
          density={0.97}
          decay={0.94}
          weight={QUANTUM_CONFIG.godRayIntensity}
          exposure={0.65}
          clampMax={1.0}
          kernelSize={KernelSize.LARGE}
          blur={true}
        />
      )}
      
      {/* Bloom effect for glowing quantum elements */}
      <Bloom 
        intensity={QUANTUM_CONFIG.bloomIntensity}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.95}
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
        offset={0.35}
        darkness={QUANTUM_CONFIG.vignetteIntensity}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
