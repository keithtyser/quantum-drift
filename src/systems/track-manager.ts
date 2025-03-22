import { World, Entity } from 'koota';
import { Transform, IsPlayer, IsTrack, TrackSegment } from '../traits';
import { generateNextSegment, TRACK_CONFIG, generateFirstSegment, TrackSegmentParams } from '../utils/track-generator';
import * as THREE from 'three';
import { actions } from '../actions';

// Cache of spawned segments for efficient lookup
let spawnedSegments: { [key: number]: Entity } = {};
// Track the highest segment index that has been generated
let highestSegmentIndex = -1;
// Track the lowest active segment index
let lowestActiveSegmentIndex = 0;
// Cache for segment parameters
let segmentCache: { [key: number]: TrackSegmentParams } = {};
// Debug flag
const DEBUG = true;

/**
 * Spawns a track segment at the given index
 * @param world World instance
 * @param index Segment index to spawn
 */
function spawnSegment(world: World, index: number): Entity | null {
  try {
    // If this segment already exists, return it
    if (spawnedSegments[index]) {
      if (DEBUG) console.log(`Segment ${index} already exists, using cached version`);
      return spawnedSegments[index];
    }
    
    console.log(`Spawning track segment at index ${index}`);
    
    // Generate segment parameters
    let segmentParams: TrackSegmentParams;
    
    if (index === 0) {
      // For the first segment, generate a straight segment
      segmentParams = generateFirstSegment();
    } else {
      // For subsequent segments, use the previous segment
      const prevParams = segmentCache[index - 1];
      if (!prevParams) {
        console.error(`Previous segment ${index - 1} not found in cache`);
        return null;
      }
      segmentParams = generateNextSegment(prevParams, index);
    }
    
    // Validate segment parameters
    if (!segmentParams.controlPoints || segmentParams.controlPoints.length < 2) {
      console.error(`Generated segment ${index} has invalid control points`);
      return null;
    }
    
    // Cache the segment parameters
    segmentCache[index] = segmentParams;
    
    // Create the segment entity
    const segment = world.spawn(
      IsTrack,
      TrackSegment({
        index: index,
        length: segmentParams.length,
        width: segmentParams.width,
        type: segmentParams.type,
        curvature: 0, // Default value for now
        elevation: 0, // Default value for now
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
    
    console.log(`Successfully spawned segment ${index} (type: ${segmentParams.type}, id: ${segment.id})`);
    
    return segment;
  } catch (error) {
    console.error(`Error spawning segment ${index}:`, error);
    
    // Try to create a fallback straight segment
    try {
      console.log(`Creating fallback straight segment for index ${index}`);
      
      // Calculate start position based on previous segment
      const startPos = index === 0 
        ? new THREE.Vector3(0, 0, 0) 
        : segmentCache[index - 1]?.endPosition.clone() || new THREE.Vector3(0, 0, -index * TRACK_CONFIG.segmentLength);
      
      const endPos = startPos.clone().add(new THREE.Vector3(0, 0, -TRACK_CONFIG.segmentLength));
      const direction = new THREE.Vector3(0, 0, -1);
      
      const fallbackParams: TrackSegmentParams = {
        startPosition: startPos,
        endPosition: endPos,
        startDirection: direction,
        endDirection: direction,
        controlPoints: [
          startPos.clone(),
          new THREE.Vector3(
            startPos.x, 
            startPos.y, 
            startPos.z - TRACK_CONFIG.segmentLength/2
          ),
          endPos.clone()
        ],
        length: TRACK_CONFIG.segmentLength,
        width: TRACK_CONFIG.trackWidth,
        type: 'straight'
      };
      
      // Cache the fallback segment parameters
      segmentCache[index] = fallbackParams;
      
      // Create the fallback segment entity
      const fallbackSegment = world.spawn(
        IsTrack,
        TrackSegment({
          index: index,
          length: fallbackParams.length,
          width: fallbackParams.width,
          type: fallbackParams.type,
          curvature: 0,
          elevation: 0,
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
      
      console.log(`Created fallback straight segment for index ${index}`);
      
      return fallbackSegment;
    } catch (fallbackError) {
      console.error(`Failed to create even fallback segment for index ${index}:`, fallbackError);
      return null;
    }
  }
}

/**
 * Removes a track segment at the given index
 * @param index Segment index to remove
 */
function removeSegment(index: number): void {
  const segment = spawnedSegments[index];
  if (segment) {
    console.log(`Removing track segment at index ${index}`);
    
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
  console.log("=================================================");
  console.log("              INITIALIZING TRACK                 ");
  console.log("=================================================");
  
  // Clear any existing segments
  resetTrack();
  
  try {
    // Spawn first 10 segments to ensure we have enough track visible at start
    const initialSegmentCount = 10;
    console.log(`Spawning initial ${initialSegmentCount} track segments`);
    
    // Always spawn first segment separately to ensure it's created properly
    const firstSegment = spawnSegment(world, 0);
    if (!firstSegment) {
      throw new Error("Failed to spawn the first segment");
    }
    
    console.log(`First segment spawned: ID=${firstSegment.id}`);
    
    // Spawn the rest of the initial segments
    for (let i = 1; i < initialSegmentCount; i++) {
      const segment = spawnSegment(world, i);
      if (segment) {
        console.log(`Segment ${i} spawned: ID=${segment.id}, type=${segment.get(TrackSegment)?.type}`);
      } else {
        console.error(`Failed to spawn segment ${i}`);
      }
    }
    
    const segmentCount = Object.keys(spawnedSegments).length;
    console.log(`Successfully spawned ${segmentCount} track segments`);
    console.log("Track initialization complete");
    
  } catch (error) {
    console.error("Error during initial track spawning:", error);
    
    // Fallback: spawn a minimal straight track for testing
    console.warn("Creating emergency fallback track (straight segments only)");
    
    try {
      // Clear segments again
      resetTrack();
      
      // Create 5 straight segments
      for (let i = 0; i < 5; i++) {
        // Direct creation of simple straight segments
        const startPos = new THREE.Vector3(0, 0, -i * TRACK_CONFIG.segmentLength);
        const endPos = new THREE.Vector3(0, 0, -(i+1) * TRACK_CONFIG.segmentLength);
        
        const fallbackParams: TrackSegmentParams = {
          startPosition: startPos,
          endPosition: endPos,
          startDirection: new THREE.Vector3(0, 0, -1),
          endDirection: new THREE.Vector3(0, 0, -1),
          controlPoints: [startPos.clone(), endPos.clone()],
          length: TRACK_CONFIG.segmentLength,
          width: TRACK_CONFIG.trackWidth,
          type: 'straight'
        };
        
        // Cache parameters
        segmentCache[i] = fallbackParams;
        
        // Create entity
        const segment = world.spawn(
          IsTrack,
          TrackSegment({
            index: i,
            length: TRACK_CONFIG.segmentLength,
            width: TRACK_CONFIG.trackWidth,
            type: 'straight',
            curvature: 0,
            elevation: 0,
            startPosition: startPos,
            endPosition: endPos,
            startDirection: new THREE.Vector3(0, 0, -1),
            endDirection: new THREE.Vector3(0, 0, -1),
            controlPoints: [startPos.clone(), endPos.clone()],
          }),
          Transform({
            position: startPos.clone(),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
          })
        );
        
        spawnedSegments[i] = segment;
        if (i > highestSegmentIndex) {
          highestSegmentIndex = i;
        }
        
        console.log(`Created emergency fallback segment ${i}`);
      }
    } catch (fallbackError) {
      console.error("Failed even with emergency fallback:", fallbackError);
    }
  }
  
  console.log("=================================================");
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
  
  console.log("Track state reset complete");
}

/**
 * Finds the segment index that contains the given position
 * @param position Position to check
 * @returns The index of the containing segment or -1 if not found
 */
function findContainingSegment(position: THREE.Vector3): number {
  // If no segments exist, return -1
  if (highestSegmentIndex < 0) {
    console.log("No segments exist yet");
    return -1;
  }
  
  // Simple check for all active segments
  for (let i = lowestActiveSegmentIndex; i <= highestSegmentIndex; i++) {
    const segmentParams = segmentCache[i];
    if (!segmentParams) continue;
    
    // Check if position is between start and end Z positions (primary direction)
    // Use a simplified bounding box check for now
    const minZ = Math.min(segmentParams.startPosition.z, segmentParams.endPosition.z);
    const maxZ = Math.max(segmentParams.startPosition.z, segmentParams.endPosition.z);
    const halfWidth = segmentParams.width / 2;
    
    // Basic bounds check (not accurate for curved segments but works for simple debugging)
    if (position.z >= minZ && position.z <= maxZ) {
      // The segments currently all run along the Z axis, so the X coordinate should be within
      // the track width from the segment's centerline
      const midPointX = (segmentParams.startPosition.x + segmentParams.endPosition.x) / 2;
      if (Math.abs(position.x - midPointX) <= halfWidth) {
        return i;
      }
    }
  }
  
  // If we get here, try to find the closest segment
  let closestIndex = -1;
  let closestDistance = Infinity;
  
  for (let i = lowestActiveSegmentIndex; i <= highestSegmentIndex; i++) {
    const segmentParams = segmentCache[i];
    if (!segmentParams) continue;
    
    // Just check distance to segment start and end
    const distStart = position.distanceTo(segmentParams.startPosition);
    const distEnd = position.distanceTo(segmentParams.endPosition);
    const minDist = Math.min(distStart, distEnd);
    
    if (minDist < closestDistance) {
      closestDistance = minDist;
      closestIndex = i;
    }
  }
  
  if (closestIndex >= 0) {
    console.log(`Player not in any segment bounds, closest is segment ${closestIndex} (dist: ${closestDistance.toFixed(1)})`);
  }
  
  return closestIndex;
}

/**
 * Updates track segments based on player position
 * @param world World instance
 */
export function updateTrackSegments(world: World): void {
  // First check if we have any segments
  const activeSegmentCount = Object.keys(spawnedSegments).length;
  
  // If no segments exist, spawn initial segments
  if (activeSegmentCount === 0) {
    console.log("No track segments exist, initializing track");
    spawnInitialTrack(world);
    return;
  }
  
  // Find the player entity
  const player = world.queryFirst(IsPlayer, Transform);
  if (!player) {
    console.log("No player found, skipping track update");
    return;
  }
  
  const playerTransform = player.get(Transform)!;
  const playerPosition = playerTransform.position;
  
  // Log player position periodically
  if (Math.random() < 0.01) { // Only log occasionally to avoid spam
    console.log(`Player position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
  }
  
  // Find which segment the player is currently in
  const currentSegmentIndex = findContainingSegment(playerPosition);
  
  // If player not found in any segment, use the closest or segment 0 as fallback
  if (currentSegmentIndex === -1) {
    console.log("Player not found in any segment, using segment 0 as fallback");
    
    // Generate at least 5 segments ahead
    for (let i = 0; i < 5; i++) {
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
  const removeThreshold = currentSegmentIndex - 3; // Keep at least 3 segments behind player
  if (removeThreshold > 0) {
    for (let i = lowestActiveSegmentIndex; i < removeThreshold; i++) {
      removeSegment(i);
    }
  }
} 