import { World } from 'koota';
import { IsCamera, IsPlayer, Transform, Movement, Input } from '../traits';
import * as THREE from 'three';

// Camera configuration for racing game feel
const CAMERA_CONFIG = {
	// Base offset from player (higher and further back for racing)
	offset: new THREE.Vector3(0, 3.5, 12),
	// How far the camera looks ahead of the player's movement
	lookAheadDistance: 15,
	// How much the camera rotates with the player
	rotationInfluence: 0.95,
	// Damping factors for smooth transitions (higher = more responsive)
	positionDamping: 0.07,
	rotationDamping: 0.05,
	// Min/max distance for camera from player
	minDistance: 8,
	maxDistance: 16,
	// Dynamic camera adjustments based on speed
	speedEffect: {
		enabled: true,
		// How much to lower camera as speed increases
		heightDecrease: 0.5,
		// How much to pull camera back as speed increases
		distanceIncrease: 3.0,
		// How much to increase FOV with speed (handled in component)
		fovIncrease: 10,
		// Maximum speed to use for calculations
		maxSpeedReference: 30
	}
};

// For tracking previous positions (smoothing)
let previousTargetPosition = new THREE.Vector3();
let isFirstFrame = true;

export const cameraFollowPlayer = (world: World) => {
	const player = world.queryFirst(IsPlayer, Transform, Movement);
	if (!player) return;

	const playerTransform = player.get(Transform)!;
	const playerMovement = player.get(Movement)!;
	
	// Calculate speed
	const speed = playerMovement.velocity.length();
	
	// Get player's forward direction and velocity direction
	const playerForwardDir = new THREE.Vector3(0, 0, -1).applyEuler(playerTransform.rotation);
	
	// Calculate the speed factor for dynamic adjustments (0-1)
	const speedFactor = CAMERA_CONFIG.speedEffect.enabled 
		? Math.min(speed / CAMERA_CONFIG.speedEffect.maxSpeedReference, 1)
		: 0;

	// Calculate the camera offset - adjusting based on speed
	const dynamicOffset = CAMERA_CONFIG.offset.clone();
	
	// Lower camera and pull it back at higher speeds
	dynamicOffset.y -= CAMERA_CONFIG.speedEffect.heightDecrease * speedFactor;
	dynamicOffset.z += CAMERA_CONFIG.speedEffect.distanceIncrease * speedFactor;
	
	// Apply player's rotation to the offset to get the world-space offset
	const offsetRotated = dynamicOffset.clone().applyEuler(
		new THREE.Euler(0, playerTransform.rotation.y, 0)
	);
	
	// Calculate the target camera position by adding offset to player position
	const targetPosition = new THREE.Vector3().copy(playerTransform.position).add(offsetRotated);
	
	world.query(IsCamera, Transform).updateEach(([cameraTransform]) => {
		// Initialize previous position on first frame
		if (isFirstFrame) {
			previousTargetPosition.copy(targetPosition);
			isFirstFrame = false;
		}
		
		// Slightly smooth the target position to reduce micro-jitters
		// This applies a subtle smoothing to ALL camera movement for stability
		previousTargetPosition.lerp(targetPosition, 0.5);
		
		// Apply camera position with appropriate damping
		cameraTransform.position.lerp(previousTargetPosition, CAMERA_CONFIG.positionDamping);
		
		// Calculate look-at point - always ahead of the player's forward direction
		const lookAtPoint = new THREE.Vector3()
			.copy(playerTransform.position)
			.add(playerForwardDir.multiplyScalar(CAMERA_CONFIG.lookAheadDistance));
		
		// Calculate target rotation
		const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
			new THREE.Matrix4().lookAt(
				cameraTransform.position,
				lookAtPoint,
				new THREE.Vector3(0, 1, 0)
			)
		);
		
		// Apply smooth rotation using quaternion slerp
		const currentQuat = new THREE.Quaternion().setFromEuler(cameraTransform.rotation);
		currentQuat.slerp(targetRotation, CAMERA_CONFIG.rotationDamping);
		cameraTransform.rotation.setFromQuaternion(currentQuat);
		
		// Ensure camera stays above minimum height
		if (cameraTransform.position.y < 1.5) {
			cameraTransform.position.y = 1.5;
		}
	});
};
