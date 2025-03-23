import * as React from 'react';
import { useEffect, useMemo, useRef, useState, MutableRefObject, useCallback } from 'react';
import * as THREE from 'three';
import { Group, Color } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, Sphere, Line, Grid, Box, Text, useHelper } from '@react-three/drei';
import { createGlowTexture } from '../utils/texture-generator';
import { debugState } from './debug-controls';
import { useQuery, useQueryFirst } from 'koota/react';
import { Entity } from 'koota';
import { IsTrack, Transform, TrackSegment } from '../traits';

// Quantum visual configuration
const QUANTUM_VISUALS = {
  COLORS: {
    primaryGlow: new Color('#00ffff').convertSRGBToLinear(),
    secondaryGlow: new Color('#ff00ff').convertSRGBToLinear(), 
    accentGlow: new Color('#ffff00').convertSRGBToLinear(),
    trackBase: new Color('#080824').convertSRGBToLinear(),
    barrierLeft: new Color('#ff2288').convertSRGBToLinear(),
    barrierRight: new Color('#2288ff').convertSRGBToLinear(),
  },
  MATERIALS: {
    emissiveIntensity: 2.5,
    trackMetalness: 0.8,
    trackRoughness: 0.2,
    barrierMetalness: 0.9,
    barrierRoughness: 0.1,
  }
};

// Energy field particle system
function QuantumEnergyField({ 
  position, 
  color = QUANTUM_VISUALS.COLORS.primaryGlow, 
  count = 50, 
  size = 0.2 
}: { 
  position: THREE.Vector3 | [number, number, number], 
  color?: THREE.Color, 
  count?: number, 
  size?: number 
}) {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Create particle geometry
  const particles = useMemo(() => {
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(count * 3);
    const particleSizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Random positions within a box
      const x = (Math.random() - 0.5) * 15;
      const y = Math.random() * 5 + 1;
      const z = (Math.random() - 0.5) * 15;
      
      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;
      
      // Varied particle sizes
      particleSizes[i] = Math.random() * size + size * 0.5;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    return particleGeo;
  }, [count, size]);
  
  // Animated particles
  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array;
      
      for (let i = 0; i < count; i++) {
        // Animate particle y-position in a wave pattern
        positions[i * 3 + 1] = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.5 + 2;
        
        // Pulse the particle sizes
        sizes[i] = (Math.sin(state.clock.elapsedTime * 2 + i) * 0.2 + 1) * size;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.size.needsUpdate = true;
    }
  });
  
  return (
    <group position={position}>
      <points ref={pointsRef} geometry={particles}>
        <pointsMaterial
          size={size}
          color={color}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          vertexColors={false}
        />
      </points>
    </group>
  );
}

// Quantum glow effect using sprite
function QuantumGlow({ 
  position, 
  color = QUANTUM_VISUALS.COLORS.primaryGlow, 
  size = 5 
}: { 
  position: THREE.Vector3 | [number, number, number], 
  color?: THREE.Color, 
  size?: number 
}) {
  const glowRef = useRef<THREE.Sprite>(null);
  const glowTexture = useMemo(() => createGlowTexture(), []);
  
  // Animate glow
  useFrame((state) => {
    if (glowRef.current) {
      const scale = Math.sin(state.clock.elapsedTime) * 0.1 + 1;
      glowRef.current.scale.set(size * scale, size * scale, 1);
    }
  });
  
  return (
    <sprite ref={glowRef} position={position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position)}>
      <spriteMaterial
        attach="material"
        map={glowTexture}
        color={color}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}

// Energy beam between two points
function EnergyBeam({ 
  start, 
  end, 
  color = QUANTUM_VISUALS.COLORS.primaryGlow, 
  thickness = 0.1 
}: { 
  start: THREE.Vector3, 
  end: THREE.Vector3, 
  color?: THREE.Color, 
  thickness?: number 
}) {
  const [points, setPoints] = useState<THREE.Vector3[]>([start, end]);
  
  // Animate beam
  useFrame((state) => {
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    midPoint.y += Math.sin(state.clock.elapsedTime * 3) * 0.5;
    
    const newPoints = [
      start,
      new THREE.Vector3().lerpVectors(start, midPoint, 0.25),
      midPoint,
      new THREE.Vector3().lerpVectors(midPoint, end, 0.75),
      end
    ];
    
    setPoints(newPoints);
  });
  
  return (
    <Line 
      points={points}
      color={color}
      lineWidth={thickness}
      transparent
      opacity={0.8}
      blending={THREE.AdditiveBlending}
    />
  );
}

