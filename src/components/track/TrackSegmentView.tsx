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
  
  // Get segment start position for placement
  const startPos = segment.startPosition || controlPoints[0];
  
  // Calculate segment length either from property or from control points
  const segmentLength = segment.length || 
    (controlPoints.length > 1 ? controlPoints[0].distanceTo(controlPoints[controlPoints.length-1]) : 50);
  
  // Create edge points for barriers
  const [leftEdge, rightEdge] = useMemo(() => {
    return createTrackEdges(controlPoints, segment.width);
  }, [controlPoints, segment.width]);
  
  // Create enhanced track geometry based on segment type
  const trackGeometry = useMemo(() => {
    // For curved or complex segments, use a more detailed approach
    if (segment.type !== 'straight' && controlPoints.length >= 3) {
      // Create a path from control points
      const path = new THREE.CatmullRomCurve3(controlPoints);
      
      // Create a tube geometry following the path
      const geometry = new THREE.TubeGeometry(
        path,
        Math.max(8, Math.floor(segmentLength / 5)), // More divisions for smoother curves
        segment.width / 2,
        8,
        false
      );
      
      return geometry;
    } else {
      // For straight segments, use a simple plane
      const geometry = new THREE.PlaneGeometry(
        segment.width,
        segmentLength,
        Math.max(1, Math.floor(segment.width / 5)),
        Math.max(1, Math.floor(segmentLength / 5))
      );
      
      // Rotate the plane to be horizontal
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }
  }, [segment.type, controlPoints, segment.width, segmentLength]);
  
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
  
  // Calculate center position for the segment
  const centerPosition = useMemo(() => {
    if (segment.type === 'straight') {
      // For straight segments, simply place at start and adjust for length
      return new THREE.Vector3(
        startPos.x,
        startPos.y,
        startPos.z - segmentLength/2
      );
    } else {
      // For curved segments, use the midpoint between start and end
      const midpoint = new THREE.Vector3()
        .addVectors(startPos, segment.endPosition || controlPoints[controlPoints.length-1])
        .multiplyScalar(0.5);
      return midpoint;
    }
  }, [segment.type, startPos, segment.endPosition, controlPoints, segmentLength]);
  
  // Calculate rotation for the segment based on direction
  const segmentRotation = useMemo(() => {
    if (segment.type === 'straight') {
      return new THREE.Euler(0, 0, 0);
    } else if (segment.startDirection) {
      // For curved segments, calculate rotation based on direction
      const dir = segment.startDirection.clone().normalize();
      return new THREE.Euler(0, Math.atan2(dir.x, dir.z), 0);
    }
    return new THREE.Euler(0, 0, 0);
  }, [segment.type, segment.startDirection]);
  
  return (
    <group>
      {/* For straight segments, use simple placement */}
      {segment.type === 'straight' && (
        <group position={centerPosition}>
          {/* Show segment as a colored box with surface pattern */}
          <TrackSurfacePattern segment={segmentData} geometry={trackGeometry} />
          
          {/* Add barriers on both sides */}
          <BarrierLine points={leftEdge} side="left" />
          <BarrierLine points={rightEdge} side="right" />
        </group>
      )}
      
      {/* For curved segments, use more complex placement */}
      {segment.type !== 'straight' && (
        <group position={startPos}>
          {/* Show segment as a colored surface with pattern */}
          <TrackSurfacePattern segment={segmentData} geometry={trackGeometry} />
          
          {/* Add barriers along edges */}
          <BarrierLine points={leftEdge} side="left" />
          <BarrierLine points={rightEdge} side="right" />
        </group>
      )}
      
      {/* Add segment number display */}
      {debugState.showTrackSegmentIds && (
        <group position={[centerPosition.x, centerPosition.y + 4, centerPosition.z]}>
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
      
      {/* Show start and end directions in debug mode */}
      {debugState.showBoundaries && segment.startDirection && (
        <arrowHelper
          args={[
            segment.startDirection.clone().normalize(),
            startPos.clone(),
            5,
            0x00ff00
          ]}
        />
      )}
      
      {debugState.showBoundaries && segment.endDirection && segment.endPosition && (
        <arrowHelper
          args={[
            segment.endDirection.clone().normalize(),
            segment.endPosition.clone(),
            5,
            0xff0000
          ]}
        />
      )}
    </group>
  );
} 