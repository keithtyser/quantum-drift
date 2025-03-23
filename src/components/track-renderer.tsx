import { useQuery, useQueryFirst } from 'koota/react';
import { Entity } from 'koota';
import { IsTrack, Transform, TrackSegment } from '../traits';
import { Grid, Line, Box, Text, useHelper } from '@react-three/drei';
import { useRef, MutableRefObject, useCallback, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Group } from 'three';
import { debugState } from './debug-controls';

// Helper function to create edge points for the track
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
    
    leftEdge.push(leftPoint);
    rightEdge.push(rightPoint);
  }
  
  return [leftEdge, rightEdge];
}

// Component to render a barrier along track edge
function BarrierLine({ points, side }: { points: THREE.Vector3[], side: 'left' | 'right' }) {
  if (points.length < 2) return null;
  
  // Generate barrier posts
  const barrierPosts = useMemo(() => {
    const posts = [];
    // Place posts every few points along the edge
    for (let i = 0; i < points.length; i += 2) {
      const point = points[i].clone();
      // Adjust height for the post
      point.y += 0.5; // Half height of the post
      posts.push(point);
    }
    return posts;
  }, [points]);
  
  const barrierColor = side === 'left' ? '#ff4444' : '#4444ff';
  
  return (
    <group>
      {/* Barrier line */}
      <Line
        points={points}
        color={barrierColor}
        lineWidth={4}
      />
      
      {/* Barrier posts */}
      {barrierPosts.map((position, index) => (
        <mesh key={`${side}-post-${index}`} position={position}>
          <boxGeometry args={[0.3, 1, 0.3]} />
          <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// Track surface patterns based on segment type
function TrackSurfacePattern({ segment, geometry }: { segment: any, geometry: THREE.BufferGeometry }) {
  const getPatternTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Clear canvas
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pattern based on segment type
    switch (segment.type) {
      case 'curve-left':
      case 'curve-right':
        // Draw curve pattern - diagonal lines
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 8;
        for (let i = -canvas.width; i < canvas.width * 2; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + canvas.height, canvas.height);
          ctx.stroke();
        }
        break;
      case 'chicane':
      case 's-curve':
        // Draw chicane pattern - zig-zag lines
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 8;
        ctx.beginPath();
        for (let y = 20; y < canvas.height; y += 60) {
          for (let x = 0; x < canvas.width; x += 80) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 40, y + 30);
            ctx.lineTo(x + 80, y);
          }
        }
        ctx.stroke();
        break;
      case 'hill-up':
        // Draw uphill pattern - upward-pointing chevrons
        ctx.strokeStyle = '#446644';
        ctx.lineWidth = 10;
        for (let y = canvas.height; y > 0; y -= 60) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 120) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 60, y - 30);
            ctx.lineTo(x + 120, y);
          }
          ctx.stroke();
        }
        break;
      case 'hill-down':
        // Draw downhill pattern - downward-pointing chevrons
        ctx.strokeStyle = '#664444';
        ctx.lineWidth = 10;
        for (let y = 0; y < canvas.height; y += 60) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 120) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 60, y + 30);
            ctx.lineTo(x + 120, y);
          }
          ctx.stroke();
        }
        break;
      default:
        // Draw straight pattern - dashed center line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        
        // Draw edge markings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(20, canvas.height);
        ctx.moveTo(canvas.width - 20, 0);
        ctx.lineTo(canvas.width - 20, canvas.height);
        ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  };
  
  // Create texture if segment exists
  const texture = useMemo(() => {
    return getPatternTexture();
  }, [segment.type]);
  
  // Get base color for the track type
  const getTrackColor = () => {
    switch (segment.type) {
      case 'curve-left':
      case 'curve-right':
        return '#444466'; // Slight blue tint for curves
      case 'chicane':
      case 's-curve':
        return '#445566'; // More pronounced blue for chicanes
      case 'hill-up':
        return '#446644'; // Green tint for uphill
      case 'hill-down':
        return '#664444'; // Red tint for downhill
      default:
        return '#444444'; // Default grey for straight
    }
  };
  
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color={getTrackColor()} 
        roughness={0.9} 
        metalness={0.1}
        side={THREE.DoubleSide}
        map={texture}
      />
    </mesh>
  );
}

