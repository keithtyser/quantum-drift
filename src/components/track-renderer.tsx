import { useQuery, useQueryFirst } from 'koota/react';
import { Entity } from 'koota';
import { IsTrack, Transform, TrackSegment } from '../traits';
import { Grid, Line } from '@react-three/drei';
import { useRef, MutableRefObject, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Group } from 'three';

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

// Render a single track segment
function TrackSegmentView({ entity }: { entity: Entity }) {
  const segment = entity.get(TrackSegment);
  if (!segment) return null;
  
  // Use control points to create track geometry
  const controlPoints = segment.controlPoints;
  
  // Create the edge points
  const [leftEdge, rightEdge] = useMemo(() => 
    createTrackEdges(segment), [segment.controlPoints, segment.width]
  );
  
  // Create track surface points
  const surfacePoints = useMemo(() => {
    // Connect left and right edges to form the track surface
    const points: THREE.Vector3[] = [];
    
    // For each control point, add left and right edge points
    for (let i = 0; i < leftEdge.length; i++) {
      points.push(leftEdge[i]);
      points.push(rightEdge[i]);
    }
    
    return points;
  }, [leftEdge, rightEdge]);
  
  // Track color based on segment type
  const getTrackColor = () => {
    switch (segment.type) {
      case 'curve-left':
      case 'curve-right':
        return '#444466';
      case 'hill-up':
        return '#446644';
      case 'hill-down':
        return '#664444';
      default:
        return '#444444';
    }
  };
  
  return (
    <group position={[0, 0, 0]}>
      {/* Track center line for debugging */}
      <Line
        points={controlPoints}
        color="#ffffff"
        lineWidth={1}
        dashed={true}
        dashSize={1}
        dashScale={1}
        opacity={0.5}
      />
      
      {/* Track left edge */}
      <Line
        points={leftEdge}
        color="#bbbbbb"
        lineWidth={3}
      />
      
      {/* Track right edge */}
      <Line
        points={rightEdge}
        color="#bbbbbb"
        lineWidth={3}
      />
      
      {/* Track surface */}
      <mesh>
        <meshStandardMaterial color={getTrackColor()} roughness={0.8} metalness={0.2} />
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={surfacePoints.length}
            array={new Float32Array(surfacePoints.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
          <bufferAttribute
            attach="index"
            count={(leftEdge.length - 1) * 6}
            array={(() => {
              const indices = [];
              // Create triangles between left and right edges
              for (let i = 0; i < leftEdge.length - 1; i++) {
                const i1 = i * 2;
                const i2 = i1 + 1;
                const i3 = i1 + 2;
                const i4 = i1 + 3;
                // Triangle 1
                indices.push(i1, i2, i3);
                // Triangle 2
                indices.push(i2, i4, i3);
              }
              return new Uint16Array(indices);
            })()}
            itemSize={1}
          />
        </bufferGeometry>
      </mesh>
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

  // Only render the ground plane and grid, individual segments are rendered separately
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
  // Get the main track entity (basic ground plane)
  const track = useQueryFirst(IsTrack, Transform);
  
  // Get all track segment entities
  const segments = useQuery(IsTrack, TrackSegment, Transform);
  
  return (
    <>
      {track && !track.has(TrackSegment) && <TrackView entity={track} />}
      {segments.map(entity => (
        <TrackSegmentView key={entity.id.toString()} entity={entity} />
      ))}
    </>
  );
} 