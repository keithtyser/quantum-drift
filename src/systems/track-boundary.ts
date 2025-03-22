import { World } from 'koota';
import { Transform, IsPlayer, IsTrack, TrackSegment, Movement } from '../traits';
import * as THREE from 'three';

// Boundary detection parameters
const BOUNDARY_FORCE = 20;  // Force applied to push player back onto track
const BOUNDARY_DAMPING = 0.85; // Additional damping when off track
const TRACK_WIDTH_TOLERANCE = 0.9; // Width percentage that's considered safe (0.9 = 90% of width)

/**
 * Determines if the player is within the track boundaries
 * @param playerPosition Player's current position
 * @param segment Current track segment
 * @returns Object containing whether player is on track and closest edge point
 */
function isPlayerOnTrack(playerPosition: THREE.Vector3, segment: any): { isOnTrack: boolean, closestEdgePoint?: THREE.Vector3, normalVector?: THREE.Vector3 } {
  const controlPoints = segment.controlPoints;
  const width = segment.width;
  
  if (!controlPoints || controlPoints.length < 2) {
    return { isOnTrack: true }; // Default to true if we can't determine
  }
  
  // Find the closest control point to the player
  let closestPointIndex = 0;
  let closestDistance = Infinity;
  
  for (let i = 0; i < controlPoints.length; i++) {
    const distance = playerPosition.distanceTo(controlPoints[i]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPointIndex = i;
    }
  }
  
  // Get the current segment direction at this point
  let direction = new THREE.Vector3(0, 0, -1);
  if (closestPointIndex < controlPoints.length - 1) {
    direction.subVectors(controlPoints[closestPointIndex + 1], controlPoints[closestPointIndex]).normalize();
  } else if (closestPointIndex > 0) {
    direction.subVectors(controlPoints[closestPointIndex], controlPoints[closestPointIndex - 1]).normalize();
  }
  
  // Create perpendicular vector (normal to the track direction)
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
  
  // Project player position onto track direction to find the corresponding track center point
  const pointOnTrack = controlPoints[closestPointIndex].clone();
  const playerToPoint = new THREE.Vector3().subVectors(playerPosition, pointOnTrack);
  const dot = playerToPoint.dot(direction);
  
  // Adjust track point based on projection
  if (closestPointIndex < controlPoints.length - 1) {
    const nextPoint = controlPoints[closestPointIndex + 1];
    const segmentLength = pointOnTrack.distanceTo(nextPoint);
    
    if (dot > 0 && dot < segmentLength) {
      // Interpolate between current and next point
      const t = dot / segmentLength;
      pointOnTrack.lerp(nextPoint, t);
    }
  }
  
  // Calculate lateral distance from track center
  const playerToTrackCenter = new THREE.Vector3().subVectors(playerPosition, pointOnTrack);
  playerToTrackCenter.y = 0; // Ignore height difference
  
  // Project this vector onto the perpendicular to get lateral distance
  const lateralDistance = Math.abs(playerToTrackCenter.dot(perpendicular));
  
  // Determine if player is on track (within safe width)
  const safeWidth = width * TRACK_WIDTH_TOLERANCE / 2;
  const isOnTrack = lateralDistance <= safeWidth;
  
  // Calculate closest edge point and normal vector if off track
  let closestEdgePoint;
  let normalVector;
  
  if (!isOnTrack) {
    // Determine which side of the track the player is on
    const side = Math.sign(playerToTrackCenter.dot(perpendicular));
    
    // Calculate edge point
    closestEdgePoint = pointOnTrack.clone().add(
      perpendicular.clone().multiplyScalar(side * width / 2)
    );
    
    // Normal vector points from the edge back to the track center
    normalVector = perpendicular.clone().multiplyScalar(-side);
  }
  
  return { isOnTrack, closestEdgePoint, normalVector };
}

/**
 * Apply a force to push player back onto the track
 */
export function enforceTrackBoundaries(world: World): void {
  // Find player entity
  const player = world.queryFirst(IsPlayer, Transform, Movement);
  if (!player) return;
  
  const playerTransform = player.get(Transform)!;
  const playerMovement = player.get(Movement)!;
  const playerPosition = playerTransform.position;
  
  // Find all track segments
  const trackSegments = world.query(IsTrack, TrackSegment);
  if (trackSegments.length === 0) return;
  
  // Find the segment the player is most likely on
  let currentSegment = null;
  let closestDistance = Infinity;
  
  for (const segment of trackSegments) {
    const segmentData = segment.get(TrackSegment)!;
    const controlPoints = segmentData.controlPoints;
    
    if (!controlPoints || controlPoints.length === 0) continue;
    
    // Find distance to the segment's midpoint as a quick check
    const midPointIndex = Math.floor(controlPoints.length / 2);
    const midPoint = controlPoints[midPointIndex];
    const distance = playerPosition.distanceTo(midPoint);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      currentSegment = segmentData;
    }
  }
  
  if (!currentSegment) return;
  
  // Check if player is on track
  const { isOnTrack, closestEdgePoint, normalVector } = isPlayerOnTrack(playerPosition, currentSegment);
  
  if (!isOnTrack && normalVector && closestEdgePoint) {
    // Apply boundary force to the player
    const boundaryForce = normalVector.clone().multiplyScalar(BOUNDARY_FORCE);
    
    // Apply extra damping when off track
    playerMovement.velocity.multiplyScalar(BOUNDARY_DAMPING);
    
    // Add corrective force
    playerMovement.force.add(boundaryForce);
    
    // Add visual feedback (vibration effect)
    const smallRandomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      0,
      (Math.random() - 0.5) * 0.05
    );
    
    // Apply small visual shake
    playerTransform.position.add(smallRandomOffset);
    
    // Debug
    console.log("Player off track! Applying correction force:", boundaryForce);
  }
} 