// Debug component to visualize track segment bounding box
function DebugBoundingBox({ min, max }: { min: THREE.Vector3, max: THREE.Vector3 }) {
  const size = new THREE.Vector3().subVectors(max, min);
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  
  return (
    <mesh position={center}>
      <boxGeometry args={[size.x, size.y, size.z]} />
      <meshBasicMaterial color="red" wireframe={true} opacity={0.3} transparent={true} />
    </mesh>
  );
}

// Simplified track segment view for debugging
function TrackSegmentView({ entity }: { entity: Entity }) {
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
  
  // Create a distinctive color based on segment index for debugging
  const getSegmentColor = (index: number, type: string) => {
    // Base color determined by segment type
    let color;
    switch (type) {
      case 'curve-left': 
      case 'curve-right': return '#4466AA';
      case 'hill-up': return '#44AA66';
      case 'hill-down': return '#AA4466';
      case 'chicane': 
      case 's-curve': return '#AA44AA';
      default: return '#888888'; // straight
    }
  };
  
  // Get segment start position for placement
  const startPos = segment.startPosition || controlPoints[0];
  
  // Calculate segment length either from property or from control points
  const segmentLength = segment.length || 
    (controlPoints.length > 1 ? controlPoints[0].distanceTo(controlPoints[controlPoints.length-1]) : 50);
  
  // Create a simple box representing the track segment
  return (
    <group>
      {/* Show segment as a colored box */}
      <mesh position={[startPos.x, startPos.y, startPos.z - segmentLength/2]}>
        <boxGeometry args={[segment.width, 0.5, segmentLength]} />
        <meshStandardMaterial 
          color={getSegmentColor(segment.index, segment.type)} 
          roughness={0.8}
        />
      </mesh>
      
      {/* Add barriers on both sides */}
      <mesh position={[startPos.x + segment.width/2, startPos.y + 1, startPos.z - segmentLength/2]}>
        <boxGeometry args={[1, 2, segmentLength]} />
        <meshStandardMaterial color="#AA2222" />
      </mesh>
      
      <mesh position={[startPos.x - segment.width/2, startPos.y + 1, startPos.z - segmentLength/2]}>
        <boxGeometry args={[1, 2, segmentLength]} />
        <meshStandardMaterial color="#2222AA" />
      </mesh>
      
      {/* Add segment number display */}
      <group position={[startPos.x, startPos.y + 4, startPos.z - segmentLength/2]}>
        <Text
          color="#ffffff"
          fontSize={2}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
        >
          {`#${segment.index}: ${segment.type}`}
        </Text>
      </group>
      
      {/* Visualize the control points as small spheres */}
      {controlPoints.map((point, i) => (
        <mesh key={`cp-${i}`} position={point}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color="#FFFF00" />
        </mesh>
      ))}
    </group>
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

  // Only render the ground grid and grid, individual segments are rendered separately
  return (
    <group ref={setInitial}>
      {/* The main ground grid for orientation */}
      <Grid
        args={[1000, 1000]}
        cellSize={5}
        cellThickness={0.3}
        cellColor="#333333"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={1000}
        position={[0, -0.5, 0]}
      />
    </group>
  );
}

// Query for all track segments and render them
export function TrackRenderer() {
  console.log("TrackRenderer component rendering");
  
  // Get the main track entity (basic ground plane)
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
  
  return (
    <>
      {/* Debug test sphere to verify rendering works */}
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="red" />
      </mesh>
      
      {/* Basic floor grid for orientation */}
      <Grid
        args={[1000, 1000]}
        cellSize={5}
        cellThickness={0.3}
        cellColor="#333333"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={1000}
        position={[0, -0.5, 0]}
      />
      
      {/* Render all track segments */}
      {segments.map(entity => (
        <TrackSegmentView key={entity.id.toString()} entity={entity} />
      ))}
      
      {/* Show axis helper at each segment start */}
      {segments.slice(0, 5).map(entity => {
        const segment = entity.get(TrackSegment);
        if (!segment || !segment.startPosition) return null;
        
        return (
          <axesHelper 
            key={`axis-${entity.id.toString()}`} 
            position={segment.startPosition} 
            args={[5]} 
          />
        );
      })}
    </>
  );
} 