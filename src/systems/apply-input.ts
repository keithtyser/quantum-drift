import { World } from 'koota';
import { Input, Movement, Time, Transform } from '../traits';
import * as THREE from 'three';

const MOUSE_SENSITIVITY = 0.004; // Maintained for optional mouse control
const STEERING_SENSITIVITY = 2.0; // New sensitivity for keyboard steering
const GRAVITY = new THREE.Vector3(0, -9.81, 0); // Gravity force
const GROUND_LEVEL = 0.5; // Height of vehicle from ground
const GROUND_FRICTION = 0.02; // Friction when on ground
const REVERSE_SPEED_THRESHOLD = 0.5; // Threshold for applying reverse thrust
const REVERSE_THRUST_MULTIPLIER = 2.0; // Strong reverse thrust for fast backwards movement
const FORWARD_THRUST_MULTIPLIER = 2.5; // Increased forward thrust for faster forward movement
const BRAKE_FORCE_MULTIPLIER = 1.5; // How much stronger braking is than regular thrust

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
		
		// Calculate vehicle's current travel direction relative to its facing
		const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(transform.rotation);
		const velocityNormalized = speed > 0.01 ? velocity.clone().normalize() : new THREE.Vector3();
		const movingForward = velocityNormalized.dot(forwardDir) > 0;
		
		// Apply steering (A/D keys or left/right arrows)
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
		
		// Handle forward movement
		if (input.forward > 0) {
			// Forward thrust with multiplier for faster movement
			const throttleForce = forwardDir.clone().multiplyScalar(input.forward * thrust * FORWARD_THRUST_MULTIPLIER * delta);
			force.add(throttleForce);
		}
		
		// Handle braking and reverse
		if (input.brake) {
			if (speed > REVERSE_SPEED_THRESHOLD && movingForward) {
				// Apply braking when moving forward at decent speed
				const brakeForce = velocity.clone().normalize().negate().multiplyScalar(thrust * BRAKE_FORCE_MULTIPLIER * delta);
				force.add(brakeForce);
			} else {
				// Apply reverse thrust - simplified to a single approach regardless of speed
				// This mimics how forward movement works - just a single continuous thrust
				
				// Basic reverse thrust applied as a force - similar to forward movement
				const reverseForce = forwardDir.clone().multiplyScalar(-thrust * REVERSE_THRUST_MULTIPLIER * delta);
				force.add(reverseForce);
				
				// Reduce friction during reverse to maintain high speeds
				if (transform.position.y <= GROUND_LEVEL) {
					const frictionMultiplier = 0.01; // Very low friction during reverse
					const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
					const frictionForce = horizontalVelocity.clone().negate().multiplyScalar(GROUND_FRICTION * frictionMultiplier);
					velocity.add(frictionForce);
				}
			}
		} else if (transform.position.y <= GROUND_LEVEL) {
			// Apply normal ground contact and friction when not braking
			
			// Keep vehicle at ground level
			transform.position.y = GROUND_LEVEL;
			
			// Apply normal ground friction (only to XZ plane)
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
		
		// Apply boost
		if (input.boost) {
			const boostForce = forwardDir.clone().multiplyScalar(thrust * 2 * delta);
			force.add(boostForce);
		}
	});
}
