import { World, Entity } from 'koota';
import { Transform, IsPlayer, IsTrack, TrackSegment } from '../traits';
import { generateNextSegment, TRACK_CONFIG, SegmentParams } from '../utils/track-generator';
import * as THREE from 'three';
import { actions } from '../actions';

// Cache of spawned segments for efficient lookup
let spawnedSegments: { [key: number]: Entity } = {};
// Track the highest segment index that has been generated
let highestSegmentIndex = -1;
// Track the lowest active segment index
let lowestActiveSegmentIndex = 0;
// Cache for segment parameters
let segmentCache: { [key: number]: SegmentParams } = {};
// Debug flag
const DEBUG = true;

/**
 * Spawns a track segment at the given index
 * @param world World instance
 * @param index Segment index to spawn
 */
function spawnSegment(world: World, index: number): Entity {
  // If this segment already exists, return it
  if (spawnedSegments[index]) {
    return spawnedSegments[index];
  }
  
  if (DEBUG) console.log(`Spawning track segment at index ${index}`);
  
  try {
    // Generate segment parameters
    let segmentParams: SegmentParams;
    
    if (index === 0) {
      // For the first segment, we don't have a previous segment
      segmentParams = generateNextSegment(null, 0);
    } else {
      // For subsequent segments, use the previous segment
      const prevParams = segmentCache[index - 1];
      if (!prevParams) {
        throw new Error(`Previous segment ${index - 1} not found in cache`);
      }
      segmentParams = generateNextSegment(prevParams, index);
    }
    
    // Validate segment parameters
    if (!segmentParams.controlPoints || segmentParams.controlPoints.length < 2) {
      throw new Error(`Generated segment ${index} has invalid control points`);
    }
    
    // Cache the segment parameters
    segmentCache[index] = segmentParams;
    
    // Create the segment entity
    const segment = world.spawn(
      IsTrack,
      TrackSegment({
        index: segmentParams.index,
        length: segmentParams.length,
        width: segmentParams.width,
        type: segmentParams.type,
        curvature: segmentParams.curvature,
        elevation: segmentParams.elevation,
        startPosition: segmentParams.startPosition,
        endPosition: segmentParams.endPosition,
        startDirection: segmentParams.startDirection,
        endDirection: segmentParams.endDirection,
        controlPoints: segmentParams.controlPoints,
      }),
      Transform({
        position: segmentParams.startPosition.clone(),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      })
    );
    
    // Store the segment in the cache
    spawnedSegments[index] = segment;
    
    // Update highest segment index
    if (index > highestSegmentIndex) {
      highestSegmentIndex = index;
    }
    
    return segment;
  } catch (error) {
    console.error(`Error spawning segment ${index}:`, error);
    
    // Create a fallback straight segment if there was an error
    const startPos = index === 0 
      ? new THREE.Vector3(0, 0, 0) 
      : segmentCache[index - 1]?.endPosition.clone() || new THREE.Vector3(0, 0, -index * TRACK_CONFIG.segmentLength);
    
    const endPos = startPos.clone().add(new THREE.Vector3(0, 0, -TRACK_CONFIG.segmentLength));
    const direction = new THREE.Vector3(0, 0, -1);
    
    const fallbackParams: SegmentParams = {
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
      controlPoints: [startPos.clone(), endPos.clone()],
    };
    
    // Cache the fallback segment parameters
    segmentCache[index] = fallbackParams;
    
    // Create the fallback segment entity
    const fallbackSegment = world.spawn(
      IsTrack,
      TrackSegment({
        index: fallbackParams.index,
        length: fallbackParams.length,
        width: fallbackParams.width,
        type: fallbackParams.type,
        curvature: fallbackParams.curvature,
        elevation: fallbackParams.elevation,
        startPosition: fallbackParams.startPosition,
        endPosition: fallbackParams.endPosition,
        startDirection: fallbackParams.startDirection,
        endDirection: fallbackParams.endDirection,
        controlPoints: fallbackParams.controlPoints,
      }),
      Transform({
        position: fallbackParams.startPosition.clone(),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      })
    );
    
    // Store the fallback segment in the cache
    spawnedSegments[index] = fallbackSegment;
    
    // Update highest segment index
    if (index > highestSegmentIndex) {
      highestSegmentIndex = index;
    }
    
    return fallbackSegment;
  }
}

/**
 * Removes a track segment at the given index
 * @param index Segment index to remove
 */
function removeSegment(index: number): void {
  const segment = spawnedSegments[index];
  if (segment) {
    if (DEBUG) console.log(`Removing track segment at index ${index}`);
    
    segment.destroy();
    delete spawnedSegments[index];
    
    // Update the lowest active segment index if necessary
    if (index === lowestActiveSegmentIndex) {
      lowestActiveSegmentIndex = index + 1;
    }
  }
}

/**
 * Spawns initial track segments
 * @param world World instance
 */
