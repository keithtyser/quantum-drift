import * as THREE from 'three';
import { noise, octaveNoise } from './perlin';

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

// Configuration for track generation - enhanced for more variety
export const TRACK_CONFIG = {
  segmentLength: 50,          // Length of each segment
  trackWidth: 20,             // Width of the track
  minCurvature: -0.3,         // Increased curvature for more visible turns
  maxCurvature: 0.3,          // Increased curvature for more visible turns
  minElevation: -2.0,         // More significant elevation changes
  maxElevation: 2.0,          // More significant elevation changes
  curveFrequency: 0.4,        // More frequent curves
  elevationFrequency: 0.2,    // More frequent elevation changes
  chicaneChance: 0.05,        // More common chicanes
  sCurveChance: 0.05,         // More common S-curves
  renderDistance: 10,         // More segments visible at once
  seed: 12345,                // Fixed seed for consistent generation
  pointsPerSegment: 6,        // More control points for smoother segments
  initialStraightSegments: 3, // Reduced number of initial straight segments
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
  
  // First few segments should be straight for stability
  let type: SegmentType = 'straight';
  let curvature = 0;
  let elevation = 0;
  
  // After initial straight segments, start adding variations
  if (index > TRACK_CONFIG.initialStraightSegments) {
    // Use octave noise for more varied patterns
    const noiseSeed = index * 0.3;
    const noiseSample = octaveNoise(noiseSeed, 0, 3, 0.5, TRACK_CONFIG.seed * 0.01);
    
    // Determine segment type based on noise
    if (Math.abs(noiseSample) > 0.5) { // Lowered threshold to 0.5 for more curves
      // Curves - more common and more pronounced
      if (noiseSample > 0) {
        type = 'curve-right';
        curvature = 0.2 + Math.abs(noiseSample) * 0.1; // Variable curvature
      } else {
        type = 'curve-left';
        curvature = -(0.2 + Math.abs(noiseSample) * 0.1); // Variable curvature
      }
    } else if (Math.abs(noiseSample) > 0.8) { // Still rare, but more common
      // Special segments: hills, chicanes, s-curves
      const typeRand = Math.abs(octaveNoise(noiseSeed, 2, 2, 0.6, TRACK_CONFIG.seed));
      if (typeRand < 0.3) {
        type = 'hill-up';
        elevation = 1.5 + Math.abs(noiseSample); // Pronounced hills
      } else if (typeRand < 0.6) {
        type = 'hill-down';
        elevation = -(1.5 + Math.abs(noiseSample)); // Pronounced hills
      } else if (typeRand < 0.8) {
        type = 'chicane';
      } else {
        type = 's-curve';
      }
    }
    
    // Prevent consecutive segments of the same rare type
    if ((type === 'chicane' || type === 's-curve') && 
        (prevSegment.type === 'chicane' || prevSegment.type === 's-curve')) {
      type = 'straight';
    }
    
    // Prevent consecutive hills in the same direction
    if ((type === 'hill-up' && prevSegment.type === 'hill-up') || 
        (type === 'hill-down' && prevSegment.type === 'hill-down')) {
      type = 'straight';
    }
  }
  
  // Calculate end position and direction
  let endPosition = new THREE.Vector3();
  let endDirection = new THREE.Vector3();
  
  // Implement different segment types with improved calculations
  if (type === 'straight') {
    // Straight segment - extend in the direction of the start
    endPosition.copy(startPosition).addScaledVector(startDirection, TRACK_CONFIG.segmentLength);
    endDirection.copy(startDirection);
  } 
  else if (type === 'curve-left' || type === 'curve-right') {
    // Improved curve logic with proper rotation
    const curveSign = type === 'curve-right' ? 1 : -1;
    const angle = Math.abs(curvature) * curveSign; // Use proper curvature value
    
    // Create rotation matrix for smooth direction change
    const rotationMatrix = new THREE.Matrix4().makeRotationY(angle);
    endDirection.copy(startDirection).applyMatrix4(rotationMatrix).normalize();
    
    // Calculate radius of the curve (approximate)
    const radius = TRACK_CONFIG.segmentLength / Math.abs(angle * 2);
    
    // Calculate curve center point
    const center = startPosition.clone().add(
      new THREE.Vector3(-startDirection.z, 0, startDirection.x)
        .normalize()
        .multiplyScalar(radius * curveSign)
    );
    
    // Calculate end position using vector from center
    const vectorFromCenter = startPosition.clone().sub(center);
    vectorFromCenter.applyMatrix4(rotationMatrix);
    endPosition.copy(center).add(vectorFromCenter);
  }
  else if (type === 'hill-up' || type === 'hill-down') {
    // Improved hill logic with smoother transitions
    const elevationSign = type === 'hill-up' ? 1 : -1;
    
    // Calculate end position with proper elevation change
    endPosition.copy(startPosition)
      .addScaledVector(startDirection, TRACK_CONFIG.segmentLength);
    
    // Add elevation change and adjust direction angle
    endPosition.y += elevation * elevationSign;
    
    // Calculate slope angle
    const slopeAngle = Math.atan2(Math.abs(elevation), TRACK_CONFIG.segmentLength);
    
    // Create new direction vector with proper pitch
    endDirection.copy(startDirection);
    if (type === 'hill-up') {
      endDirection.y = Math.sin(slopeAngle);
    } else {
      endDirection.y = -Math.sin(slopeAngle);
    }
    
    // Normalize direction
    endDirection.normalize();
  }
  else if (type === 'chicane') {
    // Chicane - quick left-right or right-left sequence
    const direction = Math.random() > 0.5 ? 1 : -1; // Random direction
    const angle1 = 0.15 * direction;
    const angle2 = -0.3 * direction; // Opposite direction, stronger
    
    // Start with a slight turn in one direction
    const midDirection = startDirection.clone();
    const rotMatrix1 = new THREE.Matrix4().makeRotationY(angle1);
    midDirection.applyMatrix4(rotMatrix1).normalize();
    
    // Calculate midpoint
    const midPoint = startPosition.clone().addScaledVector(midDirection, TRACK_CONFIG.segmentLength * 0.5);
    
    // Then turn more sharply in the opposite direction
    const rotMatrix2 = new THREE.Matrix4().makeRotationY(angle2);
    endDirection.copy(midDirection).applyMatrix4(rotMatrix2).normalize();
    
    // Calculate end position based on both turns
    endPosition.copy(midPoint).addScaledVector(endDirection, TRACK_CONFIG.segmentLength * 0.5);
  }
  else if (type === 's-curve') {
    // S-curve - smooth S shape
    const direction = Math.random() > 0.5 ? 1 : -1; // Random direction
    const angle1 = 0.2 * direction;
    const angle2 = -0.4 * direction; // Opposite direction, stronger
    
    // Create a smooth S-curve with multiple control points
    const segmentThird = TRACK_CONFIG.segmentLength / 3;
    
    // Calculate directions at various points
    const firstThirdDir = startDirection.clone();
    const rotMatrix1 = new THREE.Matrix4().makeRotationY(angle1);
    firstThirdDir.applyMatrix4(rotMatrix1).normalize();
    
    const secondThirdDir = firstThirdDir.clone();
    const rotMatrix2 = new THREE.Matrix4().makeRotationY(angle2);
    secondThirdDir.applyMatrix4(rotMatrix2).normalize();
    
    // Set end direction
    endDirection.copy(secondThirdDir);
    
    // Calculate control points
    const firstThirdPoint = startPosition.clone().addScaledVector(startDirection, segmentThird);
    const secondThirdPoint = firstThirdPoint.clone().addScaledVector(firstThirdDir, segmentThird);
    
    // Calculate final position
    endPosition.copy(secondThirdPoint).addScaledVector(secondThirdDir, segmentThird);
  }
  else {
    // Default fallback to straight for any other types
    endPosition.copy(startPosition).addScaledVector(startDirection, TRACK_CONFIG.segmentLength);
    endDirection.copy(startDirection);
  }
  
  // Create more detailed control points for smoothness
  let controlPoints: THREE.Vector3[];
  
  if (type === 'chicane' || type === 's-curve') {
    // For complex segments, create more detailed control points
    controlPoints = [];
    const steps = TRACK_CONFIG.pointsPerSegment;
    
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      
      // Bezier interpolation
      if (type === 'chicane') {
        const midPoint = startPosition.clone().lerp(endPosition, 0.5);
        midPoint.x += (type === 'chicane' ? 5 : 0) * (t < 0.5 ? t * 2 : (1 - t) * 2);
        
        const p = startPosition.clone().lerp(midPoint, t < 0.5 ? t * 2 : 1)
                  .lerp(endPosition, t < 0.5 ? 0 : (t - 0.5) * 2);
        controlPoints.push(p);
      } else {
        // S-curve uses simple lerp for now
        const point = startPosition.clone().lerp(endPosition, t);
        controlPoints.push(point);
      }
    }
  } else {
    // Use the standard control point calculation for simpler segments
    controlPoints = calculateControlPoints(startPosition, startDirection, endPosition, endDirection);
  }
  
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