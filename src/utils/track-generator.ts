import * as THREE from 'three';
import { noise } from './perlin';

export type SegmentType = 'straight' | 'curve-left' | 'curve-right' | 'hill-up' | 'hill-down' | 'chicane' | 's-curve';

export interface TrackSegmentParams {
  startPosition: THREE.Vector3;
  startDirection: THREE.Vector3;
  endPosition: THREE.Vector3;
  endDirection: THREE.Vector3;
  controlPoints: THREE.Vector3[];
  length: number;
  width: number;
  type: SegmentType;
}

// Configuration for track generation - simplified for stability and debugging
export const TRACK_CONFIG = {
  segmentLength: 50,          // Length of each segment
  trackWidth: 20,             // Width of the track
  minCurvature: -0.1,         // Reduced curvature for stability
  maxCurvature: 0.1,          // Reduced curvature for stability
  minElevation: -0.5,         // Minimal elevation change for debugging
  maxElevation: 0.5,          // Minimal elevation change for debugging
  curveFrequency: 0.2,        // Less frequent curves
  elevationFrequency: 0.1,    // Less frequent elevation changes
  chicaneChance: 0.02,        // Very rare chicanes
  sCurveChance: 0.02,         // Very rare S-curves
  renderDistance: 8,          // More segments visible at once
  seed: 12345,                // Fixed seed for consistent generation
  pointsPerSegment: 4,        // Fewer control points for simpler segments
};

// Debug flag
const DEBUG = true;

/**
 * Calculate control points for a segment based on start/end points and directions
 */
function calculateControlPoints(
  startPos: THREE.Vector3, 
  startDir: THREE.Vector3,
  endPos: THREE.Vector3,
  endDir: THREE.Vector3,
  numPoints: number = TRACK_CONFIG.pointsPerSegment
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const segmentLength = startPos.distanceTo(endPos);
  
  // Always include start point
  points.push(startPos.clone());
  
  // Calculate intermediate control points
  for (let i = 1; i < numPoints - 1; i++) {
    const t = i / (numPoints - 1);
    
    // Hermite interpolation for smooth curves
    const h1 = 2 * Math.pow(t, 3) - 3 * Math.pow(t, 2) + 1;
    const h2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
    const h3 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
    const h4 = Math.pow(t, 3) - Math.pow(t, 2);
    
    // Calculate point
    const point = new THREE.Vector3()
      .addScaledVector(startPos, h1)
      .addScaledVector(endPos, h2)
      .addScaledVector(startDir, h3 * segmentLength)
      .addScaledVector(endDir, h4 * segmentLength);
    
    points.push(point);
  }
  
  // Always include end point
  points.push(endPos.clone());
  
  return points;
}

/**
 * Generate the first track segment
 */
export function generateFirstSegment(): TrackSegmentParams {
  console.log("Generating FIRST track segment - should be straight");
  
  const startPosition = new THREE.Vector3(0, 0, 0);
  const startDirection = new THREE.Vector3(0, 0, -1); // Forward along negative Z
  
  // First segment is always straight
  const endPosition = new THREE.Vector3(
    0, 
    0, 
    -TRACK_CONFIG.segmentLength
  );
  const endDirection = new THREE.Vector3(0, 0, -1);
  
  const controlPoints = [
    startPosition.clone(), 
    new THREE.Vector3(0, 0, -TRACK_CONFIG.segmentLength/3),
    new THREE.Vector3(0, 0, -TRACK_CONFIG.segmentLength*2/3),
    endPosition.clone()
  ];
  
  return {
    startPosition,
    startDirection,
    endPosition,
    endDirection,
    controlPoints,
    length: TRACK_CONFIG.segmentLength,
    width: TRACK_CONFIG.trackWidth,
    type: 'straight'
  };
}

/**
 * Generate a new track segment based on the previous one
 */
