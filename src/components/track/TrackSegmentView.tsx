import { Entity } from 'koota';
import { TrackSegment } from '../../traits';
import { Text } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { createTrackEdges, calculateBoundingBox } from '../../utils/track-geometry';
import { BarrierLine } from './BarrierLine';
import { TrackSurfacePattern } from './TrackSurfacePattern';
import { DebugBoundingBox } from './DebugBoundingBox';
import { debugState } from '../debug-controls';
import { SegmentType } from '../../utils/track-generator';

interface TrackSegmentViewProps {
  entity: Entity;
}

/**
 * Component for rendering a single track segment with visual enhancements
 */
export function TrackSegmentView({ entity }: TrackSegmentViewProps) {
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
  
  // Create edge points for barriers
  const [leftEdge, rightEdge] = useMemo(() => {
    return createTrackEdges(controlPoints, segment.width);
  }, [controlPoints, segment.width]);
  
  // Create track geometry
  const trackGeometry = useMemo(() => {
    // Simple approach: create a flat plane for the track surface
    const geometry = new THREE.PlaneGeometry(
      segment.width, 
      segmentLength,
      Math.max(1, Math.floor(segment.width / 5)),
      Math.max(1, Math.floor(segmentLength / 5))
    );
    
    // Rotate and position the plane
    geometry.rotateX(Math.PI / 2);
    
    return geometry;
  }, [segment.width, segmentLength]);
  
  // Calculate bounding box including control points and edges
  const boundingBox = useMemo(() => {
    const allPoints = [...controlPoints, ...leftEdge, ...rightEdge];
    return calculateBoundingBox(allPoints);
  }, [controlPoints, leftEdge, rightEdge]);
  
  // Create a simplified segment data object for pattern rendering
  const segmentData = useMemo(() => ({
    type: segment.type as SegmentType,
    index: segment.index,
    width: segment.width
  }), [segment.type, segment.index, segment.width]);
  
  return (
    <group position={[startPos.x, startPos.y, startPos.z - segmentLength/2]}>
      {/* Show segment as a colored box with surface pattern */}
      <TrackSurfacePattern segment={segmentData} geometry={trackGeometry} />
      
      {/* Add barriers on both sides */}
      <BarrierLine points={leftEdge} side="left" />
      <BarrierLine points={rightEdge} side="right" />
      
      {/* Add segment number display */}
      {debugState.showTrackSegmentIds && (
        <group position={[0, 4, 0]}>
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
      )}
      
      {/* Show bounding box in debug mode */}
      {debugState.showBoundaries && (
        <DebugBoundingBox min={boundingBox.min} max={boundingBox.max} />
      )}
      
      {/* Visualize the control points as small spheres */}
      {debugState.showControlPoints && controlPoints.map((point, i) => (
        <mesh key={`cp-${i}`} position={point}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color="#FFFF00" />
        </mesh>
      ))}
    </group>
  );
} 