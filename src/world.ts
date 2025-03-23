import { createWorld } from 'koota';
import { SpatialHashMap, Time } from './traits';
import { actions } from './actions';

// Create the world instance
export const world = createWorld(Time, SpatialHashMap);

// Track initialization state
let worldInitialized = false;

// Initialize the world with core entities - this runs once at application startup
export function initializeWorld(initialCameraPosition: [number, number, number] = [0, 5, 10]) {
  // Only initialize once
  if (worldInitialized) {
    console.log("World already initialized, skipping");
    return;
  }

  console.log("==========================================");
  console.log("         WORLD INITIALIZATION             ");
  console.log("==========================================");

  // Create the actions object with the world
  const gameActions = actions(world);
  
  // Create procedural track
  console.log("Spawning procedural track");
  const trackEntity = gameActions.spawnTrack();
  console.log(`Track entity spawned: ${trackEntity?.id}`);
  
  // Camera position debugging
  console.log(`Spawning camera at position: (${initialCameraPosition[0]}, ${initialCameraPosition[1]}, ${initialCameraPosition[2]})`);
  
  // Spawn camera using the actions API
  const cameraEntity = gameActions.spawnCamera(initialCameraPosition);
  console.log(`Camera spawned: ${cameraEntity?.id}`);
  
  // Spawn player using the actions API
  console.log("Spawning player entity");
  const playerEntity = gameActions.spawnPlayer();
  console.log(`Player spawned: ${playerEntity?.id}`);
  
  if (!playerEntity) {
    console.error("Failed to create player entity");
    throw new Error("Player entity creation failed");
  }

  // Mark as initialized
  worldInitialized = true;
  console.log("World initialization complete");
  console.log("==========================================");
}

// Export function to check if world is initialized
export function isWorldInitialized() {
  return worldInitialized;
}
