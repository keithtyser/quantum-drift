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
	// Reverse-specific stabilization
	reverseStabilization: {
		// Higher values create more stable but less responsive camera
		positionBufferStrength: 0.92,
		// How strongly to lock the camera angle during reverse
		rotationStabilization: 0.7
	}
};

// Position buffer for camera stabilization (persists between frames)
let lastStablePosition = new THREE.Vector3();
let lastStableRotation = new THREE.Euler();
let isStabilizing = false;

export const cameraFollowPlayer = (world: World) => {
	const player = world.queryFirst(IsPlayer, Transform, Movement);
	if (!player) return;

	const playerTransform = player.get(Transform)!;
	const playerMovement = player.get(Movement)!;

	// Calculate a speed factor (0-1) for dynamic adjustments
	const speed = playerMovement.velocity.length();
	const speedFactor = CAMERA_CONFIG.speedEffect.enabled 
		? Math.min(speed / CAMERA_CONFIG.speedEffect.maxSpeedReference, 1)
		: 0;

	// Calculate the desired camera position with speed adjustments
	const dynamicOffset = CAMERA_CONFIG.offset.clone();
	
	// Lower camera and pull it back at higher speeds
	dynamicOffset.y -= CAMERA_CONFIG.speedEffect.heightDecrease * speedFactor;
	dynamicOffset.z += CAMERA_CONFIG.speedEffect.distanceIncrease * speedFactor;

	// Calculate if we're in reverse by checking velocity direction relative to facing
	const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(playerTransform.rotation);
	const velocityNormalized = speed > 0.01 ? playerMovement.velocity.clone().normalize() : new THREE.Vector3();
	const reverseDotProduct = velocityNormalized.dot(forwardDir);
	
	// Define high-speed reverse conditions more precisely
	const movingBackward = reverseDotProduct < -0.5 && speed > 1;
	const highSpeedReverse = movingBackward && speed > 15;

	// Update stabilization state based on reverse speed
	if (highSpeedReverse && !isStabilizing) {
		// Start stabilization - initialize with current values
		lastStablePosition.copy(playerTransform.position);
		lastStableRotation.copy(playerTransform.rotation);
		isStabilizing = true;
	} else if (!highSpeedReverse && isStabilizing) {
		// Exit stabilization mode
		isStabilizing = false;
	}

	// Adjust offset for reversed movement to stabilize camera
	if (movingBackward) {
		// When reversing, move camera higher and further back for better visibility
		dynamicOffset.y += 0.8; // Increased from 0.5 for better visibility
		dynamicOffset.z += 3.0; // Increased from 2.0 for more stable view
	}

	const offsetRotated = dynamicOffset.clone().applyEuler(
		new THREE.Euler(
			0, // Keep camera level horizontally
			playerTransform.rotation.y * CAMERA_CONFIG.rotationInfluence,
			0 // Don't roll with the player
		)
	);

	world.query(IsCamera, Transform).updateEach(([cameraTransform]) => {
		// Calculate target position (standard approach)
		const standardTargetPosition = new THREE.Vector3().copy(playerTransform.position).add(offsetRotated);
		
		// Apply stabilization for high-speed reverse
		let targetPosition;
		
		if (isStabilizing) {
			// Update the stable position with weighted averaging
			// This creates a lag buffer that smooths out rapid position changes
			const bufferStrength = CAMERA_CONFIG.reverseStabilization.positionBufferStrength;
			
			// Smooth the player position first (not the final camera position)
			lastStablePosition.lerp(playerTransform.position, 1 - bufferStrength);
			
			// Calculate target based on the smoothed position
			targetPosition = new THREE.Vector3().copy(lastStablePosition).add(offsetRotated);
		} else {
			// Use standard position calculation for normal driving
			targetPosition = standardTargetPosition;
		}

		// Calculate look-at point
		const lookAtPoint = new THREE.Vector3()
			.copy(playerTransform.position)
			.add(forwardDir.clone().multiplyScalar(CAMERA_CONFIG.lookAheadDistance));

		// Calculate effective damping based on movement state
		const effectiveDamping = highSpeedReverse 
			? 0.3 // Use a fixed high damping value during high-speed reverse
			: movingBackward
				? Math.min(0.25, CAMERA_CONFIG.positionDamping * (1 + Math.abs(reverseDotProduct) * speed * 0.01))
				: CAMERA_CONFIG.positionDamping;
			
		// Apply position damping
		cameraTransform.position.lerp(targetPosition, effectiveDamping);

		// Calculate and apply camera rotation (standard approach)
		const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
			new THREE.Matrix4().lookAt(cameraTransform.position, lookAtPoint, new THREE.Vector3(0, 1, 0))
		);

		// Apply rotation with stabilization during reverse
		const currentQuat = new THREE.Quaternion().setFromEuler(cameraTransform.rotation);
		
		if (highSpeedReverse) {
			// During high-speed reverse, use stronger stabilization for rotation
			// This prevents the camera from rotating too much during reverse
			currentQuat.slerp(targetRotation, CAMERA_CONFIG.rotationDamping * 0.6);
		} else {
			// Normal rotation damping
			currentQuat.slerp(targetRotation, CAMERA_CONFIG.rotationDamping);
		}
		
		cameraTransform.rotation.setFromQuaternion(currentQuat);

		// Ensure camera stays within distance limits
		const distanceToPlayer = cameraTransform.position.distanceTo(playerTransform.position);
		if (distanceToPlayer < CAMERA_CONFIG.minDistance || distanceToPlayer > CAMERA_CONFIG.maxDistance) {
			const idealDistance = THREE.MathUtils.clamp(
				distanceToPlayer,
				CAMERA_CONFIG.minDistance,
				CAMERA_CONFIG.maxDistance
			);
			const direction = cameraTransform.position
				.clone()
				.sub(playerTransform.position)
				.normalize()
				.multiplyScalar(idealDistance);
			cameraTransform.position.copy(playerTransform.position).add(direction);
		}
		
		// Keep the camera above ground level
		if (cameraTransform.position.y < 1.5) {
			cameraTransform.position.y = 1.5;
		}
	});
};
