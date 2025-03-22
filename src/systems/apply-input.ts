import { World } from 'koota';
import { Input, Movement, Time, Transform } from '../traits';
import * as THREE from 'three';

const MOUSE_SENSITIVITY = 0.004; // Maintained for optional mouse control
const STEERING_SENSITIVITY = 2.0; // New sensitivity for keyboard steering
const GRAVITY = new THREE.Vector3(0, -9.81, 0); // Gravity force
const GROUND_LEVEL = 0.5; // Height of vehicle from ground
const GROUND_FRICTION = 0.02; // Friction when on ground
const REVERSE_SPEED_THRESHOLD = 0.2; // Speed threshold for applying reverse thrust

/**
 * convertInputToMovement:
 * Applies vehicle-like controls for racing on a track
 */
export function convertInputToMovement(world: World) {
	const { delta } = world.get(Time)!;

	world.query(Input, Transform, Movement).updateEach(([input, transform, movement]) => {
		const { velocity, thrust, force } = movement;
		
		// Calculate current speed
		const speed = velocity.length();
		
		// 1. Apply steering primarily from strafe input (A/D keys or left/right arrows)
		// Steering effect scales with speed for more realistic feel
		const steeringFactor = Math.min(1, speed / 5);
		
		if (input.strafe !== 0) {
			// Use strafe input for main steering
			const steeringAmount = input.strafe * STEERING_SENSITIVITY * delta * steeringFactor;
			transform.rotation.y -= steeringAmount;
		} else if (input.mouseDelta.x !== 0) {
			// Fallback to mouse steering if no keyboard input
			const mouseSteeringAmount = input.mouseDelta.x * MOUSE_SENSITIVITY * steeringFactor;
			transform.rotation.y -= mouseSteeringAmount;
		}
		
		// Keep vehicle level with the ground (minimal pitch and roll)
		transform.rotation.x *= 0.9; // Gradually level pitch
		transform.rotation.z *= 0.9; // Gradually level roll
		
		// 2. Compute forward direction
		const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(transform.rotation);
		
		// 3. Handle forward and reverse movement
		if (input.forward > 0) {
			// Forward thrust
			const throttleForce = forwardDir.clone().multiplyScalar(input.forward * thrust * delta);
			force.add(throttleForce);
		}
		
		// 4. Handle braking and reverse
		if (input.brake) {
			if (speed > REVERSE_SPEED_THRESHOLD) {
				// Apply braking when moving
				const brakeForce = velocity.clone().normalize().negate().multiplyScalar(thrust * 1.5 * delta);
				force.add(brakeForce);
			} else {
				// Apply reverse thrust when nearly stopped
				const reverseForce = forwardDir.clone().multiplyScalar(-thrust * delta);
				force.add(reverseForce);
			}
		}
		
		// 5. Apply ground contact and friction
		// Check if on ground (simple implementation)
		if (transform.position.y <= GROUND_LEVEL) {
			// Keep vehicle at ground level
			transform.position.y = GROUND_LEVEL;
			
			// Apply ground friction (only to XZ plane)
			const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
			const frictionForce = horizontalVelocity.clone().negate().multiplyScalar(GROUND_FRICTION);
			velocity.add(frictionForce);
			
			// Apply additional turning force for sharper cornering
			if (input.strafe !== 0 && speed > 0.5) {
				// Calculate steering force perpendicular to direction of travel
				const steeringDir = new THREE.Vector3(forwardDir.z, 0, -forwardDir.x);
				const turnForce = steeringDir.clone().multiplyScalar(input.strafe * 0.5 * delta * speed);
				velocity.add(turnForce);
			}
		} else {
			// Apply gravity when in air
			velocity.add(GRAVITY.clone().multiplyScalar(delta));
		}
		
		// 6. Apply boost
		if (input.boost) {
			const boostForce = forwardDir.clone().multiplyScalar(thrust * 2 * delta);
			force.add(boostForce);
		}
	});
}
