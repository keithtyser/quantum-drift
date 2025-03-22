import * as THREE from 'three';

/**
 * Creates left and right edge points for a track segment based on control points and width
 * @param controlPoints Array of control points defining the center of the track
 * @param width Width of the track
 * @returns Tuple of [leftEdgePoints, rightEdgePoints]
 */
export function createTrackEdges(
  controlPoints: THREE.Vector3[], 
  width: number
): [THREE.Vector3[], THREE.Vector3[]] {
  
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

/**
 * Calculates the bounding box for a list of points
 * @param points Array of points to calculate bounding box for
 * @returns Object with min and max Vector3 properties defining the bounding box
 */
export function calculateBoundingBox(points: THREE.Vector3[]): { min: THREE.Vector3, max: THREE.Vector3 } {
  if (!points || points.length === 0) {
    return {
      min: new THREE.Vector3(0, 0, 0),
      max: new THREE.Vector3(0, 0, 0)
    };
  }
  
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  
  for (const point of points) {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  }
  
  return { min, max };
}

/**
 * Calculates the center point of an array of Vector3 points
 * @param points Array of Vector3 points
 * @returns Center point as Vector3
 */
export function calculateCenterPoint(points: THREE.Vector3[]): THREE.Vector3 {
  if (!points || points.length === 0) {
    return new THREE.Vector3(0, 0, 0);
  }
  
  const sum = points.reduce((acc, point) => acc.add(point), new THREE.Vector3());
  return sum.divideScalar(points.length);
} 