export function spawnInitialTrack(world: World): void {
  // Clear any existing segments
  resetTrack();
  
  console.log(`Spawning initial ${TRACK_CONFIG.renderDistance} track segments`);
  
  // Spawn the initial segments
  for (let i = 0; i < TRACK_CONFIG.renderDistance; i++) {
    spawnSegment(world, i);
  }
  
  console.log(`Done spawning initial segments. Total: ${Object.keys(spawnedSegments).length}`);
}

/**
 * Resets the track manager state
 */
export function resetTrack(): void {
  console.log("Resetting track manager state");
  
  // Destroy all segments
  Object.values(spawnedSegments).forEach(segment => {
    if (segment && segment.destroy) {
      segment.destroy();
    }
  });
  
  // Reset state
  spawnedSegments = {};
  highestSegmentIndex = -1;
  lowestActiveSegmentIndex = 0;
  segmentCache = {};
}

/**
 * Finds the segment index that contains the given position
 * @param position Position to check
 * @returns The index of the containing segment or -1 if not found
 */
function findContainingSegment(position: THREE.Vector3): number {
  // If no segments exist, return -1
  if (highestSegmentIndex < 0) return -1;
  
  // Optimization: first check if position is ahead of the first segment
  // or behind the last segment
  const firstSegment = segmentCache[lowestActiveSegmentIndex];
  const lastSegment = segmentCache[highestSegmentIndex];
  
  if (firstSegment && position.z > firstSegment.startPosition.z) {
    // Position is ahead of the first segment (remember z is negative going forward)
    return -1;
  }
  
  if (lastSegment && position.z < lastSegment.endPosition.z) {
    // Position is beyond the last segment
    if (DEBUG) console.log("Player is beyond the last segment, extending track...");
    return highestSegmentIndex;
  }
  
  // Check each segment to see if it contains the position
  for (let i = lowestActiveSegmentIndex; i <= highestSegmentIndex; i++) {
    const segmentParams = segmentCache[i];
    if (!segmentParams) continue;
    
    // Check if the position is between start and end z positions
    if (position.z <= segmentParams.startPosition.z && 
        position.z >= segmentParams.endPosition.z) {
      
      // Also check x bounds with some tolerance for width
      const widthTolerance = segmentParams.width * 1.5; // Allow for some margin
      
      // Simple check if position is within segment width (not accurate for curves but works as approximation)
      const midPointX = (segmentParams.startPosition.x + segmentParams.endPosition.x) / 2;
      if (Math.abs(position.x - midPointX) <= widthTolerance / 2) {
        return i;
      }
    }
  }
  
  // If we get here and haven't found a containing segment, we'll return the closest segment
  let closestSegment = -1;
  let closestDistance = Infinity;
  
  for (let i = lowestActiveSegmentIndex; i <= highestSegmentIndex; i++) {
    const segmentParams = segmentCache[i];
    if (!segmentParams) continue;
    
    const distToStart = position.distanceTo(segmentParams.startPosition);
    const distToEnd = position.distanceTo(segmentParams.endPosition);
    const minDist = Math.min(distToStart, distToEnd);
    
    if (minDist < closestDistance) {
      closestDistance = minDist;
      closestSegment = i;
    }
  }
  
  if (DEBUG && closestSegment !== -1) {
    console.log(`Closest segment to player: ${closestSegment} (distance: ${closestDistance.toFixed(2)})`);
  }
  
  return closestSegment;
}

/**
 * Updates track segments based on player position
 * @param world World instance
 */
export function updateTrackSegments(world: World): void {
  // Count active segments
  const activeSegmentCount = Object.keys(spawnedSegments).length;
  
  // If no segments exist, spawn initial segments
  if (activeSegmentCount === 0) {
    spawnInitialTrack(world);
    return;
  }
  
  // Find the player entity
  const player = world.queryFirst(IsPlayer, Transform);
  if (!player) {
    if (DEBUG) console.log("No player found, skipping track update");
    return;
  }
  
  const playerTransform = player.get(Transform)!;
  const playerPosition = playerTransform.position;
  
  // Find which segment the player is currently in
  const currentSegmentIndex = findContainingSegment(playerPosition);
  
  // If player not found in any segment, they might have fallen off
  if (currentSegmentIndex === -1) {
    if (DEBUG) console.log("Player not found in any segment, using segment 0");
    // Use segment 0 as fallback
    const segmentsAhead = TRACK_CONFIG.renderDistance;
    for (let i = 1; i <= segmentsAhead; i++) {
      if (!spawnedSegments[i]) {
        spawnSegment(world, i);
      }
    }
    return;
  }
  
  // Spawn segments ahead of the player
  const segmentsAhead = TRACK_CONFIG.renderDistance;
  for (let i = currentSegmentIndex + 1; i <= currentSegmentIndex + segmentsAhead; i++) {
    if (!spawnedSegments[i]) {
      spawnSegment(world, i);
    }
  }
  
  // Remove segments too far behind the player
  const removeThreshold = currentSegmentIndex - TRACK_CONFIG.renderDistance;
  for (let i = lowestActiveSegmentIndex; i < removeThreshold; i++) {
    removeSegment(i);
  }
} 