// Helper function to create edge points for the track with improved visuals
function createTrackEdges(segment: any): [THREE.Vector3[], THREE.Vector3[]] {
  const controlPoints = segment.controlPoints;
  const width = segment.width;
  
  if (!controlPoints || controlPoints.length === 0) {
    // Return empty arrays if no control points
    return [[], []];
  }
  
  const leftEdge: THREE.Vector3[] = [];
  const rightEdge: THREE.Vector3[] = [];
  
  // For each control point, create left and right edge points
  for (let i = 0; i < controlPoints.length; i++) {
    const point = controlPoints[i];
    
    // Compute direction at this point
    const direction = new THREE.Vector3(0, 0, -1);
    if (i < controlPoints.length - 1) {
      direction.subVectors(controlPoints[i + 1], point).normalize();
    } else if (i > 0) {
      direction.subVectors(point, controlPoints[i - 1]).normalize();
    }
    
    // Create perpendicular vector
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    
    // Create left and right edge points
    const halfWidth = width / 2;
    const leftPoint = point.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
    const rightPoint = point.clone().add(perpendicular.clone().multiplyScalar(-halfWidth));
    
    // Add some vertical variation for quantum-themed track
    const heightVariation = Math.cos(i * 0.5) * 0.2;
    leftPoint.y += heightVariation;
    rightPoint.y += heightVariation;
    
    leftEdge.push(leftPoint);
    rightEdge.push(rightPoint);
  }
  
  return [leftEdge, rightEdge];
}

