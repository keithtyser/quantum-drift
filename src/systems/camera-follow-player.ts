import { World } from 'koota';
import { IsCamera, IsPlayer, Transform, Movement, Input } from '../traits';
import * as THREE from 'three';

// Camera configuration for racing game feel
const CAMERA_CONFIG = {
	// Base offset from player (higher and further back for racing)
	offset: new THREE.Vector3(0, 3, 10),
	// How far the camera looks ahead of the player's movement
	lookAheadDistance: 15,
	// How much the camera rotates with the player
	rotationInfluence: 0.85,
	// Damping factors for smooth transitions
	positionDamping: 0.1, // Increased from 0.04 for smoother camera during high speed changes
	rotationDamping: 0.05, // Slower for smoother rotation
	// Limits for camera movement
	minDistance: 7,
	maxDistance: 15,
	// Dynamic camera adjustments based on speed
	speedEffect: {
		enabled: true,
		// How much to lower camera as speed increases
		heightDecrease: 0.6,
		// How much to pull camera back as speed increases
		distanceIncrease: 2.5,
		// How much to increase FOV with speed (handled in component)
		fovIncrease: 10,
		// Maximum speed to use for calculations
		maxSpeedReference: 30
	},
	// Reverse camera settings
	reverse: {
		// Fixed offset during high-speed reverse (higher and further back)
		offset: new THREE.Vector3(0, 5, 15),
		// High-speed threshold for fixed camera mode
		highSpeedThreshold: 15,
		// Transition smoothness between normal and fixed camera (higher = smoother)
		transitionSmoothing: 0.95
	}
};

// State variables for camera transitions (persist between frames)
let fixedReverseMode = false;
let fixedCameraPosition = new THREE.Vector3();
let fixedCameraRotation = new THREE.Quaternion();
let fixedModeStrength = 0; // 0 = normal camera, 1 = fully fixed camera

