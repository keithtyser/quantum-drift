import { World } from 'koota';
import { IsPlayer, Transform, Movement, Input } from '../traits';
import * as THREE from 'three';

/**
 * PlayerController system
 * 
 * Handles player movement mechanics, physics, and advanced control features.
 * Works alongside the input and movement systems to provide responsive vehicle controls.
 */
export function PlayerController(world: World) {
  // Get the player entity
  const player = world.queryFirst(IsPlayer, Transform, Movement, Input);
  if (!player) return;
  
  const transform = player.get(Transform)!;
  const movement = player.get(Movement)!;
  const input = player.get(Input)!;
  
  // Vehicle physics constants
  const GRAVITY = 9.81;
  const GROUND_HEIGHT = 0.5;
  const TILT_FACTOR = 0.1;
  const SUSPENSION_FACTOR = 0.1;
  
  // Apply gravity if above ground
  if (transform.position.y > GROUND_HEIGHT) {
    movement.force.y -= GRAVITY;
  } else {
    // Ground collision response
    transform.position.y = GROUND_HEIGHT;
    movement.velocity.y = 0;
    
    // Apply ground friction
    if (movement.velocity.length() > 0.05) {
      // Add more friction when braking
      const frictionMultiplier = input.brake ? 3.0 : 1.0;
      const friction = 0.98 - (0.02 * frictionMultiplier);
      movement.velocity.multiplyScalar(friction);
    } else if (movement.velocity.length() <= 0.05) {
      // Stop completely below threshold to prevent sliding
      movement.velocity.set(0, 0, 0);
    }
  }
  
  // Apply vehicle tilt based on turning (visual effect)
  const steeringTilt = -input.strafe * TILT_FACTOR;
  transform.rotation.z = THREE.MathUtils.lerp(transform.rotation.z, steeringTilt, 0.1);
  
  // Apply suspension effect (bounce)
  const speed = movement.velocity.length();
  if (speed > 1.0 && Math.random() > 0.9) {
    const bumpHeight = Math.random() * SUSPENSION_FACTOR * speed * 0.05;
    transform.position.y += bumpHeight;
  }
  
  // Debug info (every 60 frames or so)
  if (Math.random() > 0.98) {
    console.log('Player stats:', {
      position: transform.position.toArray().map(v => v.toFixed(2)),
      velocity: movement.velocity.length().toFixed(2),
      height: transform.position.y.toFixed(2)
    });
  }
} 