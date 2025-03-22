import { World } from 'koota';
import { IsCamera, IsPlayer, Transform, Movement } from '../traits';
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
	positionDamping: 0.03, // Slower for smoother camera
	rotationDamping: 0.04, // Slower for smoother rotation
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
	reverseOffset: new THREE.Vector3(0, 4, -5), // Position camera in front when reversing
	reverseLookAtDistance: 5, // Look behind the player when reversing
	reverseThreshold: -0.2, // Made more lenient to prevent rapid switching
	// Direction transitioning (to prevent sudden camera jumps)
	directionChangeSpeed: 0.05 // How quickly camera transitions between forward/reverse positions
};

// Keep track of camera direction state between frames
const cameraState = {
	isMovingForward: true, // Start assuming forward movement
	forwardAmount: 1.0, // 1.0 = fully forward camera, 0.0 = fully reverse camera
};

export const cameraFollowPlayer = (world: World) => {
	const player = world.queryFirst(IsPlayer, Transform, Movement);
	if (!player) return;

	const playerTransform = player.get(Transform)!;
	const playerMovement = player.get(Movement)!;

	// Calculate velocity direction relative to forward direction
	const playerForwardDir = new THREE.Vector3(0, 0, -1).applyEuler(playerTransform.rotation);
	const velocity = playerMovement.velocity;
	
	// Only consider significant movements to avoid camera jitter at very low speeds
	const speed = velocity.length();
	const minSpeedForDirectionChange = 0.5;
	
	// Determine movement direction with better stability
	let movingForward = cameraState.isMovingForward; // Default to previous state
	
	if (speed > minSpeedForDirectionChange) {
		const velocityNormalized = velocity.clone().normalize();
		const forwardnessFactor = velocityNormalized.dot(playerForwardDir);
		
		// Use threshold to determine general direction
		movingForward = forwardnessFactor >= CAMERA_CONFIG.reverseThreshold;
		cameraState.isMovingForward = movingForward;
	}
	
	// Smoothly transition between forward and reverse camera positions
	if (movingForward && cameraState.forwardAmount < 1.0) {
		cameraState.forwardAmount += CAMERA_CONFIG.directionChangeSpeed;
		if (cameraState.forwardAmount > 1.0) cameraState.forwardAmount = 1.0;
	} else if (!movingForward && cameraState.forwardAmount > 0.0) {
		cameraState.forwardAmount -= CAMERA_CONFIG.directionChangeSpeed;
		if (cameraState.forwardAmount < 0.0) cameraState.forwardAmount = 0.0;
	}
	
	// Calculate a speed factor (0-1) for dynamic adjustments
	const speedFactor = CAMERA_CONFIG.speedEffect.enabled 
		? Math.min(speed / CAMERA_CONFIG.speedEffect.maxSpeedReference, 1)
		: 0;

	// Blend between forward and reverse offsets based on transition amount
	const forwardOffset = CAMERA_CONFIG.offset.clone();
	const reverseOffset = CAMERA_CONFIG.reverseOffset.clone();
	const blendedOffset = new THREE.Vector3().lerpVectors(
		reverseOffset,
		forwardOffset,
		cameraState.forwardAmount
	);
	
	// Calculate the desired camera position with speed adjustments
	const dynamicOffset = blendedOffset.clone();
	
	// Apply speed effects (only when significantly in forward mode)
	if (cameraState.forwardAmount > 0.7) {
		// Lower camera and pull it back at higher speeds
		dynamicOffset.y -= CAMERA_CONFIG.speedEffect.heightDecrease * speedFactor * cameraState.forwardAmount;
		dynamicOffset.z += CAMERA_CONFIG.speedEffect.distanceIncrease * speedFactor * cameraState.forwardAmount;
	}

	const offsetRotated = dynamicOffset.clone().applyEuler(
		new THREE.Euler(
			0, // Keep camera level horizontally
			playerTransform.rotation.y * CAMERA_CONFIG.rotationInfluence,
			0 // Don't roll with the player
		)
	);

	world.query(IsCamera, Transform).updateEach(([cameraTransform]) => {
		// Calculate target position
		const targetPosition = new THREE.Vector3().copy(playerTransform.position).add(offsetRotated);

		// Blend between forward and reverse look distances
		const lookDistance = THREE.MathUtils.lerp(
			CAMERA_CONFIG.reverseLookAtDistance,
			CAMERA_CONFIG.lookAheadDistance,
			cameraState.forwardAmount
		);
			
		const lookAtPoint = new THREE.Vector3()
			.copy(playerTransform.position)
			.add(playerForwardDir.clone().multiplyScalar(lookDistance));

		// Smoothly move camera position with appropriate damping
		cameraTransform.position.lerp(targetPosition, CAMERA_CONFIG.positionDamping);

		// Calculate and apply camera rotation
		const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
			new THREE.Matrix4().lookAt(cameraTransform.position, lookAtPoint, new THREE.Vector3(0, 1, 0))
		);

		// Apply smooth rotation using quaternion slerp
		const currentQuat = new THREE.Quaternion().setFromEuler(cameraTransform.rotation);
		currentQuat.slerp(targetRotation, CAMERA_CONFIG.rotationDamping);
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
