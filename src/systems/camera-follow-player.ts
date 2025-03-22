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
	}
};

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
	const movingBackward = reverseDotProduct < -0.5 && speed > 1;

	// Adjust offset for reversed movement to stabilize camera
	if (movingBackward) {
		// When reversing, move camera slightly higher and further back for stability
		// This prevents the camera from getting too close to the vehicle during high-speed reversing
		dynamicOffset.y += 0.5; // Raise camera a bit higher when reversing
		dynamicOffset.z += 2.0; // Pull camera back more when reversing
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

		// Calculate look-at point (ahead of the player)
		const playerForwardDir = new THREE.Vector3(0, 0, -1).applyEuler(playerTransform.rotation);
		const lookAtPoint = new THREE.Vector3()
			.copy(playerTransform.position)
			.add(playerForwardDir.clone().multiplyScalar(CAMERA_CONFIG.lookAheadDistance));

		// Increase damping during high-speed reverse to reduce camera shake
		// Higher damping = more responsive camera that follows more directly
		// For very high reverse speeds, use an even higher damping value for stability
		const effectiveDamping = movingBackward 
			? Math.min(0.25, CAMERA_CONFIG.positionDamping * (1 + Math.abs(reverseDotProduct) * speed * 0.01))
			: CAMERA_CONFIG.positionDamping;
			
		// Smoothly move camera position with calculated damping value
		cameraTransform.position.lerp(targetPosition, effectiveDamping);

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
