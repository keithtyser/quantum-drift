import * as THREE from 'three';
import { noise } from './perlin';

// Track generation configuration
export const TRACK_CONFIG = {
  segmentLength: 50, // Length of a single track segment
  trackWidth: 20, // Width of the track
  minCurvature: -0.2, // Reduced curvature for more stable tracks
  maxCurvature: 0.2, // Reduced curvature for more stable tracks
  minElevation: -1, // Reduced elevation change
  maxElevation: 2, // Reduced elevation change
  curveFrequency: 0.1, // Reduced curve frequency for more straight segments
  elevationFrequency: 0.1, // Reduced elevation frequency
  renderDistance: 10, // Increased render distance for better visibility
  seed: 12345, // Fixed seed for consistent generation during debugging
};

// Segment types
export type SegmentType = 'straight' | 'curve-left' | 'curve-right' | 'hill-up' | 'hill-down';

// Segment generation parameters
export interface SegmentParams {
  index: number;
  length: number;
  width: number;
  type: SegmentType;
  curvature: number;
  elevation: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startDirection: THREE.Vector3;
  endDirection: THREE.Vector3;
  controlPoints: THREE.Vector3[];
}

/**
 * Generates a new track segment based on the previous segment
 * @param prevSegment The previous segment parameters or null if this is the first segment
 * @param index The index of the new segment
 * @returns Parameters for the new segment
 */
