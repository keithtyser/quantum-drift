import * as React from 'react';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { KernelSize, GlitchMode } from 'postprocessing';
import { Vector3, MeshStandardMaterial, BufferGeometry, Float32BufferAttribute, Points, Mesh, Vector2 } from 'three';
import { useQuery, useWorld } from 'koota/react';
import { IsPlayer, Movement, Transform } from '../traits';
import { debugState } from './debug-controls';

// Fallback position for when no player exists
const FALLBACK_POSITION = new Vector3(0, 1, 0);

interface ParticleProps {
  count: number;
  color: string;
  size: number;
  maxDistance: number;
  speedFactor: number;
}

// Component for quantum particles that swirl around the player
const QuantumParticles: React.FC<ParticleProps> = ({ count, color, size, maxDistance, speedFactor }) => {
  const particles = useRef<Points>(null);
  const geometry = useRef<BufferGeometry>(null);
  
  // Generate initial particle positions
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * maxDistance;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [count, maxDistance]);
  
  // Initialize particle attributes
  useEffect(() => {
    if (geometry.current) {
      geometry.current.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }
  }, [positions]);
  
  // Animate particles
  useFrame((state, delta) => {
    if (particles.current) {
      particles.current.rotation.y += delta * 0.2 * speedFactor;
      particles.current.rotation.z += delta * 0.1 * speedFactor;
    }
  });
  
  return (
    <points ref={particles}>
      <bufferGeometry ref={geometry} />
      <pointsMaterial color={color} size={size} transparent opacity={0.8} />
    </points>
  );
};

interface FieldProps {
  intensity: number;
  color: string;
  pulseSpeed: number;
}

// Component for quantum energy field that surrounds the player
const QuantumField: React.FC<FieldProps> = ({ intensity, color, pulseSpeed }) => {
  const sphere = useRef<Mesh>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const initialScale = useMemo(() => new Vector3(1, 1, 1), []);
  
  useFrame((state, delta) => {
    if (sphere.current) {
      // Pulsating effect
      const time = state.clock.getElapsedTime();
      const scale = 1 + Math.sin(time * pulseSpeed) * 0.1;
      sphere.current.scale.set(scale, scale, scale);
      
      // Rotate slightly
      sphere.current.rotation.y += delta * 0.1;
      
      // Update emission intensity
      if (material.current) {
        material.current.emissiveIntensity = intensity * (0.8 + Math.sin(time * pulseSpeed * 2) * 0.2);
      }
    }
  });
  
  return (
    <mesh ref={sphere} scale={initialScale}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial
        ref={material}
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

// Debug version of quantum effects that doesn't depend on player
const DebugQuantumEffects: React.FC = () => {
  console.log("Rendering debug quantum effects - no player found");
  
  return (
    <group position={FALLBACK_POSITION}>
      <QuantumParticles 
        count={100} 
        color="#00ffff" 
        size={0.1} 
        maxDistance={3}
        speedFactor={1}
      />
      <QuantumField 
        intensity={0.5} 
        color="#0088ff" 
        pulseSpeed={1}
      />
    </group>
  );
};

// Component that connects quantum effects to player data
const QuantumEffectsForPlayer: React.FC = () => {
  const world = useWorld();
  
  try {
    const playerEntities = useQuery([IsPlayer]);
    
    // No player, use debug fallback
    if (!playerEntities || playerEntities.length === 0) {
      return <DebugQuantumEffects />;
    }
    
    const playerEntity = playerEntities[0];
    const transform = world.get(playerEntity, Transform);
    const movement = world.get(playerEntity, Movement);
    
    if (!transform) {
      console.warn("Player found but has no Transform trait");
      return <DebugQuantumEffects />;
    }
    
    // Calculate intensity based on player speed
    const speed = movement?.velocity ? new Vector3().copy(movement.velocity).length() : 0;
    const intensity = Math.min(1, speed / 20);
    
    return (
      <group position={[transform.position.x || 0, transform.position.y || 0, transform.position.z || 0]}>
        <QuantumParticles 
          count={100} 
          color="#00ffff" 
          size={0.1} 
          maxDistance={3}
          speedFactor={1 + intensity * 2}
        />
        <QuantumField 
          intensity={0.5 + intensity * 0.5} 
          color="#0088ff" 
          pulseSpeed={1 + intensity}
        />
      </group>
    );
  } catch (error) {
    console.error("Error in quantum effects:", error);
    return <DebugQuantumEffects />;
  }
};

// Main export - includes all quantum effects
export const QuantumEffects: React.FC = () => {
  // Check if quantum effects are enabled in debug settings
  if (!debugState.showQuantumEffects) {
    return null;
  }

  // Add debug output
  console.log("Rendering quantum effects component");

  return (
    <>
      <QuantumEffectsForPlayer />
      
      <EffectComposer enabled={debugState.showQuantumEffects}>
        <Bloom 
          intensity={0.5} // Reduced from 1.0 to be less intense initially
          luminanceThreshold={0.2} 
          luminanceSmoothing={0.9} 
          kernelSize={KernelSize.LARGE}
        />
        <Noise opacity={0.02} />
        <ChromaticAberration 
          offset={new Vector2(0.0005, 0.0005)}
          radialModulation
          modulationOffset={0.3}
        />
        <Glitch
          delay={[1.5, 3.5]}
          duration={[0.2, 0.4]}
          strength={new Vector2(0.1, 0.2)} // Reduced from 0.2,0.4 to be less intense
          mode={GlitchMode.CONSTANT_MILD}
          active
          ratio={0.85}
        />
      </EffectComposer>
    </>
  );
}; 