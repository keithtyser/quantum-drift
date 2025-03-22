import { useQuery, useQueryFirst } from 'koota/react';
import { Entity } from 'koota';
import { IsTrack, Transform, TrackSegment } from '../traits';
import { Grid, Line, Box, Text } from '@react-three/drei';
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

// Render a single track segment
function TrackSegmentView({ entity }: { entity: Entity }) {
  const segment = entity.get(TrackSegment);
  if (!segment) return null;
  
  // Use control points to create track geometry
  const controlPoints = segment.controlPoints;
  if (!controlPoints || controlPoints.length < 2) {
    console.error("TrackSegment has insufficient control points", segment);
    return null;
  }
  
  // Create the edge points
  const [leftEdge, rightEdge] = useMemo(() => 
    createTrackEdges(segment), [segment.controlPoints, segment.width]
  );
  
  if (leftEdge.length === 0 || rightEdge.length === 0) {
    console.error("Failed to create track edges", segment);
    return null;
  }
  
  // Debug bounding box
  const boundingBoxMin = useMemo(() => {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    [...leftEdge, ...rightEdge].forEach(p => {
      min.x = Math.min(min.x, p.x);
      min.y = Math.min(min.y, p.y);
      min.z = Math.min(min.z, p.z);
    });
    return min;
  }, [leftEdge, rightEdge]);
  
  const boundingBoxMax = useMemo(() => {
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    [...leftEdge, ...rightEdge].forEach(p => {
      max.x = Math.max(max.x, p.x);
      max.y = Math.max(max.y, p.y);
      max.z = Math.max(max.z, p.z);
    });
    return max;
  }, [leftEdge, rightEdge]);
  
  // Create a simpler track visualization using a plane mesh for each segment
  const segmentMesh = useMemo(() => {
    if (leftEdge.length < 2 || rightEdge.length < 2) return null;
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = []; // Add UV coordinates for texturing
    
    // Create vertices by combining left and right edges
    for (let i = 0; i < leftEdge.length; i++) {
      // Left edge vertex
      vertices.push(leftEdge[i].x, leftEdge[i].y, leftEdge[i].z);
      // Add UV - left edge is u=0
      uvs.push(0, i / (leftEdge.length - 1));
      
      // Right edge vertex
      vertices.push(rightEdge[i].x, rightEdge[i].y, rightEdge[i].z);
      // Add UV - right edge is u=1
      uvs.push(1, i / (rightEdge.length - 1));
    }
    
    // Create triangles (two triangles per quad)
    for (let i = 0; i < leftEdge.length - 1; i++) {
      const i1 = i * 2;
      const i2 = i1 + 1;
      const i3 = i1 + 2;
      const i4 = i1 + 3;
      
      // First triangle
      indices.push(i1, i2, i3);
      // Second triangle
      indices.push(i2, i4, i3);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  }, [leftEdge, rightEdge]);
  
  // For edge detection, create slightly elevated invisible walls
  const createBoundaryWalls = () => {
    if (leftEdge.length < 2 || rightEdge.length < 2) return null;
    
    // Create invisible collision walls along track edges (slightly inside the visual edges)
    const wallHeight = 1.5; // Height of invisible collision wall
    
    return (
      <>
        {/* Left boundary wall */}
        <group>
          {leftEdge.map((point, index) => {
            if (index === leftEdge.length - 1) return null;
            const nextPoint = leftEdge[index + 1];
            const midPoint = new THREE.Vector3().lerpVectors(point, nextPoint, 0.5);
            
            // Calculate wall width (distance between points)
            const width = point.distanceTo(nextPoint);
            
            // Calculate rotation to align with the edge
            const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
            const angle = Math.atan2(direction.x, direction.z);
            
            return (
              <Box 
                key={`left-wall-${index}`}
                position={[midPoint.x, midPoint.y + wallHeight/2, midPoint.z]}
                rotation={[0, -angle, 0]}
                args={[width, wallHeight, 0.1]}
              >
                <meshBasicMaterial visible={debugState.showBoundaries} color="#ff000050" transparent opacity={0.3} />
              </Box>
            );
          })}
        </group>
        
        {/* Right boundary wall */}
        <group>
          {rightEdge.map((point, index) => {
            if (index === rightEdge.length - 1) return null;
            const nextPoint = rightEdge[index + 1];
            const midPoint = new THREE.Vector3().lerpVectors(point, nextPoint, 0.5);
            
            // Calculate wall width (distance between points)
            const width = point.distanceTo(nextPoint);
            
            // Calculate rotation to align with the edge
            const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
            const angle = Math.atan2(direction.x, direction.z);
            
            return (
              <Box 
                key={`right-wall-${index}`}
                position={[midPoint.x, midPoint.y + wallHeight/2, midPoint.z]}
                rotation={[0, -angle, 0]}
                args={[width, wallHeight, 0.1]}
              >
                <meshBasicMaterial visible={debugState.showBoundaries} color="#0000ff50" transparent opacity={0.3} />
              </Box>
            );
          })}
        </group>
      </>
    );
  };
  
  return (
    <group position={[0, 0, 0]}>
      {/* Track center line for debugging */}
      {debugState.showControlPoints && (
        <Line
          points={controlPoints}
          color="#ffff00"
          lineWidth={2}
          dashed={true}
          dashSize={1}
          dashScale={1}
        />
      )}
      
      {/* Control point visualization */}
      {debugState.showControlPoints && controlPoints.map((point, index) => (
        <mesh key={`control-${index}`} position={point}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}
      
      {/* Track surface with patterns */}
      {segmentMesh && (
        <TrackSurfacePattern segment={segment} geometry={segmentMesh} />
      )}
      
      {/* Track edge barriers */}
      <BarrierLine points={leftEdge} side="left" />
      <BarrierLine points={rightEdge} side="right" />
      
      {/* Invisible boundary walls for collision */}
      {createBoundaryWalls()}
      
      {/* Debug segment ID */}
      {debugState.showTrackSegmentIds && (
        <Text
          position={[
            controlPoints[Math.floor(controlPoints.length / 2)].x,
            controlPoints[Math.floor(controlPoints.length / 2)].y + 3,
            controlPoints[Math.floor(controlPoints.length / 2)].z,
          ]}
          fontSize={2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
        >
          {`ID: ${segment.index} (${segment.type})`}
        </Text>
      )}
      
      {/* Debug bounding box */}
      {debugState.showBoundaries && (
        <DebugBoundingBox min={boundingBoxMin} max={boundingBoxMax} />
      )}
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
      
      {track && !track.has(TrackSegment) && <TrackView entity={track} />}
      {segments.map(entity => (
        <TrackSegmentView key={entity.id.toString()} entity={entity} />
      ))}
    </>
  );
} 