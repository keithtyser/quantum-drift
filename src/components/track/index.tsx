import { useQuery, useQueryFirst } from 'koota/react';
import { Entity } from 'koota';
import { IsTrack, Transform, TrackSegment } from '../../traits';
import { Grid } from '@react-three/drei';
import { useMemo } from 'react';
import { TrackSegmentView } from './TrackSegmentView';
import { TrackView } from './TrackView';

/**
 * Simple distance-based culling function 
 * @param segments Segments to filter
 * @param maxDistance Maximum distance to render
 * @param cameraPosition Camera position to measure from
 * @returns Filtered segments
 */
function distanceCulling(
  segments: Entity[], 
  maxDistance = 200, 
  cameraPosition = [0, 0, 0]
): Entity[] {
  if (!segments || segments.length === 0) return [];
  
  const cameraPos = { x: cameraPosition[0], y: cameraPosition[1], z: cameraPosition[2] };
  
  return segments.filter(entity => {
    const transform = entity.get(Transform);
    if (!transform) return false;
    
    const dx = transform.position.x - cameraPos.x;
    const dy = transform.position.y - cameraPos.y;
    const dz = transform.position.z - cameraPos.z;
    
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    return distanceSquared <= maxDistance * maxDistance;
  });
}

/**
 * Main component for rendering the entire track, including segments and ground
 */
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
  
  // Convert query result to array for processing
  const segmentArray = useMemo(() => {
    return Array.from(segments);
  }, [segments]);
  
  // Filter segments that are in view using distance culling
  const visibleSegments = useMemo(() => {
    if (segmentArray.length === 0) return [];
    
    // Use simple distance culling for now
    return distanceCulling(segmentArray, 200);
  }, [segmentArray]);
  
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
      
      {/* Only render TrackView for the main track entity if it exists */}
      {track && !track.has(TrackSegment) && <TrackView entity={track} />}
      
      {/* Render visible track segments */}
      {visibleSegments.map((entity) => (
        <TrackSegmentView key={entity.id.toString()} entity={entity} />
      ))}
      
      {/* Show axis helper at each segment start - only for first 5 segments */}
      {segmentArray.slice(0, 5).map((entity) => {
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