export function generateNextSegment(prevSegment: SegmentParams | null, index: number): SegmentParams {
  console.log(`Generating segment ${index}`);
  
  // If this is the first segment, create a straight segment at the origin
  if (!prevSegment) {
    const startPos = new THREE.Vector3(0, 0, 0);
    const endPos = new THREE.Vector3(0, 0, -TRACK_CONFIG.segmentLength);
    const direction = new THREE.Vector3(0, 0, -1);
    
    // Create control points for the straight segment
    const controlPoints: THREE.Vector3[] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = new THREE.Vector3(
        0,
        0,
        -t * TRACK_CONFIG.segmentLength
      );
      controlPoints.push(point);
    }
    
    return {
      index,
      length: TRACK_CONFIG.segmentLength,
      width: TRACK_CONFIG.trackWidth,
      type: 'straight',
      curvature: 0,
      elevation: 0,
      startPosition: startPos,
      endPosition: endPos,
      startDirection: direction,
      endDirection: direction,
      controlPoints,
    };
  }

  // Use Perlin noise for consistent, non-random generation
  const noiseSeed = index * 0.3;
  const noiseSample = noise(noiseSeed, 0, TRACK_CONFIG.seed * 0.01);
  
  // For safety, first 5 segments should always be straight
  let type: SegmentType = 'straight';
  let curvature = 0;
  let elevation = 0;
  
  // After segment 5, add some variation
  if (index > 5) {
    // Decide if this segment should curve
    if (Math.abs(noiseSample) > 1 - TRACK_CONFIG.curveFrequency) {
      // Curve direction based on noise value
      if (noiseSample > 0) {
        type = 'curve-right';
        curvature = THREE.MathUtils.lerp(
          0.05, 
          TRACK_CONFIG.maxCurvature, 
          Math.abs(noiseSample)
        );
      } else {
        type = 'curve-left';
        curvature = THREE.MathUtils.lerp(
          -0.05, 
          TRACK_CONFIG.minCurvature, 
          Math.abs(noiseSample)
        );
      }
    }
    
    // Decide if this segment should change elevation
    // Use a different noise parameter for elevation
    const elevationNoise = noise(noiseSeed + 100, 0, TRACK_CONFIG.seed * 0.01);
    
    if (Math.abs(elevationNoise) > 1 - TRACK_CONFIG.elevationFrequency) {
      if (elevationNoise > 0) {
        // Only change type if not already curved
        type = type === 'straight' ? 'hill-up' : type;
        elevation = THREE.MathUtils.lerp(
          0.5, 
          TRACK_CONFIG.maxElevation,
          Math.abs(elevationNoise)
        );
      } else {
        // Only change type if not already curved
        type = type === 'straight' ? 'hill-down' : type;
        elevation = THREE.MathUtils.lerp(
          -0.5, 
          TRACK_CONFIG.minElevation,
          Math.abs(elevationNoise)
        );
      }
    }
  }
  
  // Calculate new start position and direction (from previous segment end)
  const startPos = prevSegment.endPosition.clone();
  const startDir = prevSegment.endDirection.clone();
  
  // Calculate end position and direction based on segment type
  let endPos: THREE.Vector3;
  let endDir: THREE.Vector3;
  let controlPoints: THREE.Vector3[] = [];
  
  if (type === 'curve-left' || type === 'curve-right') {
    // Use a simple circular arc for curved segments
    const radius = TRACK_CONFIG.segmentLength / Math.abs(curvature || 0.001);
    
    // Calculate center of the turning circle
    const normal = new THREE.Vector3(-startDir.z, 0, startDir.x).normalize();
    if (curvature < 0) normal.negate(); // Adjust for left/right turn
    
    const center = startPos.clone().add(normal.clone().multiplyScalar(radius));
    
    // Calculate the angle subtended by the arc
    const arcAngle = (TRACK_CONFIG.segmentLength / radius);
    
    // Calculate end direction by rotating start direction
    endDir = startDir.clone();
    const rotationMatrix = new THREE.Matrix4().makeRotationY(curvature * arcAngle);
    endDir.applyMatrix4(rotationMatrix);
    
    // Calculate end position
    endPos = center.clone().add(
      startPos.clone().sub(center).applyMatrix4(rotationMatrix)
    );
    
    // Generate control points for the curve visualization
    const steps = 10;
    controlPoints = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const stepAngle = t * arcAngle;
      const stepRotation = new THREE.Matrix4().makeRotationY(curvature * stepAngle);
      const point = center.clone().add(
        startPos.clone().sub(center).applyMatrix4(stepRotation)
      );
      
      // Add elevation change gradually
      if (elevation !== 0) {
        point.y += t * elevation;
      }
      
      controlPoints.push(point);
    }
  } else {
    // For straight segments, hill-up, or hill-down
    endDir = startDir.clone();
    
    // Calculate end position
    endPos = startPos.clone().add(startDir.clone().multiplyScalar(TRACK_CONFIG.segmentLength));
    
    // Generate control points for visualization
    controlPoints = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = new THREE.Vector3().lerpVectors(
        startPos, 
        endPos, 
        t
      );
      
      // Add elevation change gradually
      if (elevation !== 0) {
        // Use sine curve for smoother elevation transitions
        const elevationFactor = Math.sin(t * Math.PI / 2);
        point.y += elevation * elevationFactor;
      }
      
      controlPoints.push(point);
    }
    
    // Update end position with final elevation
    if (elevation !== 0) {
      endPos.y += elevation;
    }
  }
  
  // Safety check: ensure we have enough control points
  if (controlPoints.length < 2) {
    console.warn(`Segment ${index} has less than 2 control points, adding fallback points`);
    
    // Add fallback control points
    controlPoints = [
      startPos.clone(),
      endPos.clone(),
    ];
  }
  
  // Log the generated segment for debugging
  console.log(`Segment ${index}: ${type}, curvature: ${curvature.toFixed(2)}, elevation: ${elevation.toFixed(2)}`);
  
  return {
    index,
    length: TRACK_CONFIG.segmentLength,
    width: TRACK_CONFIG.trackWidth,
    type,
    curvature,
    elevation,
    startPosition: startPos,
    endPosition: endPos,
    startDirection: startDir,
    endDirection: endDir,
    controlPoints,
  };
}

/**
 * Generates a sequence of track segments
 * @param count Number of segments to generate
 * @returns Array of segment parameters
 */
export function generateTrackSequence(count: number): SegmentParams[] {
  const segments: SegmentParams[] = [];
  
  for (let i = 0; i < count; i++) {
    const prevSegment = i > 0 ? segments[i - 1] : null;
    segments.push(generateNextSegment(prevSegment, i));
  }
  
  return segments;
} 