export function generateNextSegment(
  prevSegment: TrackSegmentParams, 
  index: number
): TrackSegmentParams {
  if (DEBUG) {
    console.log(`Generating segment ${index}`);
  }
  
  // Start position and direction from the end of previous segment
  const startPosition = prevSegment.endPosition.clone();
  const startDirection = prevSegment.endDirection.clone();
  
  // First 5 segments should always be straight for stability
  let type: SegmentType = 'straight';
  let curvature = 0;
  let elevation = 0;
  
  // After segment 5, start adding variations
  if (index > 5) {
    // Use Perlin noise with known seed for consistency
    const noiseSeed = index * 0.3;
    const noiseSample = noise(noiseSeed, 0, TRACK_CONFIG.seed * 0.01);
    
    // Determine segment type based on noise
    if (Math.abs(noiseSample) > 0.7) {
      // Curves
      if (noiseSample > 0) {
        type = 'curve-right';
        curvature = 0.1;
      } else {
        type = 'curve-left';
        curvature = -0.1;
      }
    } else if (Math.abs(noiseSample) > 0.9) {
      // Very rare: hills, chicanes, s-curves
      const typeRand = Math.abs(noise(noiseSeed, 2, TRACK_CONFIG.seed));
      if (typeRand < 0.3) {
        type = 'hill-up';
        elevation = 0.5;
      } else if (typeRand < 0.6) {
        type = 'hill-down';
        elevation = -0.5;
      } else if (typeRand < 0.8) {
        type = 'chicane';
      } else {
        type = 's-curve';
      }
    }
  }
  
  // Calculate end position and direction
  let endPosition = new THREE.Vector3();
  let endDirection = new THREE.Vector3();
  
  // Simplified track geometry for debugging
  if (type === 'straight') {
    // Straight segment - extend in the direction of the start
    endPosition.copy(startPosition).addScaledVector(startDirection, TRACK_CONFIG.segmentLength);
    endDirection.copy(startDirection);
  } 
  else if (type === 'curve-left' || type === 'curve-right') {
    // Simple curve logic
    const curveSign = type === 'curve-right' ? 1 : -1;
    const angle = 0.2 * curveSign; // Simplified curve angle
    
    // Rotate direction
    endDirection.copy(startDirection);
    const rotationMatrix = new THREE.Matrix4().makeRotationY(-angle);
    endDirection.applyMatrix4(rotationMatrix);
    
    // Calculate end position (simplified)
    endPosition.copy(startPosition).addScaledVector(
      startDirection, 
      TRACK_CONFIG.segmentLength * 0.7
    ).addScaledVector(
      new THREE.Vector3(curveSign, 0, 0),
      TRACK_CONFIG.segmentLength * 0.3
    );
  }
  else if (type === 'hill-up' || type === 'hill-down') {
    // Simple hill
    const elevationSign = type === 'hill-up' ? 1 : -1;
    
    endPosition.copy(startPosition)
      .addScaledVector(startDirection, TRACK_CONFIG.segmentLength)
      .add(new THREE.Vector3(0, elevation * elevationSign, 0));
      
    endDirection.copy(startDirection);
  }
  else {
    // Default to straight for any other types for now
    endPosition.copy(startPosition).addScaledVector(startDirection, TRACK_CONFIG.segmentLength);
    endDirection.copy(startDirection);
  }
  
  // Create simple control points (just interpolate)
  const controlPoints = [
    startPosition.clone(),
    startPosition.clone().add(endPosition.clone().sub(startPosition).multiplyScalar(0.33)),
    startPosition.clone().add(endPosition.clone().sub(startPosition).multiplyScalar(0.66)),
    endPosition.clone()
  ];
  
  // Log the generated segment details for debugging
  if (DEBUG) {
    console.log(`Segment ${index}: ${type}, start=(${startPosition.x.toFixed(1)}, ${startPosition.y.toFixed(1)}, ${startPosition.z.toFixed(1)})`);
  }

  return {
    startPosition,
    startDirection,
    endPosition,
    endDirection,
    controlPoints,
    length: TRACK_CONFIG.segmentLength,
    width: TRACK_CONFIG.trackWidth,
    type
  };
}

/**
 * Generates a sequence of track segments
 * @param count Number of segments to generate
 * @returns Array of segment parameters
 */
export function generateTrackSequence(count: number): TrackSegmentParams[] {
  const segments: TrackSegmentParams[] = [];
  console.log(`Generating track sequence with ${count} segments`);
  
  // Always generate first segment first
  segments.push(generateFirstSegment());
  
  // Generate remaining segments
  for (let i = 1; i < count; i++) {
    segments.push(generateNextSegment(segments[i - 1], i));
  }
  
  return segments;
} 