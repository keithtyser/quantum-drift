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
	positionDamping: 0.04, // Slower for smoother camera
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
	reverseOffset: new THREE.Vector3(0, 4, -5), // Position camera in front when reversing
	reverseLookAtDistance: 5, // Look behind the player when reversing
	reverseThreshold: -1.0 // Speed below which we consider the player to be reversing
};

export const cameraFollowPlayer = (world: World) => {
	const player = world.queryFirst(IsPlayer, Transform, Movement);
	if (!player) return;

	const playerTransform = player.get(Transform)!;
	const playerMovement = player.get(Movement)!;

	// Calculate velocity direction relative to forward direction
	const playerForwardDir = new THREE.Vector3(0, 0, -1).applyEuler(playerTransform.rotation);
	const velocityNormalized = playerMovement.velocity.clone().normalize();
	const movingForward = velocityNormalized.dot(playerForwardDir) >= CAMERA_CONFIG.reverseThreshold;
	
	// Calculate a speed factor (0-1) for dynamic adjustments
	const speed = playerMovement.velocity.length();
	const speedFactor = CAMERA_CONFIG.speedEffect.enabled 
		? Math.min(speed / CAMERA_CONFIG.speedEffect.maxSpeedReference, 1)
		: 0;

	// Choose appropriate offset based on movement direction
	const baseOffset = movingForward ? 
		CAMERA_CONFIG.offset.clone() : 
		CAMERA_CONFIG.reverseOffset.clone();
	
	// Calculate the desired camera position with speed adjustments
	const dynamicOffset = baseOffset.clone();
	
	// Apply speed effects if moving forward
	if (movingForward) {
		// Lower camera and pull it back at higher speeds
		dynamicOffset.y -= CAMERA_CONFIG.speedEffect.heightDecrease * speedFactor;
		dynamicOffset.z += CAMERA_CONFIG.speedEffect.distanceIncrease * speedFactor;
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

		// Calculate look-at point based on movement direction
		const lookDistance = movingForward ? 
			CAMERA_CONFIG.lookAheadDistance : 
			CAMERA_CONFIG.reverseLookAtDistance;
			
		const lookAtPoint = new THREE.Vector3()
			.copy(playerTransform.position)
			.add(playerForwardDir.clone().multiplyScalar(lookDistance));

		// Smoothly move camera position
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
