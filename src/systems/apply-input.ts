import { World } from 'koota';
import { Input, Movement, Time, Transform } from '../traits';
import * as THREE from 'three';

const MOUSE_SENSITIVITY = 0.004; // Maintained for optional mouse control
const STEERING_SENSITIVITY = 2.0; // New sensitivity for keyboard steering
const GRAVITY = new THREE.Vector3(0, -9.81, 0); // Gravity force
const GROUND_LEVEL = 0.5; // Height of vehicle from ground
const GROUND_FRICTION = 0.02; // Friction when on ground
const REVERSE_SPEED_THRESHOLD = 0.5; // Increased threshold for applying reverse thrust
const REVERSE_THRUST_MULTIPLIER = 100.0; // Extremely strong reverse thrust for much faster backwards movement
const BRAKE_FORCE_MULTIPLIER = 1.5; // How much stronger braking is than regular thrust

// Used to limit the maximum acceleration rate during high-speed reverse
const MAX_REVERSE_ACCELERATION = 1.0;

// Previous velocity for acceleration limiting (persists between frames)
let prevVelocity = new THREE.Vector3();
let isFirstFrame = true;

/**
 * convertInputToMovement:
 * Applies vehicle-like controls for racing on a track
 */
export function convertInputToMovement(world: World) {
	const { delta } = world.get(Time)!;

	world.query(Input, Transform, Movement).updateEach(([input, transform, movement]) => {
		const { velocity, thrust, force } = movement;
		
		// Save initial velocity for this frame
		const initialVelocity = velocity.clone();
		
		// Calculate current speed
		const speed = velocity.length();
		
		// Calculate vehicle's current travel direction relative to its facing
		const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(transform.rotation);
		const velocityNormalized = speed > 0.01 ? velocity.clone().normalize() : new THREE.Vector3();
		const movingForward = velocityNormalized.dot(forwardDir) > 0;
		
		// Check if we're in high-speed reverse
		const isHighSpeedReverse = speed > 15 && velocityNormalized.dot(forwardDir) < -0.5;
		
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
		
		// 3. Handle forward movement
		if (input.forward > 0) {
			// Forward thrust
			const throttleForce = forwardDir.clone().multiplyScalar(input.forward * thrust * delta);
			force.add(throttleForce);
		}
		
		// 4. Handle braking and reverse
		if (input.brake) {
			if (speed > REVERSE_SPEED_THRESHOLD) {
				// Apply braking when moving at decent speed - stronger proportional to current speed
				const brakeForce = velocity.clone().normalize().negate().multiplyScalar(thrust * BRAKE_FORCE_MULTIPLIER * delta);
				force.add(brakeForce);
			} else if (speed <= REVERSE_SPEED_THRESHOLD) {
				// Create a single unified reverse force that applies differently based on speed
				const baseReverseForce = forwardDir.clone().multiplyScalar(-thrust * delta);
				
				if (isHighSpeedReverse) {
					// For high-speed reverse, use steady force application to maintain speed
					// This creates a more stable and predictable reverse motion for the camera
					force.add(baseReverseForce.multiplyScalar(REVERSE_THRUST_MULTIPLIER * 0.5));
				} else if (speed > 5) {
					// Medium speed reverse - transitional behavior
					// Apply moderate force plus some direct velocity change
					force.add(baseReverseForce.multiplyScalar(REVERSE_THRUST_MULTIPLIER * 0.7));
					velocity.addScaledVector(forwardDir, -thrust * delta * 0.5);
				} else {
					// Low speed or starting reverse - apply full force for responsive acceleration
					force.add(baseReverseForce.multiplyScalar(REVERSE_THRUST_MULTIPLIER));
					
					// Apply direct velocity change for immediate response at low speeds
					velocity.addScaledVector(forwardDir, -thrust * delta * 1.5);
					
					// Apply kickstart boost only when starting from nearly stopped
					if (speed < 0.1) {
						velocity.addScaledVector(forwardDir, -thrust * delta * 3.0);
					}
				}
				
				// Eliminate friction during reverse
				if (transform.position.y <= GROUND_LEVEL) {
					const frictionMultiplier = 0.02; // Extremely low friction during reverse
					const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
					const frictionForce = horizontalVelocity.clone().negate().multiplyScalar(GROUND_FRICTION * frictionMultiplier);
					velocity.add(frictionForce);
				}
			}
		} else {
			// 5. Apply normal ground contact and friction when not braking
			if (transform.position.y <= GROUND_LEVEL) {
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
		}
		
		// 6. Apply boost
		if (input.boost) {
			const boostForce = forwardDir.clone().multiplyScalar(thrust * 2 * delta);
			force.add(boostForce);
		}
		
		// 7. Limit maximum acceleration during high-speed reverse
		if (isHighSpeedReverse && !isFirstFrame) {
			// Calculate acceleration (velocity change) for this frame
			const velChange = new THREE.Vector3().subVectors(velocity, prevVelocity);
			const acceleration = velChange.length() / delta;
			
			// If acceleration exceeds our limit, scale it down
			if (acceleration > MAX_REVERSE_ACCELERATION) {
				const scaleFactor = MAX_REVERSE_ACCELERATION / acceleration;
				
				// Adjust velocity to limit acceleration
				velocity.copy(prevVelocity).addScaledVector(velChange, scaleFactor);
			}
		}
		
		// Save velocity for next frame's acceleration calculation
		prevVelocity.copy(velocity);
		isFirstFrame = false;
	});
}