export const cameraFollowPlayer = (world: World) => {
	const player = world.queryFirst(IsPlayer, Transform, Movement);
	if (!player) return;

	const playerTransform = player.get(Transform)!;
	const playerMovement = player.get(Movement)!;

	// Calculate speed and direction
	const speed = playerMovement.velocity.length();
	const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(playerTransform.rotation);
	const velocityNormalized = speed > 0.01 ? playerMovement.velocity.clone().normalize() : new THREE.Vector3();
	const dotProduct = velocityNormalized.dot(forwardDir);
	
	// Detect if we're moving backward and at high speed
	const isReversing = dotProduct < -0.5 && speed > 1.0;
	const isHighSpeedReverse = isReversing && speed > CAMERA_CONFIG.reverse.highSpeedThreshold;
	
	// Update fixed reverse mode state with smooth transitions
	if (isHighSpeedReverse && fixedModeStrength < 1.0) {
		// Gradually transition into fixed mode
		fixedModeStrength = Math.min(1.0, fixedModeStrength + 0.05);
		
		if (!fixedReverseMode) {
			// Initialize fixed camera mode
			fixedReverseMode = true;
			
			// Initialize the fixed camera position based on current position and orientation
			const fixedOffset = CAMERA_CONFIG.reverse.offset.clone().applyEuler(
				new THREE.Euler(0, playerTransform.rotation.y, 0)
			);
			
			fixedCameraPosition.copy(playerTransform.position).add(fixedOffset);
			
			// Initialize fixed camera rotation looking at player
			const lookDir = new THREE.Vector3().subVectors(playerTransform.position, fixedCameraPosition).normalize();
			const lookMatrix = new THREE.Matrix4().lookAt(
				fixedCameraPosition, 
				playerTransform.position, 
				new THREE.Vector3(0, 1, 0)
			);
			fixedCameraRotation.setFromRotationMatrix(lookMatrix);
		}
	} else if (!isHighSpeedReverse && fixedModeStrength > 0) {
		// Gradually transition out of fixed mode
		fixedModeStrength = Math.max(0, fixedModeStrength - 0.05);
		
		if (fixedModeStrength === 0) {
			fixedReverseMode = false;
		}
	}
	
	// Calculate standard (non-fixed) camera parameters
	const speedFactor = CAMERA_CONFIG.speedEffect.enabled 
		? Math.min(speed / CAMERA_CONFIG.speedEffect.maxSpeedReference, 1)
		: 0;
		
	const dynamicOffset = CAMERA_CONFIG.offset.clone();
	dynamicOffset.y -= CAMERA_CONFIG.speedEffect.heightDecrease * speedFactor;
	dynamicOffset.z += CAMERA_CONFIG.speedEffect.distanceIncrease * speedFactor;
	
	// Slightly adjust standard offset during normal reverse (non-high-speed)
	if (isReversing && !isHighSpeedReverse) {
		dynamicOffset.y += 1.0;
		dynamicOffset.z += 1.5;
	}
	
	// Apply the rotated offset for standard camera positioning
	const offsetRotated = dynamicOffset.clone().applyEuler(
		new THREE.Euler(0, playerTransform.rotation.y * CAMERA_CONFIG.rotationInfluence, 0)
	);
	
	world.query(IsCamera, Transform).updateEach(([cameraTransform]) => {
		// For fixed reverse mode, update the fixed camera position relative to player
		if (fixedReverseMode) {
			// Calculate new fixed camera position based on player's current position and rotation
			const fixedOffset = CAMERA_CONFIG.reverse.offset.clone().applyEuler(
				new THREE.Euler(0, playerTransform.rotation.y, 0)
			);
			
			// Update fixed position with heavy smoothing to prevent any shake
			const newFixedPosition = new THREE.Vector3().copy(playerTransform.position).add(fixedOffset);
			fixedCameraPosition.lerp(newFixedPosition, 1 - CAMERA_CONFIG.reverse.transitionSmoothing);
			
			// Update fixed rotation to always look at player
			const targetLookAt = new THREE.Quaternion().setFromRotationMatrix(
				new THREE.Matrix4().lookAt(
					fixedCameraPosition,
					playerTransform.position,
					new THREE.Vector3(0, 1, 0)
				)
			);
			
			// Smooth rotation updates to prevent jerky camera movements
			fixedCameraRotation.slerp(targetLookAt, 0.03);
		}
		
		// Calculate standard camera position (used for non-reverse or transitions)
		const standardPosition = new THREE.Vector3().copy(playerTransform.position).add(offsetRotated);
		
		// Calculate standard look-at point
		const standardLookPoint = new THREE.Vector3()
			.copy(playerTransform.position)
			.add(forwardDir.clone().multiplyScalar(CAMERA_CONFIG.lookAheadDistance));
			
		// Blend between standard and fixed camera based on fixedModeStrength
		if (fixedModeStrength > 0) {
			// Blend position
			cameraTransform.position.copy(standardPosition)
				.lerp(fixedCameraPosition, fixedModeStrength);
			
			// Calculate standard rotation
			const standardRotation = new THREE.Quaternion().setFromRotationMatrix(
				new THREE.Matrix4().lookAt(
					cameraTransform.position,
					standardLookPoint,
					new THREE.Vector3(0, 1, 0)
				)
			);
			
			// Blend rotation using quaternion slerp
			const blendedRotation = new THREE.Quaternion().copy(standardRotation)
				.slerp(fixedCameraRotation, fixedModeStrength);
			
			// Apply blended rotation
			cameraTransform.rotation.setFromQuaternion(blendedRotation);
		} else {
			// Normal camera behavior for non-reverse or low-speed reverse
			// Standard position with damping
			cameraTransform.position.lerp(standardPosition, CAMERA_CONFIG.positionDamping);
			
			// Standard rotation with damping
			const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
				new THREE.Matrix4().lookAt(
					cameraTransform.position, 
					standardLookPoint,
					new THREE.Vector3(0, 1, 0)
				)
			);
			
			const currentQuat = new THREE.Quaternion().setFromEuler(cameraTransform.rotation);
			currentQuat.slerp(targetRotation, CAMERA_CONFIG.rotationDamping);
			cameraTransform.rotation.setFromQuaternion(currentQuat);
		}
		
		// Apply constraints
		// Keep camera above ground level
		if (cameraTransform.position.y < 1.5) {
			cameraTransform.position.y = 1.5;
		}
	});
};