// Component to render a quantum barrier along track edge
function QuantumBarrier({ points, side }: { points: THREE.Vector3[], side: 'left' | 'right' }) {
  if (points.length < 2) return null;
  
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const barrierColor = side === 'left' 
    ? QUANTUM_VISUALS.COLORS.barrierLeft 
    : QUANTUM_VISUALS.COLORS.barrierRight;
  
  // Generate barrier posts
  const barrierPosts = useMemo(() => {
    const posts = [];
    // Place posts every few points along the edge
    for (let i = 0; i < points.length; i += 2) {
      const point = points[i].clone();
      // Adjust height for the post
      point.y += 0.7; // Half height of the post
      posts.push(point);
    }
    return posts;
  }, [points]);
  
  // Animate energy flow along barriers
  useFrame((state) => {
    if (matRef.current) {
      const emissiveIntensity = (Math.sin(state.clock.elapsedTime * 3) * 0.3 + 0.7) * QUANTUM_VISUALS.MATERIALS.emissiveIntensity;
      matRef.current.emissiveIntensity = emissiveIntensity;
    }
    
    if (groupRef.current) {
      // Subtle hovering effect
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Barrier energy line */}
      <Line
        points={points}
        color={barrierColor}
        lineWidth={6}
        toneMapped={false}
      />
      
      {/* Barrier posts with glowing material */}
      {barrierPosts.map((position, index) => (
        <group key={`${side}-post-${index}`} position={position}>
          {/* Solid post */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.3, 1.5, 0.3]} />
            <meshStandardMaterial 
              ref={matRef}
              color={barrierColor}
              metalness={QUANTUM_VISUALS.MATERIALS.barrierMetalness}
              roughness={QUANTUM_VISUALS.MATERIALS.barrierRoughness}
              emissive={barrierColor}
              emissiveIntensity={QUANTUM_VISUALS.MATERIALS.emissiveIntensity}
              toneMapped={false}
            />
          </mesh>
          
          {/* Glow effect on top of post */}
          <pointLight 
            position={[0, 0.8, 0]} 
            color={barrierColor} 
            intensity={2} 
            distance={3}
            decay={2}
          />
          
          {/* Energy sphere on top */}
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color={barrierColor} 
              emissive={barrierColor}
              emissiveIntensity={3}
              metalness={1}
              roughness={0}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      
      {/* Only add energy beams between some posts for performance */}
      {barrierPosts.length > 3 && barrierPosts.slice(0, -1).map((start, i) => {
        if (i % 3 === 0 && i + 1 < barrierPosts.length) {
          return (
            <EnergyBeam 
              key={`beam-${i}`}
              start={start.clone().add(new THREE.Vector3(0, 0.9, 0))}
              end={barrierPosts[i+1].clone().add(new THREE.Vector3(0, 0.9, 0))}
              color={barrierColor}
            />
          );
        }
        return null;
      })}
    </group>
  );
}

// Update the QuantumTrackSurface component with reactive coloring
function QuantumTrackSurface({ segment }: { segment: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const { scene } = useThree();
  
  // Track player position for reactive coloring
  const [playerDistance, setPlayerDistance] = useState(100);
  const [playerVelocity, setPlayerVelocity] = useState(0);
  
  // Memoize the track texture based on segment type
  const trackTexture = useMemo(() => {
    // Generate a dynamic canvas texture based on segment type
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Base track color
    const getTrackBaseColor = () => {
      switch (segment.type) {
        case 'straight':
          return '#051525'; // Dark blue base for straight
        case 'curve-left':
        case 'curve-right':
          return '#151530'; // Blue tint for curves
        case 'hill-up':
          return '#153015'; // Green tint for uphill
        case 'hill-down':
          return '#301515'; // Red tint for downhill
        case 'chicane':
          return '#252525'; // Gray for chicane
        default:
          return '#051525';
      }
    };
    
    // Fill with base color
    ctx.fillStyle = getTrackBaseColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add lane markings
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 5;
    ctx.setLineDash([20, 20]);
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Add subtle grid pattern
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 15]);
    
    // Horizontal grid lines
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Add energy flow lines
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    // Energy flow based on segment type
    if (segment.type.includes('curve')) {
      // Curved flow lines
      const direction = segment.type === 'curve-left' ? 1 : -1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 10) {
          const y = canvas.height/2 + Math.sin(x/50) * direction * 50 + i * 20;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    } else {
      // Straight flow lines with variations
      for (let i = 0; i < 10; i++) {
        const yPos = i * (canvas.height / 10) + 10;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 10) {
          const y = yPos + (segment.type === 'hill-up' || segment.type === 'hill-down' ? 
                            Math.sin(x/30) * 10 : 0);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 3);
    
    return texture;
  }, [segment.type]);
  
  // Get emissive color based on segment type
  const getEmissiveColor = () => {
    switch (segment.type) {
      case 'straight':
        return new Color('#00ffff').convertSRGBToLinear().multiplyScalar(0.3);
      case 'curve-left':
      case 'curve-right':
        return new Color('#0066ff').convertSRGBToLinear().multiplyScalar(0.3);
      case 'hill-up':
        return new Color('#00ff66').convertSRGBToLinear().multiplyScalar(0.3);
      case 'hill-down':
        return new Color('#ff6600').convertSRGBToLinear().multiplyScalar(0.3);
      default:
        return new Color('#00ffff').convertSRGBToLinear().multiplyScalar(0.3);
    }
  };
  
  // Get track color based on segment type
  const trackColor = useMemo(() => {
    switch (segment.type) {
      case 'straight':
        return new Color('#000020').convertSRGBToLinear();
      case 'curve-left':
      case 'curve-right':
        return new Color('#000030').convertSRGBToLinear();
      case 'hill-up':
        return new Color('#002000').convertSRGBToLinear();
      case 'hill-down':
        return new Color('#200000').convertSRGBToLinear();
      default:
        return new Color('#000020').convertSRGBToLinear();
    }
  }, [segment.type]);
  
  // Find player for reactive coloring
  useEffect(() => {
    // Find the player in the scene
    const findPlayer = () => {
      const player = scene.getObjectByName('Player');
      return player;
    };
    
    // Update at start
    const player = findPlayer();
    if (player && meshRef.current) {
      const distance = player.position.distanceTo(meshRef.current.position);
      setPlayerDistance(distance);
    }
  }, [scene]);
  
  // Update track material based on player position and game state
  useFrame((state) => {
    if (meshRef.current && matRef.current) {
      // Find player
      const player = scene.getObjectByName('Player');
      if (player) {
        // Calculate distance to player
        const distance = player.position.distanceTo(meshRef.current.position);
        setPlayerDistance(distance);
        
        // Get player velocity (approximation by position change)
        const prevPos = player.userData.prevPos || player.position.clone();
        const velocity = player.position.distanceTo(prevPos) * 60; // 60 fps approximation
        player.userData.prevPos = player.position.clone();
        setPlayerVelocity(velocity);
      }
      
      // Pulse the emissive intensity based on player proximity
      const proximityFactor = Math.max(0, 1 - playerDistance / 100);
      const pulseSpeed = Math.max(1, 2 + playerVelocity / 20);
      const pulseIntensity = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.3 + 0.7;
      const finalIntensity = pulseIntensity * (0.5 + proximityFactor);
      matRef.current.emissiveIntensity = finalIntensity;
      
      // Scroll the texture for movement effect - faster when player is closer
      if (matRef.current.map) {
        const scrollSpeed = 0.1 + proximityFactor * 0.3;
        matRef.current.map.offset.y = (state.clock.elapsedTime * scrollSpeed) % 1;
      }
    }
  });
  
  // Get segment start position for placement
  const startPos = segment.startPosition || segment.controlPoints[0];
  
  // Calculate segment length either from property or from control points
  const segmentLength = segment.length || 
    (segment.controlPoints.length > 1 ? segment.controlPoints[0].distanceTo(segment.controlPoints[segment.controlPoints.length-1]) : 50);
  
  return (
    <mesh 
      ref={meshRef}
      position={[startPos.x, startPos.y, startPos.z - segmentLength/2]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[segment.width, 0.2, segmentLength]} />
      <meshStandardMaterial 
        ref={matRef}
        color={trackColor}
        metalness={QUANTUM_VISUALS.MATERIALS.trackMetalness}
        roughness={QUANTUM_VISUALS.MATERIALS.trackRoughness}
        emissive={getEmissiveColor()}
        emissiveIntensity={1.0}
        emissiveMap={trackTexture || undefined}
        map={trackTexture || undefined}
        toneMapped={false}
      />
    </mesh>
  );
}

// Display segment information in 3D space with quantum styling
function SegmentInfo({ segment }: { segment: any }) {
  const startPos = segment.startPosition || segment.controlPoints[0];
  const segmentLength = segment.length || 
    (segment.controlPoints.length > 1 ? segment.controlPoints[0].distanceTo(segment.controlPoints[segment.controlPoints.length-1]) : 50);
  
  const textRef = useRef<THREE.Group>(null);
  
  // Animate the text for quantum effect
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 4;
      textRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  return (
    <group ref={textRef} position={[startPos.x, startPos.y + 4, startPos.z - segmentLength/2]}>
      <Text
        color="#ffffff"
        fontSize={2}
        maxWidth={20}
        lineHeight={1}
        letterSpacing={0.1}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#000000"
        outlineOpacity={0.8}
        font="/fonts/quantum.woff"
      >
        {`#${segment.index}: ${segment.type}`}
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#00ffff"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </Text>
    </group>
  );
}

// Enhanced quantum-themed track segment visualization
function QuantumTrackSegmentView({ entity }: { entity: Entity }) {
  const segment = entity.get(TrackSegment);
  if (!segment) {
    console.error("No TrackSegment trait found on entity");
    return null;
  }
  
  // Get control points from segment
  const controlPoints = segment.controlPoints;
  if (!controlPoints || controlPoints.length < 2) {
    console.error("TrackSegment has insufficient control points", segment);
    return null;
  }
  
  // Get segment start position for placement
  const startPos = segment.startPosition || controlPoints[0];
  
  // Create track edges for barriers
  const [leftEdgePoints, rightEdgePoints] = useMemo(() => 
    createTrackEdges(segment), [segment]);
  
  return (
    <group>
      {/* Main track surface with quantum effects */}
      <QuantumTrackSurface segment={segment} />
      
      {/* Left and right quantum barriers */}
      <QuantumBarrier points={leftEdgePoints} side="left" />
      <QuantumBarrier points={rightEdgePoints} side="right" />
      
      {/* Floating segment info */}
      <SegmentInfo segment={segment} />
      
      {/* Quantum energy field above track */}
      <QuantumEnergyField 
        position={[startPos.x, startPos.y + 2, startPos.z - segment.length/2]} 
        color={QUANTUM_VISUALS.COLORS.secondaryGlow}
      />
      
      {/* Visualize the control points with glowing spheres */}
      {controlPoints.map((point, i) => (
        <mesh key={`cp-${i}`} position={point} castShadow>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial 
            color={QUANTUM_VISUALS.COLORS.accentGlow} 
            emissive={QUANTUM_VISUALS.COLORS.accentGlow}
            emissiveIntensity={2}
            metalness={1}
            roughness={0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// Quantum ground with nebula effect
function QuantumGround() {
  const material = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#000033').convertSRGBToLinear() },
    uColor2: { value: new THREE.Color('#330033').convertSRGBToLinear() },
    uColor3: { value: new THREE.Color('#000022').convertSRGBToLinear() },
  }), []);
  
  // Custom shader for nebula effect
  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    
    varying vec2 vUv;
    
    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    
    void main() {
      // Time-based coordinates for animation
      vec2 uv = vUv * 5.0;
      float t = uTime * 0.1;
      
      // Multiple layers of noise for nebula effect
      float n1 = snoise(uv * 1.0 + t);
      float n2 = snoise(uv * 2.0 - t * 0.5);
      float n3 = snoise(uv * 4.0 + t * 0.2);
      
      // Combine noise layers
      float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      noise = smoothstep(0.3, 0.7, noise);
      
      // Mix colors based on noise
      vec3 color1 = mix(uColor1, uColor2, noise);
      vec3 color2 = mix(color1, uColor3, n3 * 0.5);
      
      // Add stars
      float stars = step(0.98, snoise(uv * 50.0));
      color2 += stars * 0.5;
      
      gl_FragColor = vec4(color2, 1.0);
    }
  `;
  
  const vertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  // Animate nebula shader
  useFrame((state) => {
    if (material.current) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[2000, 2000, 128, 128]} />
      <shaderMaterial 
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Old track view component for the flat grid (kept for compatibility)
export function TrackView({ entity }: { entity: Entity }) {
  const groupRef = useRef<Group | null>(null) as MutableRefObject<Group | null>;

  // Set up initial state with useCallback
  const setInitial = useCallback(
    (group: Group | null) => {
      if (!group) return;
      groupRef.current = group;

      // Ensure the track has a transform
      if (!entity.has(Transform)) {
        entity.set(Transform, {
          position: new THREE.Vector3(0, -0.5, 0),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
    },
    [entity]
  );
  
  return (
    <group ref={setInitial}>
      {/* The quantum ground replaces the basic grid */}
      <QuantumGround />
    </group>
  );
}

// Main component to render the enhanced quantum track
export function TrackRenderer() {
  console.log("TrackRenderer component rendering");
  
  // Get the main track entity (ground plane)
  const track = useQueryFirst(IsTrack, Transform);
  console.log("Main track entity:", track?.id);
  
  // Get all track segment entities
  const segments = useQuery(IsTrack, TrackSegment);
  
  // Log segment count for debugging
  console.log(`TrackRenderer: Found ${segments.length} track segments`);
  
  if (segments.length > 0) {
    const firstSegment = segments[0].get(TrackSegment);
    console.log("First segment:", { 
      index: firstSegment?.index,
      type: firstSegment?.type,
      controlPoints: firstSegment?.controlPoints?.length
    });
  }
  
  // Create atmospheric fog
  useEffect(() => {
    const scene = document.querySelector('canvas')?.parentElement?.querySelector('div')?.querySelector('div')?.firstChild as any;
    if (scene?.fog) return;
    
    if (scene) {
      scene.fog = new THREE.FogExp2('#000033', 0.005);
    }
  }, []);
  
  return (
    <>
      {/* Ambient quantum glow in the distance */}
      <QuantumGlow 
        position={[0, 20, -100]} 
        color={QUANTUM_VISUALS.COLORS.secondaryGlow} 
        size={50} 
      />
      
      {/* Main energy field in the world */}
      <QuantumEnergyField 
        position={[0, 10, -50]} 
        color={QUANTUM_VISUALS.COLORS.primaryGlow} 
        count={200} 
        size={0.5} 
      />
      
      {/* Track with quantum ground */}
      {track && <TrackView entity={track} />}
      
      {/* Render all track segments with quantum visuals */}
      {segments.map(entity => (
        <QuantumTrackSegmentView key={entity.id.toString()} entity={entity} />
      ))}
      
      {/* Show quantum-styled axis helpers at segment starts */}
      {segments.slice(0, 5).map(entity => {
        const segment = entity.get(TrackSegment);
        if (!segment || !segment.startPosition) return null;
        
        return (
          <group key={`axis-${entity.id.toString()}`} position={segment.startPosition}>
            <axesHelper args={[5]} />
            <pointLight color="#00ffff" intensity={2} distance={10} decay={2} />
          </group>
        );
      })}
    </>
  );
} 