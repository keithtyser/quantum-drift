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
}

/**
 * Removes a track segment at the given index
 * @param index Segment index to remove
 */
function removeSegment(index: number): void {
  const segment = spawnedSegments[index];
  if (segment) {
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
  
  // Spawn the initial segments
  for (let i = 0; i < TRACK_CONFIG.renderDistance; i++) {
    spawnSegment(world, i);
  }
}

/**
 * Resets the track manager state
 */
export function resetTrack(): void {
  // Destroy all segments
  Object.values(spawnedSegments).forEach(segment => segment.destroy());
  
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
  // Check each segment to see if it contains the position
  for (let i = lowestActiveSegmentIndex; i <= highestSegmentIndex; i++) {
    const segmentParams = segmentCache[i];
    if (!segmentParams) continue;
    
    // Simple check: is the position closer to this segment's end than the segment's length?
    const distanceToStart = position.distanceTo(segmentParams.startPosition);
    const distanceToEnd = position.distanceTo(segmentParams.endPosition);
    
    if (distanceToStart <= segmentParams.length && distanceToEnd <= segmentParams.length) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Updates track segments based on player position
 * @param world World instance
 */
export function updateTrackSegments(world: World): void {
  const player = world.queryFirst(IsPlayer, Transform);
  if (!player) return;
  
  const playerTransform = player.get(Transform)!;
  const playerPosition = playerTransform.position;
  
  // Find which segment the player is currently in
  const currentSegmentIndex = findContainingSegment(playerPosition);
  
  // If player not found in any segment, they might have fallen off
  // In that case, do nothing (could add reset logic here)
  if (currentSegmentIndex === -1) return;
  
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