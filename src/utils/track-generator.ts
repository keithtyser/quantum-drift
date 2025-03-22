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

// Configuration for track generation
export const TRACK_CONFIG = {
  segmentLength: 50,
  trackWidth: 20,
  minCurvature: -0.2,      // Reduced curvature for more stable turns
  maxCurvature: 0.2,       // Reduced curvature for more stable turns
  minElevation: -1,        // Reduced elevation change for more stable terrain
  maxElevation: 2,         // Reduced elevation change for more stable terrain
  curveFrequency: 0.3,     // Reduced curve frequency
  elevationFrequency: 0.2, // Reduced elevation frequency
  chicaneChance: 0.05,     // Reduced chance of generating a chicane
  sCurveChance: 0.05,      // Reduced chance of generating an s-curve
  renderDistance: 5,       // Reduced render distance (in segments) for better performance
  seed: 12345,             // Fixed seed for consistent generation during debugging
  pointsPerSegment: 6,     // Reduced control points per segment for simplicity
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
  const startPosition = new THREE.Vector3(0, 0, 0);
  const startDirection = new THREE.Vector3(0, 0, -1); // Forward along negative Z
  
  console.log("Generating first track segment");
  
  // First segment is always straight
  const endPosition = new THREE.Vector3(
    0, 
    0, 
    -TRACK_CONFIG.segmentLength
  );
  const endDirection = new THREE.Vector3(0, 0, -1);
  
  const controlPoints = calculateControlPoints(
    startPosition,
    startDirection,
    endPosition,
    endDirection
  );
  
  // Safety check for control points
  if (!controlPoints || controlPoints.length < 2) {
    console.error("Failed to generate control points for first segment");
    return {
      startPosition,
      startDirection,
      endPosition,
      endDirection,
      controlPoints: [startPosition.clone(), endPosition.clone()],
      length: TRACK_CONFIG.segmentLength,
      width: TRACK_CONFIG.trackWidth,
      type: 'straight'
    };
  }
  
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
  
  // Use Perlin noise for consistent, non-random generation
  const noiseSeed = index * 0.3;
  const noiseSample = noise(noiseSeed, 0, TRACK_CONFIG.seed * 0.01);
  const elevationNoise = noise(noiseSeed, 1, TRACK_CONFIG.seed * 0.01);
  
  // For safety, first 3 segments should always be straight
  let type: SegmentType = 'straight';
  let curvature = 0;
  let elevation = 0;
  
  // After segment 3, add variation
  if (index > 3) {
    // Generate a random number between 0 and 1
    const segmentTypeRand = Math.abs(noise(noiseSeed, 2, TRACK_CONFIG.seed * 0.01));
    
    if (segmentTypeRand < TRACK_CONFIG.curveFrequency) {
      // Determine curve direction based on noise value
      if (noiseSample > 0) {
        type = 'curve-right';
        curvature = THREE.MathUtils.lerp(
          0.1, 
          TRACK_CONFIG.maxCurvature, 
          noiseSample
        );
      } else {
        type = 'curve-left';
        curvature = THREE.MathUtils.lerp(
          -0.1, 
          TRACK_CONFIG.minCurvature, 
          Math.abs(noiseSample)
        );
      }
    } 
    else if (segmentTypeRand < TRACK_CONFIG.curveFrequency + TRACK_CONFIG.chicaneChance) {
      // Generate a chicane (rapid left-right or right-left)
      type = 'chicane';
      curvature = noiseSample > 0 ? 0.2 : -0.2; // Direction of first part of chicane
    }
    else if (segmentTypeRand < TRACK_CONFIG.curveFrequency + TRACK_CONFIG.chicaneChance + TRACK_CONFIG.sCurveChance) {
      // Generate an S-curve (smoother left-right or right-left)
      type = 's-curve';
      curvature = noiseSample > 0 ? 0.15 : -0.15; // Direction of first part of s-curve
    }
    
    // Determine elevation change
    if (Math.abs(elevationNoise) > 1 - TRACK_CONFIG.elevationFrequency) {
      if (elevationNoise > 0) {
        type = type === 'straight' ? 'hill-up' : type; // Only override if straight
        elevation = THREE.MathUtils.lerp(
          0.5, 
          TRACK_CONFIG.maxElevation, 
          elevationNoise
        );
      } else {
        type = type === 'straight' ? 'hill-down' : type; // Only override if straight
        elevation = THREE.MathUtils.lerp(
          -0.5, 
          TRACK_CONFIG.minElevation, 
          Math.abs(elevationNoise)
        );
      }
    }
  }
  
  if (DEBUG) {
    console.log(`Segment ${index} type: ${type}, curvature: ${curvature}, elevation: ${elevation}`);
  }
  
  // Calculate end position and direction based on segment type
  const endPosition = new THREE.Vector3();
  const endDirection = new THREE.Vector3();
  
  switch (type) {
    case 'straight':
      // Straight segment - extend in the direction of the start
      endPosition.copy(startPosition).addScaledVector(startDirection, TRACK_CONFIG.segmentLength);
      endDirection.copy(startDirection);
      break;
      
    case 'curve-left':
    case 'curve-right':
      // Calculate curved path
      {
        // Calculate radius based on curvature
        const radius = TRACK_CONFIG.segmentLength / Math.abs(curvature);
        
        // Find center of rotation
        const perpendicular = new THREE.Vector3(-startDirection.z, 0, startDirection.x);
        perpendicular.normalize();
        
        // For curve-right, center is to the right of start direction
        // For curve-left, center is to the left of start direction
        const centerOffset = type === 'curve-right' ? 1 : -1;
        const center = startPosition.clone().addScaledVector(
          perpendicular, 
          centerOffset * radius
        );
        
        // Calculate angle of rotation based on segment length and radius
        const angle = (TRACK_CONFIG.segmentLength / radius) * centerOffset;
        
        // Rotate the direction
        endDirection.copy(startDirection);
        const rotMatrix = new THREE.Matrix4().makeRotationY(-angle);
        endDirection.applyMatrix4(rotMatrix);
        
        // Calculate end position by rotating around center
        const startOffset = new THREE.Vector3().subVectors(startPosition, center);
        const endOffset = startOffset.clone().applyMatrix4(rotMatrix);
        endPosition.copy(center).add(endOffset);
      }
      break;
      
    case 'hill-up':
    case 'hill-down':
      // Create elevation change
      endPosition.copy(startPosition).addScaledVector(startDirection, TRACK_CONFIG.segmentLength);
      endPosition.y += elevation;
      endDirection.copy(startDirection);
      
      // Adjust end direction to account for slope
      const slopeDirection = new THREE.Vector3(0, elevation / TRACK_CONFIG.segmentLength, 0);
      endDirection.add(slopeDirection).normalize();
      break;
      
    case 'chicane':
      // Rapid switch from one side to another (sharp turns)
      {
        // First half: turn in one direction
        const halfDir = startDirection.clone();
        const halfRotMatrix = new THREE.Matrix4().makeRotationY(-curvature * 2);
        halfDir.applyMatrix4(halfRotMatrix);
        
        // Midpoint
        const midpoint = startPosition.clone().addScaledVector(
          startDirection, 
          TRACK_CONFIG.segmentLength * 0.5
        );
        
        // Second half: turn in opposite direction
        endDirection.copy(halfDir);
        const endRotMatrix = new THREE.Matrix4().makeRotationY(curvature * 4);
        endDirection.applyMatrix4(endRotMatrix);
        
        // End position
        endPosition.copy(midpoint).addScaledVector(halfDir, TRACK_CONFIG.segmentLength * 0.5);
      }
      break;
      
    case 's-curve':
      // Smooth transition from one side to another (gentle curves)
      {
        // First third: gradual turn in one direction
        const firstDir = startDirection.clone();
        const firstRotMatrix = new THREE.Matrix4().makeRotationY(-curvature);
        firstDir.applyMatrix4(firstRotMatrix);
        
        // First third point
        const firstThird = startPosition.clone().addScaledVector(
          startDirection, 
          TRACK_CONFIG.segmentLength / 3
        );
        
        // Second third: gradual turn in opposite direction
        const secondDir = firstDir.clone();
        const secondRotMatrix = new THREE.Matrix4().makeRotationY(curvature * 2);
        secondDir.applyMatrix4(secondRotMatrix);
        
        // Second third point
        const secondThird = firstThird.clone().addScaledVector(
          firstDir, 
          TRACK_CONFIG.segmentLength / 3
        );
        
        // Final third: continue turn in opposite direction
        endDirection.copy(secondDir);
        const endRotMatrix = new THREE.Matrix4().makeRotationY(curvature);
        endDirection.applyMatrix4(endRotMatrix);
        
        // End position
        endPosition.copy(secondThird).addScaledVector(secondDir, TRACK_CONFIG.segmentLength / 3);
      }
      break;
  }
  
  // Calculate control points
  const controlPoints = calculateControlPoints(
    startPosition,
    startDirection,
    endPosition,
    endDirection
  );
  
  // Validate control points
  if (!controlPoints || controlPoints.length < 2) {
    console.error('Failed to generate valid control points, using fallback');
    
    // Fallback to a simple straight segment
    const fallbackEnd = startPosition.clone().addScaledVector(
      startDirection, 
      TRACK_CONFIG.segmentLength
    );
    
    return {
      startPosition,
      startDirection,
      endPosition: fallbackEnd,
      endDirection: startDirection.clone(),
      controlPoints: [startPosition.clone(), fallbackEnd],
      length: TRACK_CONFIG.segmentLength,
      width: TRACK_CONFIG.trackWidth,
      type: 'straight'
    };
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
  
  for (let i = 0; i < count; i++) {
    const prevSegment = i > 0 ? segments[i - 1] : generateFirstSegment();
    segments.push(generateNextSegment(prevSegment, i));
  }
  
  return segments;
} 